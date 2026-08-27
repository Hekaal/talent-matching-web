"""POST /api/jobs/parse + POST /api/jobs/create — job baru dengan GPT-4o-mini."""

from uuid import uuid4

from fastapi import APIRouter, HTTPException

from agents.job_parser import build_job_vector
from agents.llm_parser import VALID_SKILL_DOMAINS, parse_job_description
from core import data_loader
from models.schemas import CreateJobRequest, CreateJobResponse, ParsedJob, ParseJobRequest
from routers.jobs import invalidate_job_cache

router = APIRouter(prefix="/api/jobs", tags=["create-job"])


@router.post("/parse", response_model=ParsedJob)
def parse_job(body: ParseJobRequest):
    """Jalankan GPT-4o-mini Job Parser — hasil dikonfirmasi user di Step 2."""
    return parse_job_description(body.title, body.company, body.description)


@router.post("/create", response_model=CreateJobResponse)
def create_job(body: CreateJobRequest):
    """Simpan job baru ke job_requirement_vector.json lalu siap di-matching."""
    must_have = [s for s in body.must_have if s in VALID_SKILL_DOMAINS]
    nice_to_have = [
        s for s in body.nice_to_have if s in VALID_SKILL_DOMAINS and s not in must_have
    ]
    if not must_have:
        raise HTTPException(status_code=422, detail="Minimal 1 skill must-have harus dipilih.")

    # Bobot dari keyword matching deskripsi, dipaksa konsisten dengan pilihan user:
    # must_have >= 0.6 (klasifikasi parser), nice_to_have di bawahnya
    keyword_vec = build_job_vector(body.description, body.title, "")
    job_vector = {}
    for s in must_have:
        job_vector[s] = max(keyword_vec.get(s, 0.0), 1.0)
    for s in nice_to_have:
        job_vector[s] = min(max(keyword_vec.get(s, 0.0), 0.3), 0.59)

    job_id = f"MANUAL-{uuid4().hex[:8].upper()}"
    data_loader.job_vectors[job_id] = {
        "title": body.title.strip()[:100],
        "company": body.company.strip()[:100],
        "source": "Manual",
        "must_have": must_have,
        "nice_to_have": nice_to_have,
        "job_vector": job_vector,
        "n_skills": len(job_vector),
        "description_summary": body.description.strip()[:700],
    }
    data_loader.save_job_vectors()
    invalidate_job_cache()

    return {
        "job_id": job_id,
        "title": body.title,
        "company": body.company,
        "must_have": must_have,
        "nice_to_have": nice_to_have,
    }
