"""Agent 4 — XAI Explainer (KernelSHAP).

Disalin dari Agent_XAI_Explainer_rombak.ipynb:
- get_job_clo_vector() (cell 8)
- compute_shap_explanation() + _generate_explanation() (cell 8)
- xai_explainer_agent() (cell 10)

PENTING: SHAP hanya dihitung untuk Top-3 kandidat (performance).
Background KernelSHAP = rata-rata 300 mahasiswa (dihitung sekali saat startup).
Hasil di-cache di memory; job yang sudah pernah dihitung pipeline sebelumnya
di-seed dari xai_explanations_rombak.json.
"""

import threading

import numpy as np

from agents.state import TalentMatchingState
from core import data_loader, progress
from core.config import SHAP_N_SAMPLES, SHAP_TOP_K

# Cache runtime: {job_id: {nim: explanation}}
_cache_lock = threading.Lock()
XAI_CACHE: dict[str, dict] = {}


def _seed_cache() -> None:
    for job_id, job_data in data_loader.xai_seed_cache.items():
        XAI_CACHE[job_id] = dict(job_data.get("explanations", {}))


_seed_cache()



def resolve_must_have(job_id: str, must_have: list | None = None) -> list:
    """Ambil daftar skill must-have job (dari state bila ada, jika tidak dari cache)."""
    if must_have:
        return list(must_have)
    return list(data_loader.job_vectors.get(job_id, {}).get("must_have", []))


def enrich_contributions(contributions: list, must_have: list) -> list:
    """Lengkapi tiap CLO dengan is_must_have, shap_weighted, dan is_weak_must.

    shap_weighted = shap_value x job_weight — kontribusi setelah dibobot
    kepentingan skill terhadap job, sehingga nice-to-have tidak terlihat
    sepenting must-have.
    """
    must_set = set(must_have or [])
    for c in contributions:
        is_must = any(d in must_set for d in c.get("skill_domain", []))
        shap_value = float(c.get("shap_value", 0.0))
        job_weight = float(c.get("job_weight", 0.0))
        c["is_must_have"] = is_must
        c["shap_weighted"] = round(shap_value * job_weight, 6)
        c["is_weak_must"] = bool(is_must and shap_value < 0)
    return contributions


def compute_must_have_health(contributions: list) -> str:
    """Ringkas kondisi skill wajib kandidat dari jumlah must-have ber-SHAP negatif."""
    weak_count = sum(1 for c in contributions if c.get("is_weak_must"))
    if weak_count == 0:
        return "good"
    if weak_count <= 2:
        return "medium"
    return "weak"


def get_job_clo_vector(job_id: str, job_vector: dict | None = None) -> tuple:
    """Bangun job_clo_vector dari job_vector via mapping langsung.

    Return: (job_vec array 325-dim, relevant_idx, relevant_clo_keys)
    """
    if job_vector is None:
        jv_data = data_loader.job_vectors.get(job_id, {})
        job_vector = jv_data.get("job_vector", {})

    CLO_COLS = data_loader.CLO_COLS
    job_vec = np.zeros(len(CLO_COLS))
    for clo_key, col in data_loader.COL_INDEX.items():
        for skill in data_loader.CLO_TO_SKILL.get(clo_key, []):
            if skill in job_vector:
                job_vec[col] = max(job_vec[col], job_vector[skill])

    relevant_idx = np.where(job_vec > 0)[0]
    relevant_clo_keys = [CLO_COLS[i] for i in relevant_idx]
    return job_vec, relevant_idx, relevant_clo_keys


def _generate_explanation(job_id, nim, score, top_pos, top_neg) -> str:
    """Generate teks penjelasan natural dari SHAP values."""
    jv = data_loader.job_vectors.get(job_id, {})
    title = jv.get("title", job_id)

    top_mk = [c["mata_kuliah"][:25] for c in top_pos[:3]]
    top_sk = list(set(s for c in top_pos[:3] for s in c["skill_domain"]))[:2]

    explanation = (
        f"Mahasiswa NIM {nim} mendapatkan score {score:.4f} untuk posisi '{title}'. "
        f"CLO yang paling berkontribusi positif berasal dari mata kuliah: "
        f"{', '.join(top_mk[:3])}. "
        f"Skill domain yang mendukung antara lain: {', '.join(top_sk)}. "
    )
    if top_neg:
        neg_mk = [c["mata_kuliah"][:20] for c in top_neg[:2]]
        explanation += f"CLO yang kurang relevan berasal dari: {', '.join(neg_mk)}."
    return explanation


