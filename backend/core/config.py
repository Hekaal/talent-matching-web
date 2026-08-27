"""Settings dari .env — dipakai seluruh backend."""

import os
from pathlib import Path

from dotenv import load_dotenv

BACKEND_DIR = Path(__file__).resolve().parents[1]
ROOT_DIR = BACKEND_DIR.parent

# .env bisa di root project atau di folder backend
load_dotenv(ROOT_DIR / ".env")
load_dotenv(BACKEND_DIR / ".env")

DATA_DIR = Path(os.getenv("DATA_DIR", ROOT_DIR / "data"))

KG_PATH = Path(os.getenv("KG_PATH", DATA_DIR / "knowledge_graph_v1.graphml"))
MHS_CSV = Path(os.getenv("MHS_CSV", DATA_DIR / "dataset_mahasiswa_sintetis_v2_rombak.csv"))
CLO_CSV = Path(os.getenv("CLO_CSV", DATA_DIR / "dataset_clo_with_skill_onet_2.csv"))
JOB_VECTORS_JSON = Path(os.getenv("JOB_VECTORS_JSON", DATA_DIR / "job_requirement_vector.json"))
JOBS_CSV = Path(os.getenv("JOBS_CSV", DATA_DIR / "dataset_jobs_summarized.csv"))
CANDIDATE_PROFILE_CSV = Path(
    os.getenv("CANDIDATE_PROFILE_CSV", DATA_DIR / "candidate_profile_rombak.csv")
)
XAI_CACHE_JSON = Path(os.getenv("XAI_CACHE_JSON", DATA_DIR / "xai_explanations_rombak.json"))

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
GPT_MODEL = os.getenv("GPT_MODEL", "gpt-4o-mini")

TOP_N_DEFAULT = int(os.getenv("TOP_N_DEFAULT", "10"))
MUST_HAVE_FILTER_THRESHOLD = float(os.getenv("MUST_HAVE_FILTER_THRESHOLD", "0.65"))
BOOST_MUST_HAVE = float(os.getenv("BOOST_MUST_HAVE", "1.5"))
SHAP_N_SAMPLES = int(os.getenv("SHAP_N_SAMPLES", "50"))
SHAP_TOP_K = int(os.getenv("SHAP_TOP_K", "3"))  # SHAP hanya untuk Top-3 kandidat
