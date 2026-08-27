"""Pydantic request/response models untuk Talent Matching API."""

from pydantic import BaseModel, Field


class Job(BaseModel):
    job_id: str
    title: str
    company: str
    source: str
    must_have: list[str]
    nice_to_have: list[str]
    description_summary: str | None = None
    description: str | None = None  # teks job description lengkap


class JobDescription(BaseModel):
    job_id: str
    description: str


class Company(BaseModel):
    company: str
    n_jobs: int


class Candidate(BaseModel):
    rank: int
    nim: str
    kampus: str
    score: float
    coverage: float
    passes_must_have: bool
    top_skills: list[str]
    weak_skills: list[str]
    avg_score: float
    skill_vector: dict[str, float] = {}
    # "good" = 0 must-have SHAP negatif, "medium" = 1-2, "weak" = >2.
    # None bila SHAP belum dihitung untuk kandidat ini (SHAP hanya Top-3).
    must_have_health: str | None = None


class CLOContribution(BaseModel):
    clo_id: str
    mata_kuliah: str
    shap_value: float
    job_weight: float
    nilai_raw: float
    skill_domain: list[str]
    is_must_have: bool = False  # CLO mendukung skill must-have job ini
    shap_weighted: float = 0.0  # shap_value x job_weight
    is_weak_must: bool = False  # must-have dengan kontribusi SHAP negatif


class XAIResult(BaseModel):
    nim: str
    job_id: str
    score: float
    base_value: float
    top_positive_clo: list[CLOContribution]
    top_negative_clo: list[CLOContribution]
    explanation_text: str


class MatchRequest(BaseModel):
    job_id: str
    top_n: int = Field(10, ge=1, le=50)


class MatchResult(BaseModel):
    status: str
    job_id: str
    title: str
    company: str
    must_have: list[str]
    nice_to_have: list[str]
    n_candidates: int
    n_filtered: int
    candidates: list[Candidate]
    xai_results: dict[str, XAIResult]
    narrative: str
    execution_log: list[str]
    warnings: list[str] = []
    error: str | None = None


class PipelineStatus(BaseModel):
    job_id: str
    status: str  # idle | running | done | error
    current_step: int  # 0-5
    error: str | None = None


class CandidateProfile(BaseModel):
    nim: str
    kampus: str
    avg_score: float
    top_skills: list[str]
    weak_skills: list[str]
    skill_vector: dict[str, float]


class ParseJobRequest(BaseModel):
    title: str
    company: str
    description: str = Field(..., min_length=100)


class ParsedJob(BaseModel):
    must_have: list[str]
    nice_to_have: list[str]
    reasoning: str
    parser_mode: str


class CreateJobRequest(BaseModel):
    title: str
    company: str
    description: str
    must_have: list[str]
    nice_to_have: list[str]


class CreateJobResponse(BaseModel):
    job_id: str
    title: str
    company: str
    must_have: list[str]
    nice_to_have: list[str]


class HealthResponse(BaseModel):
    status: str
    agents_ready: bool
