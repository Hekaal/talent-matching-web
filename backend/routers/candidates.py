from fastapi import APIRouter, HTTPException

from agents.candidate_profile import build_candidate_profile
from agents.xai_explainer import compute_shap_explanation, get_cached_xai
from core import data_loader
from models.schemas import CandidateProfile, XAIResult
from routers.matching import xai_to_response

router = APIRouter(prefix="/api/candidates", tags=["candidates"])


@router.get("/{nim}", response_model=CandidateProfile)
def get_candidate(nim: str):
    profile = build_candidate_profile(nim)
    if "error" in profile:
        raise HTTPException(status_code=404, detail=f"Kandidat dengan NIM '{nim}' tidak ditemukan.")
    return {
        "nim": profile["nim"],
        "kampus": profile["kampus"],
        "avg_score": round(profile["avg_score"] / 100.0, 4),
        "top_skills": profile["top_skills"],
        "weak_skills": profile["weak_skills"],
        "skill_vector": profile["skill_vector"],
    }


@router.get("/{nim}/xai/{job_id}", response_model=XAIResult)
def get_xai(nim: str, job_id: str):
    """SHAP explanation — dari cache hasil pipeline, atau dihitung on-demand."""
    if str(nim) not in data_loader.NIM_TO_IDX:
        raise HTTPException(status_code=404, detail=f"Kandidat dengan NIM '{nim}' tidak ditemukan.")

    expl = get_cached_xai(job_id, nim)
    if expl is None:
        # Belum pernah dihitung pipeline — hitung on-demand (KernelSHAP, ~5-20 detik)
        jv = data_loader.job_vectors.get(job_id)
        if jv is None:
            raise HTTPException(status_code=404, detail=f"Job '{job_id}' tidak ditemukan.")
        try:
            expl = compute_shap_explanation(job_id, nim, job_vector=jv.get("job_vector", {}))
        except Exception as e:
            raise HTTPException(status_code=404, detail=f"Gagal menghitung SHAP: {str(e)}")
        if "error" in expl:
            raise HTTPException(
                status_code=404,
                detail=f"Penjelasan XAI untuk kandidat '{nim}' pada job '{job_id}' "
                f"tidak tersedia: {expl['error']}",
            )
        from agents.xai_explainer import _store_xai

        _store_xai(job_id, nim, expl)

    return xai_to_response(expl)
