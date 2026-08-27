"""POST /api/matching — menjalankan LangGraph pipeline (5 agent) secara real-time."""

import threading

from fastapi import APIRouter

from agents.pipeline import run_pipeline
from agents.xai_explainer import (
    compute_must_have_health,
    enrich_contributions,
    resolve_must_have,
)
from core import data_loader, progress
from models.schemas import MatchRequest, MatchResult, PipelineStatus

router = APIRouter(prefix="/api/matching", tags=["matching"])

# Cache hasil pipeline: {(job_id, top_n): response_dict}
_result_cache: dict[tuple, dict] = {}
_cache_lock = threading.Lock()


def xai_to_response(expl: dict, must_have_override: list | None = None) -> dict:
    """Konversi output XAI Explainer Agent ke schema XAIResult frontend.

    top_positive/negative diambil dari clo_contributions (top 10 by shap)
    supaya SHAP chart bisa menampilkan 10 CLO paling berpengaruh.
    """
    contributions = expl.get("clo_contributions", [])
    # Entri dari seed cache dibuat sebelum field turunan ada — lengkapi di sini
    # supaya semua job punya is_must_have / shap_weighted / is_weak_must.
    must_have = resolve_must_have(expl.get("job_id", ""), must_have_override)
    enrich_contributions(contributions, must_have)

    positives = sorted(
        (c for c in contributions if c.get("shap_value", 0) > 0),
        key=lambda c: c["shap_value"],
        reverse=True,
    )[:10]
    negatives = sorted(
        (c for c in contributions if c.get("shap_value", 0) < 0),
        key=lambda c: c["shap_value"],
    )[:10]
    if not contributions:
        positives = expl.get("top_positive_clo", [])
        negatives = expl.get("top_negative_clo", [])

    def _clo(c):
        # nilai_raw dihitung ulang dari nilai_norm (× 100, skala 0-100) supaya
        # entri seed cache yang dibuat dengan formula lama (× 60 + 40) ikut benar
        nilai_norm = c.get("nilai_norm")
        nilai_raw = (
            round(float(nilai_norm) * 100, 2)
            if nilai_norm is not None
            else c.get("nilai_raw", 0.0)
        )
        return {
            "clo_id": c.get("clo_id", ""),
            "mata_kuliah": c.get("mata_kuliah", ""),
            "shap_value": c.get("shap_value", 0.0),
            "job_weight": c.get("job_weight", 0.0),
            "nilai_raw": nilai_raw,
            "skill_domain": c.get("skill_domain", []),
            "is_must_have": bool(c.get("is_must_have", False)),
            "shap_weighted": c.get("shap_weighted", 0.0),
            "is_weak_must": bool(c.get("is_weak_must", False)),
        }

    return {
        "nim": str(expl.get("nim", "")),
        "job_id": expl.get("job_id", ""),
        "score": expl.get("score", 0.0),
        "base_value": expl.get("shap_base_value", 0.0),
        "top_positive_clo": [_clo(c) for c in positives],
        "top_negative_clo": [_clo(c) for c in negatives],
        "explanation_text": expl.get("explanation_text", ""),
    }


def build_match_response(final_state: dict, job_id: str) -> dict:
    profiles = final_state.get("candidate_profiles", {}) or {}
    explanations = final_state.get("xai_explanations", {}) or {}
    must_have = final_state.get("must_have", []) or []

    # Kondisi skill wajib hanya tersedia untuk kandidat yang punya SHAP (Top-3)
    health_by_nim: dict[str, str] = {}
    for nim, expl in explanations.items():
        contributions = expl.get("clo_contributions", [])
        if contributions:
            enrich_contributions(contributions, must_have)
            health_by_nim[str(nim)] = compute_must_have_health(contributions)
        elif expl.get("must_have_health"):
            health_by_nim[str(nim)] = expl["must_have_health"]

    candidates = []
    for cand in final_state.get("top_candidates", []) or []:
        nim = str(cand.get("nim", ""))
        profile = profiles.get(nim, {})
        candidates.append(
            {
                "rank": cand.get("rank", 0),
                "nim": nim,
                "kampus": cand.get("kampus", ""),
                "score": cand.get("score", 0.0),
                "coverage": cand.get("coverage", 0.0),
                "passes_must_have": cand.get("passes_must_have", False),
                "top_skills": profile.get("top_skills", []),
                "weak_skills": profile.get("weak_skills", []),
                "avg_score": round(profile.get("avg_score", 0.0) / 100.0, 4),
                "skill_vector": profile.get("skill_vector", {}),
                "must_have_health": health_by_nim.get(nim),
            }
        )

    return {
        "status": final_state.get("status", "error"),
        "job_id": job_id,
        "title": final_state.get("job_title", "") or "",
        "company": final_state.get("job_company", "") or "",
        "must_have": final_state.get("must_have", []) or [],
        "nice_to_have": final_state.get("nice_to_have", []) or [],
        "n_candidates": len(data_loader.df_mhs),
        "n_filtered": final_state.get("n_filtered", 0) or 0,
        "candidates": candidates,
        "xai_results": {
            nim: xai_to_response(e, must_have) for nim, e in explanations.items()
        },
        "narrative": final_state.get("narrative", "") or "",
        "execution_log": final_state.get("execution_log", []) or [],
        "warnings": final_state.get("warnings", []) or [],
        "error": "; ".join(final_state.get("warnings", []))
        if final_state.get("status") == "error"
        else None,
    }


@router.post("", response_model=MatchResult)
def run_matching(body: MatchRequest):
    """Jalankan LangGraph pipeline. Error pipeline → 200 dengan status 'error'."""
    cache_key = (body.job_id, body.top_n)
    with _cache_lock:
        cached = _result_cache.get(cache_key)
    if cached is not None:
        return cached

    progress.start(body.job_id)
    try:
        final_state = run_pipeline(body.job_id, body.top_n)
    except Exception as e:  # pipeline crash → tetap 200 sesuai PRD catatan #9
        progress.finish(body.job_id, error=str(e))
        return {
            "status": "error",
            "job_id": body.job_id,
            "title": "",
            "company": "",
            "must_have": [],
            "nice_to_have": [],
            "n_candidates": len(data_loader.df_mhs),
            "n_filtered": 0,
            "candidates": [],
            "xai_results": {},
            "narrative": "",
            "execution_log": [],
            "warnings": [str(e)],
            "error": f"Pipeline gagal: {str(e)}",
        }

    response = build_match_response(final_state, body.job_id)
    if response["status"] == "error":
        progress.finish(body.job_id, error=response.get("error") or "Pipeline error")
    else:
        progress.finish(body.job_id)
        with _cache_lock:
            _result_cache[cache_key] = response
    return response


@router.get("/{job_id}/status", response_model=PipelineStatus)
def matching_status(job_id: str):
    """Status pipeline untuk PipelineProgress di frontend (polling)."""
    return progress.get(job_id)


def get_cached_matching(job_id: str) -> dict | None:
    """Dipakai router candidates untuk lookup passes_must_have tanpa re-run."""
    with _cache_lock:
        for (jid, _), resp in _result_cache.items():
            if jid == job_id:
                return resp
    return None
