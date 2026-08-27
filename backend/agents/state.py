"""TalentMatchingState — schema state yang mengalir antar agen (LangGraph)."""

from typing import Optional, TypedDict


class TalentMatchingState(TypedDict, total=False):
    # Input
    job_id: str
    top_n: int

    # Agent 1 output — Job Requirement Parser
    job_title: Optional[str]
    job_company: Optional[str]
    job_source: Optional[str]
    job_description: Optional[str]
    job_vector: Optional[dict]  # {skill_domain: weight}
    must_have: Optional[list]
    nice_to_have: Optional[list]
    llm_reasoning: Optional[str]

    # Agent 2 output — Talent Matching
    job_clo_vector: Optional[dict]
    top_candidates: Optional[list]
    n_filtered: Optional[int]
    n_clo_relevant: Optional[int]

    # Agent 3 output — Candidate Profile
    candidate_profiles: Optional[dict]  # {nim: profile}

    # Agent 4 output — XAI Explainer
    xai_explanations: Optional[dict]  # {nim: shap_result}

    # Agent 5 output — Orchestrator
    narrative: Optional[str]

    # Meta
    execution_log: list
    warnings: list
    status: str