def compute_shap_explanation(
    job_id: str,
    nim: str,
    n_samples: int = SHAP_N_SAMPLES,
    job_vector: dict | None = None,
    must_have: list | None = None,
) -> dict:
    """Hitung SHAP values untuk 1 kandidat terhadap 1 job (KernelSHAP)."""
    import shap  # import di sini: menghemat ~7 detik startup; hasil seed cache
    # sudah mencakup 50 job jadi shap sering tidak dibutuhkan sama sekali

    job_vec, relevant_idx, relevant_clo_keys = get_job_clo_vector(job_id, job_vector)
    if len(relevant_idx) == 0:
        return {"error": "Tidak ada CLO relevan untuk job ini"}

    mhs_idx = data_loader.NIM_TO_IDX.get(str(nim), -1)
    if mhs_idx < 0:
        return {"error": f"NIM {nim} tidak ditemukan"}

    MHS_MATRIX_NORM = data_loader.MHS_MATRIX_NORM
    mhs_vec_rel = MHS_MATRIX_NORM[mhs_idx, relevant_idx]
    job_vec_rel = job_vec[relevant_idx]

    dot = np.dot(mhs_vec_rel, job_vec_rel)
    norm_mhs = np.linalg.norm(mhs_vec_rel)
    norm_job = np.linalg.norm(job_vec_rel)
    score = dot / (norm_mhs * norm_job) if (norm_mhs * norm_job) > 0 else 0

    def predict_fn(X):
        scores = []
        for row in X:
            d = np.dot(row, job_vec_rel)
            n = np.linalg.norm(row) * norm_job
            scores.append(d / n if n > 0 else 0)
        return np.array(scores)

    # Background data: rata-rata nilai semua mahasiswa di dimensi relevan
    background = MHS_MATRIX_NORM[:, relevant_idx].mean(axis=0).reshape(1, -1)

    explainer = shap.KernelExplainer(predict_fn, background)
    shap_values = explainer.shap_values(
        mhs_vec_rel.reshape(1, -1), nsamples=n_samples, silent=True
    )
    shap_vals = shap_values[0]

    clo_contributions = []
    for i, clo_key in enumerate(relevant_clo_keys):
        info = data_loader.CLO_INFO.get(clo_key, {})
        clo_contributions.append(
            {
                "clo_key": clo_key,
                "clo_id": info.get("clo_id", ""),
                "mata_kuliah": str(info.get("mata_kuliah", ""))[:40],
                "skill_domain": info.get("skill_domain", []),
                "nilai_norm": round(float(mhs_vec_rel[i]), 4),
                "nilai_raw": round(float(mhs_vec_rel[i] * 100), 2),  # nilai_norm × 100 = nilai asli (skala 0-100)
                "job_weight": round(float(job_vec_rel[i]), 4),
                "shap_value": round(float(shap_vals[i]), 6),
                "contribution": "positif" if shap_vals[i] > 0 else "negatif",
            }
        )

    # Lengkapi dengan is_must_have / shap_weighted / is_weak_must
    must_have_list = resolve_must_have(job_id, must_have)
    enrich_contributions(clo_contributions, must_have_list)

    clo_contributions.sort(key=lambda x: -abs(x["shap_value"]))
    top_positive = [c for c in clo_contributions if c["shap_value"] > 0][:5]
    top_negative = [c for c in clo_contributions if c["shap_value"] < 0][:3]

    expected = explainer.expected_value
    if isinstance(expected, np.ndarray):
        expected = float(expected.flat[0])

    return {
        "job_id": job_id,
        "nim": str(nim),
        "score": round(float(score), 4),
        "n_relevant_clo": len(relevant_idx),
        "shap_base_value": round(float(expected), 4),
        "must_have_health": compute_must_have_health(clo_contributions),
        "clo_contributions": clo_contributions,
        "top_positive_clo": top_positive,
        "top_negative_clo": top_negative,
        "explanation_text": _generate_explanation(job_id, nim, score, top_positive, top_negative),
    }


def get_cached_xai(job_id: str, nim: str) -> dict | None:
    with _cache_lock:
        return XAI_CACHE.get(job_id, {}).get(str(nim))


def _store_xai(job_id: str, nim: str, result: dict) -> None:
    with _cache_lock:
        XAI_CACHE.setdefault(job_id, {})[str(nim)] = result


def xai_explainer_node(state: TalentMatchingState) -> dict:
    """Agent 4 — SHAP untuk Top-3 kandidat (bukan Top-10, performance)."""
    warnings = list(state.get("warnings", []))
    log = list(state.get("execution_log", []))
    job_id = state.get("job_id", "")
    top_candidates = state.get("top_candidates", []) or []
    job_vector = state.get("job_vector", {}) or {}
    must_have = state.get("must_have", []) or []
    progress.set_step(job_id, 4)

    if state.get("status") == "error":
        return {}

    if not top_candidates:
        return {
            "status": "error",
            "warnings": warnings + ["top_candidates kosong"],
            "execution_log": log,
        }

    explanations = {}
    n_cached = 0
    for cand in top_candidates[:SHAP_TOP_K]:
        nim = str(cand.get("nim", ""))
        cached = get_cached_xai(job_id, nim)
        if cached is not None:
            explanations[nim] = cached
            n_cached += 1
            continue
        try:
            result = compute_shap_explanation(
                job_id, nim, job_vector=job_vector, must_have=must_have
            )
        except Exception as e:
            warnings.append(f"SHAP gagal untuk NIM {nim}: {str(e)}")
            continue
        if "error" not in result:
            explanations[nim] = result
            _store_xai(job_id, nim, result)
        else:
            warnings.append(f"SHAP gagal untuk NIM {nim}: {result['error']}")

    log.append(
        f"[XAI Explainer] ✅ {len(explanations)} penjelasan SHAP "
        f"({n_cached} dari cache, {len(explanations) - n_cached} dihitung baru)"
    )

    return {
        "status": "explained",
        "xai_explanations": explanations,
        "warnings": warnings,
        "execution_log": log,
    }
