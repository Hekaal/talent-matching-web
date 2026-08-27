"""Agent 5 — Orchestrator LLM (narasi rekomendasi untuk HRD).

Disalin dari Agent_Orchestrator_LLM.ipynb:
- NARASI_SYSTEM_PROMPT (cell 10)
- llm_generate_narasi() (cell 10)
- orchestrator node dari orchestrator_llm_agent() (cell 12)

Jika OPENAI_API_KEY tidak diset, narasi memakai fallback template rule-based
sehingga pipeline tetap jalan tanpa API key.
"""

import time

from agents.state import TalentMatchingState
from core import data_loader, progress
from core.config import GPT_MODEL, OPENAI_API_KEY

MAX_TOKENS = 800
TEMP_NARASI = 0.4

_client = None
if OPENAI_API_KEY:
    try:
        from openai import OpenAI

        _client = OpenAI(api_key=OPENAI_API_KEY)
    except Exception:
        _client = None

NARASI_SYSTEM_PROMPT = """Kamu adalah asisten HRD yang membantu merekomendasikan
kandidat mahasiswa untuk posisi pekerjaan berdasarkan kompetensi OBE
(Outcome-Based Education).

Tugasmu: buat narasi rekomendasi yang informatif, profesional, dan actionable
untuk HRD. Tulis dalam Bahasa Indonesia, maksimal 150 kata.

Format narasi:
1. Pembuka: ringkasan rekomendasi utama
2. Kandidat terbaik: kenapa dia yang paling cocok (berdasarkan skill dan CLO)
3. Perbandingan singkat dengan kandidat lain
4. Catatan untuk HRD (jika ada)

Gunakan data yang diberikan — jangan mengarang informasi."""


def llm_generate_narasi(job_data: dict, candidates: list, max_retries: int = 3) -> str:
    """Generate narasi rekomendasi menggunakan GPT-4o-mini."""
    top3 = candidates[:3]
    cand_summary = []
    for c in top3:
        clo_info = ""
        clo_list = c.get("top_clo_shap") or []
        if clo_list:
            # Sebut ketiga mata kuliah agar narasi punya bahan konkret,
            # bukan hanya satu CLO teratas seperti sebelumnya.
            nama_mk = []
            for clo in clo_list[:3]:
                mk = clo.get("mata_kuliah", "").strip()
                if mk and mk not in nama_mk:
                    nama_mk.append(mk)
            if nama_mk:
                clo_info = f" | mata kuliah pendukung: {', '.join(nama_mk)}"
        cand_summary.append(
            f"- Rank #{c['rank']}: NIM {c['nim']} "
            f"({str(c.get('kampus', '')).replace('Telkom University ', 'TelU ')}) "
            f"| score={c['score']:.4f} "
            f"| skill wajib terpenuhi: {', '.join(c.get('top_skills', [])[:2])}"
            f"{clo_info}"
        )

    user_prompt = f"""Data Rekomendasi:

Job Title  : {job_data.get('job_title', '')}
Company    : {job_data.get('job_company', '')}
Must Have  : {', '.join(job_data.get('must_have', []))}
Nice to Have: {', '.join(job_data.get('nice_to_have', [])[:3])}

Top-{len(top3)} Kandidat:
{chr(10).join(cand_summary)}

Buat narasi rekomendasi untuk HRD."""

    import openai

    for attempt in range(max_retries):
        try:
            response = _client.chat.completions.create(
                model=GPT_MODEL,
                messages=[
                    {"role": "system", "content": NARASI_SYSTEM_PROMPT},
                    {"role": "user", "content": user_prompt},
                ],
                max_tokens=MAX_TOKENS,
                temperature=TEMP_NARASI,
            )
            return response.choices[0].message.content.strip()
        except openai.RateLimitError:
            time.sleep(2**attempt)
        except Exception as e:
            return f"[Narasi tidak tersedia: {str(e)[:50]}]"

    return "[Narasi tidak tersedia — rate limit]"


def _template_narasi(job_data: dict, candidates: list, n_filtered: int) -> str:
    """Fallback rule-based jika OPENAI_API_KEY tidak diset."""
    title = job_data.get("job_title", "")
    company = job_data.get("job_company", "")
    must = ", ".join(job_data.get("must_have", [])) or "-"
    if not candidates:
        return (
            f"Tidak ditemukan kandidat yang memenuhi syarat must-have "
            f"untuk posisi '{title}' di {company}."
        )
    best = candidates[0]
    n_pass = sum(1 for c in candidates if c.get("passes_must_have"))
    top_skills = ", ".join(best.get("top_skills", [])[:2]) or "-"
    top_mk = ", ".join(
        dict.fromkeys(c.get("mata_kuliah", "") for c in best.get("top_clo_shap", [])[:3])
    )
    return (
        f"Sistem merekomendasikan {len(candidates)} kandidat teratas untuk posisi "
        f"'{title}' di {company} dari {len(data_loader.df_mhs)} mahasiswa yang "
        f"dievaluasi ({n_filtered} kandidat tidak lolos filter must-have 0.65). "
        f"Skill wajib: {must}. Kandidat terbaik adalah NIM {best['nim']} "
        f"({best.get('kampus', '')}) dengan cosine score {best['score']:.4f} dan "
        f"kekuatan utama pada {top_skills}"
        + (f" lewat mata kuliah {top_mk}. " if top_mk else ". ")
        + 
        f"{n_pass} dari {len(candidates)} kandidat teratas memenuhi seluruh syarat "
        f"must-have. Detail kontribusi CLO tiap kandidat tersedia melalui "
        f"penjelasan SHAP di halaman kandidat."
    )


