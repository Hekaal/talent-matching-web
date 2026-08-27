"""Talent Matching System API — FastAPI + LangGraph Multi-Agent Pipeline."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from models.schemas import HealthResponse

_agents_ready = False


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Load data + KG + compile pipeline SEKALI saat startup
    global _agents_ready
    from core import data_loader

    print(data_loader.summary())
    import core.knowledge_graph  # noqa: F401 — load KG saat startup
    from agents.pipeline import pipeline  # noqa: F401 — compile LangGraph

    _agents_ready = True
    print("[OK] Pipeline siap (5 agent)")
    yield


app = FastAPI(
    title="Talent Matching System API",
    description=(
        "REST API Talent Matching System berbasis OBE dengan Multi-Agent AI "
        "(LangGraph) dan Explainable AI (SHAP) — Magang Riset PRSDI BRIN"
    ),
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from routers import candidates, create_job, jobs, matching  # noqa: E402

app.include_router(jobs.router)
app.include_router(jobs.companies_router)
app.include_router(create_job.router)
app.include_router(matching.router)
app.include_router(candidates.router)


@app.get("/api/health", response_model=HealthResponse, tags=["health"])
def health():
    return {"status": "ok", "agents_ready": _agents_ready}
