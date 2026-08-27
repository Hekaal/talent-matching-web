"""Agent 2 — Talent Matching (KG Traversal + Cosine Similarity + Must-Have Filter).

Disalin dari Agent_TalentMatching_rombak_must_have_min_score=0.65.ipynb:
- project_job_to_clo_space() dengan boost must-have ×1.5 (cell 10)
- must_to_col_tm(), passes_must_have_filter(), rank_candidates() (cell 12)
- talent_matching_agent() (cell 14)

Referensi:
- Boost must-have ×1.5: Qin et al. (2020) PJFNN, Wang et al. (2022)
- Filter threshold 0.65 (OBE Grade BC): Lv & Zhu, Manning et al. (2008)
"""

import numpy as np

from agents.state import TalentMatchingState
from core import data_loader, progress
from core.config import BOOST_MUST_HAVE, MUST_HAVE_FILTER_THRESHOLD
from core.knowledge_graph import G, clo_node_to_col_idx

BOOST_MUST = BOOST_MUST_HAVE  # CLO mendukung must_have → ×1.5
BOOST_NICE = 1.0  # CLO mendukung nice_to_have → ×1.0
MUST_HAVE_MIN_SCORE = MUST_HAVE_FILTER_THRESHOLD  # 0.65 (OBE Grade BC)


def project_job_to_clo_space(job_vector: dict, must_have: list = None, nice_to_have: list = None) -> dict:
    """KG Traversal: job_vector (skill space) → job_clo_vector (CLO space).

    REVISI B — Boost Must-Have CLO:
    CLO yang mendukung must_have skill → bobot × 1.5
    CLO yang mendukung nice_to_have   → bobot × 1.0
    """
    must_have = must_have or []
    nice_to_have = nice_to_have or []
    raw_clo_weights: dict[str, float] = {}

    for skill_domain, job_weight in job_vector.items():
        if skill_domain not in G:
            continue

        if skill_domain in must_have:
            boost = BOOST_MUST
        elif skill_domain in nice_to_have:
            boost = BOOST_NICE
        else:
            boost = 1.0

        for clo_node, _ in G.in_edges(skill_domain):
            if G.nodes[clo_node].get("node_type") != "CLO":
                continue
            raw_clo_weights[clo_node] = raw_clo_weights.get(clo_node, 0.0) + job_weight * boost

    if not raw_clo_weights:
        return {}

    max_w = max(raw_clo_weights.values())
    return {node_id: round(w / max_w, 4) for node_id, w in raw_clo_weights.items()}


def must_to_col_tm(skill_name: str) -> str:
    """Konversi nama skill ke nama kolom di df_cp."""
    return "skill_" + (
        skill_name.replace(" & Information Systems", "_Information_Systems")
        .replace(" & ", "_")
        .replace(" ", "_")
        .replace("/", "_")
    )


def passes_must_have_filter(mhs_idx: int, must_have: list, min_score: float = MUST_HAVE_MIN_SCORE) -> bool:
    """Stage 1 — Must-Have Filter (Hard Constraint).

    Kandidat lolos jika skill_vector must_have >= min_score
    untuk SEMUA skill must_have yang ada di profil.
    """
    if not must_have:
        return True

    mhs_row = data_loader.df_mhs.iloc[mhs_idx]
    nim = str(mhs_row["nim"])
    df_cp = data_loader.df_cp

    for skill in must_have:
        col = must_to_col_tm(skill)
        if col not in df_cp.columns:
            continue
        cp_row = df_cp[df_cp["nim"].astype(str) == nim]
        if cp_row.empty:
            return False
        val = float(cp_row[col].values[0])
        if val < min_score:
            return False
    return True


