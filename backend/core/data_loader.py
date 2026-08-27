"""Load semua data SEKALI saat startup FastAPI.

Disalin dari bagian load data notebook:
- Agent_TalentMatching_rombak_must_have_min_score=0.65.ipynb (cell 4, 6)
- Agent_CandidateProfile_rombak.ipynb (cell 4, 6)
- Agent_XAI_Explainer_rombak.ipynb (cell 4, 6)
"""

import json
from collections import defaultdict

import numpy as np
import pandas as pd

from core.config import (
    CANDIDATE_PROFILE_CSV,
    CLO_CSV,
    JOB_VECTORS_JSON,
    JOBS_CSV,
    MHS_CSV,
    XAI_CACHE_JSON,
)

# ── Dataset mahasiswa ────────────────────────────────────────────
df_mhs = pd.read_csv(MHS_CSV, dtype={"nim": str})
CLO_COLS = [c for c in df_mhs.columns if c not in ["nim", "kampus"]]

# ── NORMALISASI: nilai / 100.0 (Han et al. 2011, Section 3.5.2) ──
# Domain knowledge: skala penilaian akademik sub-CLO adalah 0-100
MHS_MATRIX = df_mhs[CLO_COLS].values.astype(float)
MHS_MATRIX_NORM = MHS_MATRIX / 100.0

# Index NIM → row index di matrix
NIM_TO_IDX = {str(row["nim"]): i for i, (_, row) in enumerate(df_mhs.iterrows())}

# Lookup: clo_key → index kolom di matrix
COL_INDEX = {col: i for i, col in enumerate(CLO_COLS)}

# ── Dataset CLO + mapping skill domain ───────────────────────────
df_clo = pd.read_csv(CLO_CSV)

# Lookup: clo_key → list skill domain
CLO_TO_SKILL: dict[str, list] = {}
for _, row in df_clo.iterrows():
    skill_str = str(row.get("skill_domain_str", ""))
    skills = [s.strip() for s in skill_str.split(" | ") if s.strip() not in ["Umum", "nan", ""]]
    CLO_TO_SKILL[row["clo_key"]] = skills

# Lookup: skill domain → list clo_key
SKILL_TO_CLO = defaultdict(list)
for clo_key, skills in CLO_TO_SKILL.items():
    for skill in skills:
        SKILL_TO_CLO[skill].append(clo_key)

# Semua skill domain unik (24 domain)
ALL_SKILLS = sorted(set(s for skills in CLO_TO_SKILL.values() for s in skills))

# Lookup: clo_key → info display
CLO_INFO: dict[str, dict] = {}
for _, row in df_clo.iterrows():
    CLO_INFO[row["clo_key"]] = {
        "clo_id": row["clo_id"],
        "mata_kuliah": row["mata_kuliah"],
        "skill_domain": CLO_TO_SKILL.get(row["clo_key"], []),
    }

# ── Job vectors (cache dari Job Requirement Parser Agent) ────────
with open(JOB_VECTORS_JSON, encoding="utf-8") as f:
    job_vectors: dict = json.load(f)

# ── Job descriptions ─────────────────────────────────────────────
df_jobs = pd.read_csv(JOBS_CSV, dtype={"job_id": str})

# ── Candidate profile CSV (untuk must-have filter) ───────────────
df_cp = pd.read_csv(CANDIDATE_PROFILE_CSV, dtype={"nim": str})

# ── Cache XAI hasil pipeline sebelumnya (seed) ───────────────────
try:
    with open(XAI_CACHE_JSON, encoding="utf-8") as f:
        xai_seed_cache: dict = json.load(f)
except FileNotFoundError:
    xai_seed_cache = {}


def save_job_vectors() -> None:
    """Persist job_vectors ke file setelah ada job baru (POST /api/jobs/create)."""
    with open(JOB_VECTORS_JSON, "w", encoding="utf-8") as f:
        json.dump(job_vectors, f, ensure_ascii=False, indent=2)


def summary() -> str:
    return (
        f"Data loaded: mahasiswa={len(df_mhs)}, CLO cols={len(CLO_COLS)}, "
        f"CLO info={len(CLO_INFO)}, job_vectors={len(job_vectors):,}, "
        f"jobs CSV={len(df_jobs):,}, profil CSV={len(df_cp)}, "
        f"XAI seed cache={len(xai_seed_cache)} job"
    )


# Rata-rata background untuk SHAP (dihitung sekali saat startup)
MHS_MATRIX_MEAN = MHS_MATRIX_NORM.mean(axis=0)

# Cek konsistensi cepat
assert MHS_MATRIX_NORM.shape[0] == len(NIM_TO_IDX)
np.seterr(divide="ignore", invalid="ignore")
