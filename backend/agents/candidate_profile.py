"""Agent 3 — Candidate Profile.

Disalin dari Agent_CandidateProfile_rombak.ipynb:
- build_candidate_profile() (cell 8)
- candidate_profile_agent() (cell 10)
"""

import numpy as np

from agents.state import TalentMatchingState
from core import data_loader, progress


def build_candidate_profile(nim: str) -> dict:
    """Bangun profil kompetensi mahasiswa dari nilai CLO.

    Komponen profil:
    - skill_vector  : {skill_domain: skor 0-1} — rata-rata nilai CLO per domain
    - top_skills    : 3 skill domain terkuat
    - weak_skills   : 3 skill domain terlemah
    - avg_score     : rata-rata nilai semua CLO (skala 0-100)
    - strong_clo    : CLO dengan nilai tertinggi (top 5)
    - weak_clo      : CLO dengan nilai terendah (bottom 5)
    """
    df_mhs = data_loader.df_mhs
    df_clo = data_loader.df_clo
    CLO_COLS = data_loader.CLO_COLS

    row = df_mhs[df_mhs["nim"].astype(str) == str(nim)]
    if row.empty:
        return {"error": f"NIM {nim} tidak ditemukan"}
    row = row.iloc[0]

    # Normalisasi nilai / 100.0 (Han et al. 2011 Section 3.5.2)
    clo_values = {col: round(float(row[col]) / 100.0, 4) for col in CLO_COLS}

    skill_vector = {}
    for skill in data_loader.ALL_SKILLS:
        clo_keys = data_loader.SKILL_TO_CLO.get(skill, [])
        if not clo_keys:
            continue
        vals = [clo_values.get(clo, 0) for clo in clo_keys if clo in clo_values]
        if vals:
            skill_vector[skill] = round(float(np.mean(vals)), 4)

    if not skill_vector:
        return {"error": "Tidak ada skill domain yang bisa dihitung"}

    sorted_skills = sorted(skill_vector.items(), key=lambda x: -x[1])
    top_skills = [s for s, _ in sorted_skills[:3]]
    weak_skills = [s for s, _ in sorted_skills[-3:]]

    sorted_clo = sorted(clo_values.items(), key=lambda x: -x[1])

    def _clo_entries(items):
        entries = []
        for clo_key, val in items:
            clo_info = df_clo[df_clo["clo_key"] == clo_key]
            if not clo_info.empty:
                entries.append(
                    {
                        "clo_key": clo_key,
                        "clo_id": clo_info.iloc[0]["clo_id"],
                        "mata_kuliah": clo_info.iloc[0]["mata_kuliah"],
                        "nilai_norm": val,
                        "nilai_raw": round(val * 100, 2),
                    }
                )
        return entries

    return {
        "nim": str(nim),
        "kampus": row["kampus"],
        "skill_vector": skill_vector,
        "top_skills": top_skills,
        "weak_skills": weak_skills,
        "avg_score": round(float(row[CLO_COLS].mean()), 2),
        "strong_clo": _clo_entries(sorted_clo[:5]),
        "weak_clo": _clo_entries(sorted_clo[-5:]),
        "n_clo": len(CLO_COLS),
    }


def candidate_profile_node(state: TalentMatchingState) -> dict:
    """Agent 3 — mengisi candidate_profiles untuk semua Top-N kandidat."""
    warnings = list(state.get("warnings", []))
    log = list(state.get("execution_log", []))
    job_id = state.get("job_id", "")
    top_candidates = state.get("top_candidates", []) or []
    progress.set_step(job_id, 3)

    if state.get("status") == "error":
        return {}

    if not top_candidates:
        return {
            "status": "error",
            "warnings": warnings + ["top_candidates kosong — jalankan Talent Matching Agent dulu"],
            "execution_log": log,
        }

    candidate_profiles = {}
    failed = []
    for cand in top_candidates:
        nim = str(cand.get("nim", ""))
        try:
            profile = build_candidate_profile(nim)
            if "error" not in profile:
                candidate_profiles[nim] = profile
            else:
                failed.append(nim)
                warnings.append(f"Gagal build profil NIM {nim}: {profile['error']}")
        except Exception as e:  # profil satu kandidat gagal tidak menghentikan pipeline
            failed.append(nim)
            warnings.append(f"Error NIM {nim}: {str(e)}")

    log.append(f"[Candidate Profile] ✅ {len(candidate_profiles)} profil, {len(failed)} gagal")

    return {
        "status": "profiled",
        "candidate_profiles": candidate_profiles,
        "warnings": warnings,
        "execution_log": log,
    }
