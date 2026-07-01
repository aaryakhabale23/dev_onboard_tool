from fastapi import FastAPI, APIRouter, UploadFile, File, Form, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import tempfile
import uuid
from pathlib import Path
from typing import List, Optional

from models import Repo, Annotation, ImportLocalRequest, ImportGithubRequest, AnnotationCreate
import repo_manager
import parsers

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

app = FastAPI(title="CodeLens API")
api_router = APIRouter(prefix="/api")


async def get_repo_or_404(repo_id: str) -> Repo:
    doc = await db.repos.find_one({"id": repo_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="repo_not_found")
    return Repo(**doc)


@api_router.get("/")
async def root():
    return {"service": "codelens", "status": "ok"}


@api_router.post("/repos/upload", response_model=Repo)
async def import_zip(file: UploadFile = File(...), name: Optional[str] = Form(None)):
    if not file.filename.lower().endswith(".zip"):
        raise HTTPException(status_code=400, detail="zip_required")
    repo_id = str(uuid.uuid4())
    with tempfile.NamedTemporaryFile(suffix=".zip", delete=False) as tmp:
        tmp.write(await file.read())
        tmp_path = Path(tmp.name)
    try:
        dest = repo_manager.ingest_zip(repo_id, tmp_path)
    finally:
        try:
            tmp_path.unlink()
        except Exception:
            pass
    tree_data = parsers.build_tree(str(dest))
    repo = Repo(
        id=repo_id,
        name=name or file.filename.rsplit(".", 1)[0],
        source="upload",
        source_ref=file.filename,
        storage_path=str(dest),
        file_count=tree_data["file_count"],
        has_git=repo_manager.has_git(dest),
    )
    await db.repos.insert_one(repo.model_dump())
    return repo


@api_router.post("/repos/local", response_model=Repo)
async def import_local(req: ImportLocalRequest):
    repo_id = str(uuid.uuid4())
    try:
        dest = repo_manager.ingest_local(repo_id, req.path)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    tree_data = parsers.build_tree(str(dest))
    repo = Repo(
        id=repo_id,
        name=req.name or Path(req.path).name or "local-repo",
        source="local",
        source_ref=req.path,
        storage_path=str(dest),
        file_count=tree_data["file_count"],
        has_git=repo_manager.has_git(dest),
    )
    await db.repos.insert_one(repo.model_dump())
    return repo


@api_router.post("/repos/github", response_model=Repo)
async def import_github(req: ImportGithubRequest):
    repo_id = str(uuid.uuid4())
    try:
        dest = repo_manager.ingest_github(repo_id, req.url)
    except Exception as e:
        repo_manager.delete_repo(repo_id)
        raise HTTPException(status_code=400, detail=f"clone_failed: {str(e)}")
    tree_data = parsers.build_tree(str(dest))
    inferred_name = req.name or req.url.rstrip("/").split("/")[-1].replace(".git", "")
    repo = Repo(
        id=repo_id,
        name=inferred_name,
        source="github",
        source_ref=req.url,
        storage_path=str(dest),
        file_count=tree_data["file_count"],
        has_git=repo_manager.has_git(dest),
    )
    await db.repos.insert_one(repo.model_dump())
    return repo


@api_router.get("/repos", response_model=List[Repo])
async def list_repos():
    docs = await db.repos.find({}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return [Repo(**d) for d in docs]


@api_router.get("/repos/{repo_id}", response_model=Repo)
async def get_repo(repo_id: str):
    return await get_repo_or_404(repo_id)


@api_router.delete("/repos/{repo_id}")
async def delete_repo(repo_id: str):
    await get_repo_or_404(repo_id)
    repo_manager.delete_repo(repo_id)
    await db.repos.delete_one({"id": repo_id})
    await db.annotations.delete_many({"repo_id": repo_id})
    return {"deleted": True}


@api_router.get("/repos/{repo_id}/tree")
async def get_tree(repo_id: str):
    repo = await get_repo_or_404(repo_id)
    return parsers.build_tree(repo.storage_path)


@api_router.get("/repos/{repo_id}/file")
async def get_file(repo_id: str, path: str):
    repo = await get_repo_or_404(repo_id)
    return parsers.read_file(repo.storage_path, path)


@api_router.get("/repos/{repo_id}/dependencies")
async def get_dependencies(repo_id: str):
    repo = await get_repo_or_404(repo_id)
    return parsers.build_dependency_graph(repo.storage_path)


@api_router.get("/repos/{repo_id}/endpoints")
async def get_endpoints(repo_id: str):
    repo = await get_repo_or_404(repo_id)
    endpoints = parsers.extract_endpoints(repo.storage_path)
    frontend_calls = parsers.extract_frontend_calls(repo.storage_path)
    return {"endpoints": endpoints, "frontend_calls": frontend_calls}


@api_router.get("/repos/{repo_id}/models")
async def get_models(repo_id: str):
    repo = await get_repo_or_404(repo_id)
    return {"models": parsers.extract_models(repo.storage_path)}


@api_router.get("/repos/{repo_id}/components")
async def get_components(repo_id: str):
    repo = await get_repo_or_404(repo_id)
    return parsers.extract_components(repo.storage_path)


@api_router.get("/repos/{repo_id}/overview")
async def get_overview(repo_id: str):
    repo = await get_repo_or_404(repo_id)
    ov = parsers.build_overview(repo.storage_path)
    ov["repo"] = repo.model_dump()
    return ov


@api_router.get("/repos/{repo_id}/git-diff")
async def get_git_diff(repo_id: str):
    repo = await get_repo_or_404(repo_id)
    return repo_manager.git_diff(Path(repo.storage_path))


@api_router.get("/repos/{repo_id}/annotations", response_model=List[Annotation])
async def list_annotations(repo_id: str, file_path: Optional[str] = None):
    await get_repo_or_404(repo_id)
    q = {"repo_id": repo_id}
    if file_path:
        q["file_path"] = file_path
    docs = await db.annotations.find(q, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return [Annotation(**d) for d in docs]


@api_router.post("/repos/{repo_id}/annotations", response_model=Annotation)
async def create_annotation(repo_id: str, payload: AnnotationCreate):
    await get_repo_or_404(repo_id)
    ann = Annotation(repo_id=repo_id, file_path=payload.file_path, line=payload.line, text=payload.text)
    await db.annotations.insert_one(ann.model_dump())
    return ann


@api_router.delete("/repos/{repo_id}/annotations/{ann_id}")
async def delete_annotation(repo_id: str, ann_id: str):
    r = await db.annotations.delete_one({"id": ann_id, "repo_id": repo_id})
    if r.deleted_count == 0:
        raise HTTPException(status_code=404, detail="annotation_not_found")
    return {"deleted": True}


@api_router.get("/repos/{repo_id}/search")
async def search_repo(repo_id: str, q: str, limit: int = 100):
    repo = await get_repo_or_404(repo_id)
    if not q or len(q) < 2:
        return {"results": []}
    results = []
    root = Path(repo.storage_path)
    q_lower = q.lower()
    for fp, rel in parsers.iter_code_files(str(root)):
        try:
            content = fp.read_text(encoding="utf-8", errors="replace")
        except Exception:
            continue
        if q_lower in fp.name.lower():
            results.append({"file": rel, "line": 1, "snippet": fp.name, "kind": "filename"})
        matched = 0
        for i, line in enumerate(content.splitlines(), start=1):
            if q_lower in line.lower():
                results.append({"file": rel, "line": i, "snippet": line.strip()[:200], "kind": "content"})
                matched += 1
                if matched >= 3:
                    break
        if len(results) >= limit:
            break
    return {"results": results[:limit]}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