def orchestrator_node(state: TalentMatchingState) -> dict:
    """Agent 5 — mengisi narrative dari data seluruh pipeline."""
    warnings = list(state.get("warnings", []))
    log = list(state.get("execution_log", []))
    job_id = state.get("job_id", "")
    progress.set_step(job_id, 5)

    if state.get("status") == "error":
        return {}

    top_candidates = state.get("top_candidates", []) or []
    profiles = state.get("candidate_profiles", {}) or {}
    explanations = state.get("xai_explanations", {}) or {}
    must_have_list = state.get("must_have", []) or []

    # Entri dari seed cache belum punya penanda is_must_have — lengkapi dulu
    from agents.xai_explainer import enrich_contributions

    for expl in explanations.values():
        if expl.get("clo_contributions"):
            enrich_contributions(expl["clo_contributions"], must_have_list)

    # Gabungkan data kandidat untuk prompt narasi
    candidates = []
    for cand in top_candidates:
        nim = str(cand.get("nim", ""))
        profile = profiles.get(nim, {})
        xai = explanations.get(nim, {})

        # CLO yang disodorkan ke GPT dipilih pakai SHAP TERBOBOT
        # (shap_value x job_weight), bukan SHAP mentah. Tanpa pembobotan, CLO
        # dari skill nice-to-have yang nilainya kebetulan tinggi ikut terangkat
        # dan membuat narasi menyebut keahlian yang tidak diminta job.
        contributions = xai.get("clo_contributions", []) if xai else []
        if not contributions and xai:
            contributions = xai.get("top_positive_clo", []) + xai.get("top_negative_clo", [])

        by_weighted = lambda c: -c.get("shap_weighted", 0)  # noqa: E731

        # Prioritas 1 — skill wajib yang benar-benar mendorong skor naik
        top_must = sorted(
            [
                c
                for c in contributions
                if c.get("is_must_have") and c.get("shap_weighted", 0) > 0
            ],
            key=by_weighted,
        )
        if len(top_must) >= 3:
            top_clo_shap = top_must[:3]
        else:
            # Prioritas 2 — lengkapi dengan kontribusi terbobot tertinggi lainnya
            chosen = {id(c) for c in top_must}
            others = sorted(
                [c for c in contributions if id(c) not in chosen], key=by_weighted
            )
            top_clo_shap = (top_must + others)[:3]

        # Skill yang disebut di narasi ikut dibatasi ke skill WAJIB job —
        # sebelumnya memakai top_skills (nilai absolut kandidat) sehingga GPT
        # menyebut keahlian yang tidak ada hubungannya dengan lowongan.
        must_set = set(must_have_list)
        context_skills: list[str] = []
        for clo in top_clo_shap:
            for domain in clo.get("skill_domain", []):
                if domain in must_set and domain not in context_skills:
                    context_skills.append(domain)
        candidates.append(
            {
                "rank": cand.get("rank"),
                "nim": nim,
                "kampus": cand.get("kampus", ""),
                "score": cand.get("score", 0),
                "passes_must_have": cand.get("passes_must_have", False),
                "top_skills": context_skills or profile.get("top_skills", []),
                "top_clo_shap": top_clo_shap,
            }
        )

    job_data = {
        "job_title": state.get("job_title", ""),
        "job_company": state.get("job_company", ""),
        "must_have": state.get("must_have", []) or [],
        "nice_to_have": state.get("nice_to_have", []) or [],
    }

    if _client is not None:
        narrative = llm_generate_narasi(job_data, candidates)
        mode = "GPT"
        if narrative.startswith("[Narasi tidak tersedia"):
            narrative = _template_narasi(job_data, candidates, state.get("n_filtered", 0))
            mode = "template (GPT gagal)"
    else:
        narrative = _template_narasi(job_data, candidates, state.get("n_filtered", 0))
        mode = "template (tanpa API key)"

    log.append(f"[Orchestrator] ✅ narasi {len(narrative)} karakter ({mode})")

    return {
        "status": "completed",
        "narrative": narrative,
        "warnings": warnings,
        "execution_log": log,
    }
