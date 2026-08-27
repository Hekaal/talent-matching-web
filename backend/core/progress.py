"""Registry progress pipeline per job — dipakai GET /api/matching/{job_id}/status.

Setiap agent node melaporkan langkahnya di sini sehingga frontend bisa
menampilkan PipelineProgress (5 step) saat pipeline berjalan.
"""

import threading
import time

PIPELINE_STEPS = [
    {"label": "Job Requirement Parser", "description": "Menganalisis kebutuhan job..."},
    {"label": "Talent Matching", "description": "Mencari kandidat dari 300 mahasiswa..."},
    {"label": "Candidate Profile", "description": "Membangun profil kompetensi..."},
    {"label": "XAI Explainer", "description": "Menghitung kontribusi CLO (SHAP)..."},
    {"label": "Orchestrator LLM", "description": "Membuat narasi rekomendasi..."},
]

_lock = threading.Lock()
_progress: dict[str, dict] = {}


def start(job_id: str) -> None:
    with _lock:
        _progress[job_id] = {
            "job_id": job_id,
            "status": "running",
            "current_step": 0,
            "error": None,
            "started_at": time.time(),
        }


def set_step(job_id: str, step: int) -> None:
    """step 1-5 = agent ke-N sedang berjalan."""
    with _lock:
        if job_id in _progress:
            _progress[job_id]["current_step"] = step


def finish(job_id: str, error: str | None = None) -> None:
    with _lock:
        if job_id in _progress:
            _progress[job_id]["status"] = "error" if error else "done"
            _progress[job_id]["error"] = error
            _progress[job_id]["current_step"] = 5 if not error else _progress[job_id]["current_step"]


def get(job_id: str) -> dict:
    with _lock:
        p = _progress.get(job_id)
        if p is None:
            return {"job_id": job_id, "status": "idle", "current_step": 0, "error": None}
        return dict(p)
