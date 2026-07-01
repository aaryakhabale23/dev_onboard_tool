from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
import uuid


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class Repo(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    source: str  # 'upload' | 'local' | 'github'
    source_ref: str  # original path or url
    storage_path: str
    created_at: str = Field(default_factory=now_iso)
    file_count: int = 0
    has_git: bool = False
    watch_enabled: bool = False
    last_synced_at: Optional[str] = None
    last_signature: Optional[str] = None


class Annotation(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    repo_id: str
    file_path: str
    line: Optional[int] = None
    text: str
    author: str = "you"
    created_at: str = Field(default_factory=now_iso)


class ImportLocalRequest(BaseModel):
    path: str
    name: Optional[str] = None


class ImportGithubRequest(BaseModel):
    url: str
    name: Optional[str] = None


class AnnotationCreate(BaseModel):
    file_path: str
    line: Optional[int] = None
    text: str
