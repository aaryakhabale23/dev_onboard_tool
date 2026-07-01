# CodeLens — Codebase Visualizer

## Problem Statement (original)
"i want to build an web app that helps me visualize all the current backend and frontend in a way where suppose a new developer joins the team he would be able to go through it better quickly n efficiently. input would be repository mostly local so that change made by him can be seen to him/her and act on it better lets plan on this"

## User choices (v1)
- Repo input: Upload ZIP · Local Path · GitHub URL
- Visualizations: File tree · Dependency graph · API endpoints · DB models · React component hierarchy · Architecture overview
- No AI (static analysis only)
- Git diff + annotations
- Languages: JS/TS/Python + web frameworks

## Architecture
- **Backend** (`/app/backend`): FastAPI + Motor/MongoDB, GitPython. Regex-based static analyzer in `parsers.py`. Repo ingestion in `repo_manager.py`.
- **Frontend** (`/app/frontend/src`): React + reactflow + shadcn base + sonner. Dark IDE-style "Swiss/High-Contrast" theme (IBM Plex Sans / JetBrains Mono).
- **Storage**: Ingested repos live under `/app/storage/repos/{uuid}/`. Metadata + annotations in Mongo.

## Implemented (P0)
- [x] Repo import: ZIP upload · absolute local path · GitHub clone (shallow depth=50)
- [x] File tree explorer (iterative, virtualized-friendly) with change highlighting
- [x] Code viewer with line numbers + `gotoLine` scroll
- [x] Dependency graph (React Flow) — Python + JS/TS import resolution
- [x] API endpoints extractor — FastAPI/Flask + Express + frontend fetch/axios/api calls
- [x] Data models extractor — Pydantic, SQLAlchemy, Mongoose
- [x] React components + parent/child relationships
- [x] Architecture overview: tech-stack detection + code composition stats
- [x] Git diff view: changed files, unified diff, recent commits (15), branch
- [x] Annotations panel: per-file & global notes with line refs
- [x] Full-repo search (filename + content)
- [x] Delete repo (also purges storage + annotations)

## Backlog (P1)
- Persistent color-coded language legend on dep graph
- Export repo report as Markdown / PDF
- Live "watch mode" for local paths (auto re-analyze on file change)
- Compare two branches / two imports side-by-side
- Auth so a whole team can share a CodeLens instance

## Backlog (P2)
- Optional AI-explains-this-file toggle (Claude Sonnet / GPT)
- Test coverage overlay on file tree
- Route → handler → model → DB collection call chain visualizer

## Test credentials
None — no auth in v1.

## Dates
- 2026-07-01: MVP built, backend + frontend verified end-to-end via curl + Playwright screenshots.
