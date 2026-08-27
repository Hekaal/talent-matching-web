from fastapi import APIRouter, HTTPException, Query

from core import data_loader
from models.schemas import Company, Job, JobDescription

router = APIRouter(prefix="/api/jobs", tags=["jobs"])

_job_list_cache: list | None = None


def invalidate_job_cache() -> None:
    global _job_list_cache, _company_index_cache
    _job_list_cache = None
    _company_index_cache = None


def get_job_list() -> list:
    global _job_list_cache
    if _job_list_cache is None:
        desc_map = {}
        for row in data_loader.df_jobs[["job_id", "description_summary"]].to_dict("records"):
            desc = row.get("description_summary")
            desc_map[row["job_id"]] = desc if isinstance(desc, str) else None

        _job_list_cache = [
            {
                "job_id": job_id,
                "title": jv.get("title", ""),
                "company": jv.get("company", ""),
                "source": jv.get("source", "Unknown"),
                "must_have": jv.get("must_have", []),
                "nice_to_have": jv.get("nice_to_have", []),
                "description_summary": desc_map.get(job_id) or jv.get("description_summary"),
            }
            for job_id, jv in data_loader.job_vectors.items()
        ]
    return _job_list_cache


@router.get("", response_model=list[Job])
def list_jobs():
    return get_job_list()


# Search bebas tidak lagi dipakai HomePage (flow baru: pilih perusahaan -> pilih job).
# Endpoint dipertahankan untuk kompatibilitas tapi disembunyikan dari dokumentasi.
@router.get("/search", response_model=list[Job], include_in_schema=False)
def search_jobs(q: str = Query("", description="Filter by title atau company")):
    query = q.strip().lower()
    if not query:
        return get_job_list()
    return [
        j
        for j in get_job_list()
        if query in j["title"].lower() or query in j["company"].lower()
    ]


@router.get("/{job_id}/description", response_model=JobDescription)
def get_job_description(job_id: str):
    """Teks job description lengkap dari dataset_jobs_summarized.csv.

    Dicocokkan lewat job_id; bila job tidak ada di CSV (mis. job MANUAL buatan
    HRD) dipakai deskripsi yang tersimpan di job vector, lalu title sebagai
    upaya terakhir.
    """
    df = data_loader.df_jobs
    row = df[df["job_id"] == job_id]

    description = None
    if not row.empty:
        for col in ("description", "description_summary"):
            if col in row.columns:
                val = row.iloc[0].get(col)
                if isinstance(val, str) and val.strip():
                    description = val.strip()
                    break

    jv = data_loader.job_vectors.get(job_id)
    if description is None and jv is not None:
        val = jv.get("description_summary") or jv.get("description")
        if isinstance(val, str) and val.strip():
            description = val.strip()

    # Fallback terakhir: cocokkan berdasarkan judul job
    if description is None and jv is not None and jv.get("title"):
        by_title = df[df["title"] == jv["title"]]
        if not by_title.empty:
            val = by_title.iloc[0].get("description")
            if isinstance(val, str) and val.strip():
                description = val.strip()

    if description is None:
        if jv is None and row.empty:
            raise HTTPException(
                status_code=404, detail=f"Job '{job_id}' tidak ditemukan."
            )
        raise HTTPException(
            status_code=404,
            detail=f"Job description untuk '{job_id}' tidak tersedia di dataset.",
        )

    return {"job_id": job_id, "description": description}


@router.get("/{job_id}", response_model=Job)
def get_job(job_id: str):
    for j in get_job_list():
        if j["job_id"] == job_id:
            return j
    raise HTTPException(status_code=404, detail=f"Job '{job_id}' tidak ditemukan.")


# ── Companies ────────────────────────────────────────────────────
# Router terpisah karena prefix berbeda (/api/companies), dipakai HomePage:
# pilih perusahaan dulu, baru pilih job dari perusahaan tersebut.
companies_router = APIRouter(prefix="/api/companies", tags=["companies"])

_company_index_cache: dict[str, list] | None = None


def _company_index() -> dict[str, list]:
    """Index {company: [job, ...]} dari seluruh job vector."""
    global _company_index_cache
    if _company_index_cache is None:
        index: dict[str, list] = {}
        for job in get_job_list():
            company = (job["company"] or "").strip() or "Tanpa Nama Perusahaan"
            index.setdefault(company, []).append(job)
        _company_index_cache = index
    return _company_index_cache


@companies_router.get("", response_model=list[Company])
def list_companies():
    """Daftar unik perusahaan + jumlah lowongan, diurutkan A-Z."""
    return [
        {"company": company, "n_jobs": len(jobs)}
        for company, jobs in sorted(_company_index().items(), key=lambda kv: kv[0].lower())
    ]


@companies_router.get("/{company}/jobs", response_model=list[Job])
def list_company_jobs(company: str):
    """Semua job dari satu perusahaan."""
    jobs = _company_index().get(company)
    if jobs is None:
        # fallback case-insensitive supaya URL lebih toleran
        for name, items in _company_index().items():
            if name.lower() == company.lower():
                jobs = items
                break
    if not jobs:
        raise HTTPException(
            status_code=404, detail=f"Perusahaan '{company}' tidak ditemukan."
        )
    return jobs