def rank_candidates(
    job_clo_vector: dict,
    top_n: int = 10,
    must_have: list = None,
    must_have_min_score: float = MUST_HAVE_MIN_SCORE,
) -> tuple[list, int]:
    """Two-Stage Retrieval untuk Talent Matching.

    Stage 1 — Must-Have Filter (hard constraint, threshold 0.65)
    Stage 2 — Cosine Similarity Ranking pada dimensi CLO relevan
    Return: (Top-N kandidat, n_filtered)
    """
    if not job_clo_vector:
        return [], 0

    must_have = must_have or []
    CLO_COLS = data_loader.CLO_COLS
    MHS_MATRIX_NORM = data_loader.MHS_MATRIX_NORM

    job_vec = np.zeros(len(CLO_COLS))
    for clo_node_id, weight in job_clo_vector.items():
        idx = clo_node_to_col_idx(clo_node_id)
        if idx >= 0:
            job_vec[idx] = weight

    job_norm = np.linalg.norm(job_vec)
    if job_norm == 0:
        return [], 0

    relevant_idx = np.where(job_vec > 0)[0]
    if len(relevant_idx) == 0:
        return [], 0

    job_vec_rel = job_vec[relevant_idx]
    mhs_mat_rel = MHS_MATRIX_NORM[:, relevant_idx]
    job_norm_rel = np.linalg.norm(job_vec_rel)

    dot_products = mhs_mat_rel.dot(job_vec_rel)
    mhs_norms_rel = np.linalg.norm(mhs_mat_rel, axis=1)
    mhs_norms_rel[mhs_norms_rel == 0] = 1e-10
    scores = dot_products / (mhs_norms_rel * job_norm_rel)

    all_indices = np.argsort(scores)[::-1]
    n_relevant = len(relevant_idx)

    # ── STAGE 1: MUST-HAVE FILTER ────────────────────────────────
    qualified = []
    others = []
    n_filtered = 0
    for idx in all_indices:
        if must_have and not passes_must_have_filter(idx, must_have, must_have_min_score):
            others.append(idx)
            n_filtered += 1
        else:
            qualified.append(idx)

    # ── STAGE 2: RANKING DARI YANG LOLOS FILTER ──────────────────
    final_indices = qualified[:top_n]
    if len(final_indices) < top_n:
        final_indices += others[: top_n - len(final_indices)]

    results = []
    for rank, idx in enumerate(final_indices, 1):
        mhs_row = data_loader.df_mhs.iloc[idx]
        mhs_vec_rel = MHS_MATRIX_NORM[idx, relevant_idx]
        matched = int(np.sum(mhs_vec_rel > 0))
        coverage = round(matched / max(n_relevant, 1), 4)
        passed = passes_must_have_filter(idx, must_have, must_have_min_score)

        results.append(
            {
                "rank": rank,
                "nim": str(mhs_row["nim"]),
                "kampus": mhs_row["kampus"],
                "score": round(float(scores[idx]), 4),
                "matched_clo": matched,
                "n_relevant": n_relevant,
                "coverage": coverage,
                "passes_must_have": passed,
            }
        )

    return results, n_filtered


def talent_matching_node(state: TalentMatchingState) -> dict:
    """Agent 2 — mengisi job_clo_vector, top_candidates, n_filtered."""
    warnings = list(state.get("warnings", []))
    log = list(state.get("execution_log", []))
    job_id = state.get("job_id", "")
    top_n = state.get("top_n", 10)
    job_vec = state.get("job_vector", {}) or {}
    must_have = state.get("must_have", []) or []
    nice_to_have = state.get("nice_to_have", []) or []
    progress.set_step(job_id, 2)

    if state.get("status") == "error":
        return {}

    if not job_vec:
        return {
            "status": "error",
            "warnings": warnings + ["job_vector kosong — pastikan Job Parser Agent berjalan dulu"],
            "execution_log": log,
        }

    job_clo_vector = project_job_to_clo_space(job_vec, must_have, nice_to_have)
    if not job_clo_vector:
        warnings.append("job_clo_vector kosong — skill domain tidak ditemukan di KG")

    top_candidates, n_filtered = rank_candidates(
        job_clo_vector, top_n=top_n, must_have=must_have
    )

    if top_candidates:
        log.append(
            f"[Talent Matching] ✅ {len(job_vec)} skill → {len(job_clo_vector)} CLO | "
            f"Top-1: NIM {top_candidates[0]['nim']} (score={top_candidates[0]['score']:.4f}) | "
            f"{n_filtered} kandidat difilter"
        )
    else:
        warnings.append("Tidak ada kandidat yang cocok")
        log.append("[Talent Matching] ⚠️ tidak ada kandidat")

    return {
        "status": "matched",
        "job_clo_vector": job_clo_vector,
        "top_candidates": top_candidates,
        "n_filtered": n_filtered,
        "n_clo_relevant": len(job_clo_vector),
        "warnings": warnings,
        "execution_log": log,
    }
