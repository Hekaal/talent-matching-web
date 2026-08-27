"""LangGraph graph builder — merangkai 5 agent jadi satu pipeline.

Sesuai PRD section 5:
job_parser → talent_matching → candidate_profile → xai_explainer → orchestrator
"""

from langgraph.graph import END, StateGraph

from agents.candidate_profile import candidate_profile_node
from agents.job_parser import job_parser_node
from agents.orchestrator import orchestrator_node
from agents.state import TalentMatchingState
from agents.talent_matching import talent_matching_node
from agents.xai_explainer import xai_explainer_node


def build_pipeline():
    graph = StateGraph(TalentMatchingState)

    graph.add_node("job_parser", job_parser_node)
    graph.add_node("talent_matching", talent_matching_node)
    graph.add_node("candidate_profile", candidate_profile_node)
    graph.add_node("xai_explainer", xai_explainer_node)
    graph.add_node("orchestrator", orchestrator_node)

    graph.set_entry_point("job_parser")
    graph.add_edge("job_parser", "talent_matching")
    graph.add_edge("talent_matching", "candidate_profile")
    graph.add_edge("candidate_profile", "xai_explainer")
    graph.add_edge("xai_explainer", "orchestrator")
    graph.add_edge("orchestrator", END)

    return graph.compile()


pipeline = build_pipeline()


def run_pipeline(job_id: str, top_n: int = 10) -> dict:
    """Jalankan pipeline lengkap untuk satu job dan kembalikan state akhir."""
    initial_state: TalentMatchingState = {
        "job_id": job_id,
        "top_n": top_n,
        "warnings": [],
        "execution_log": [],
        "status": "pending",
    }
    return pipeline.invoke(initial_state)
