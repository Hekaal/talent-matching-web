"""LLM Job Parser — GPT-4o-mini ekstrak skill domain dari job description baru.

Disalin dari Agent_Orchestrator_LLM.ipynb:
- VALID_SKILL_DOMAINS (cell 8)
- PARSER_SYSTEM_PROMPT + llm_job_parser() (cell 8), diadaptasi untuk
  menerima description langsung (job baru dari HRD, bukan job_id).

Fallback rule-based (SKILL_TAXONOMY) dipakai jika OPENAI_API_KEY tidak diset
atau GPT gagal, sehingga POST /api/jobs/parse selalu mengembalikan hasil.
"""

import json
import time

from agents.job_parser import build_job_vector
from core.config import GPT_MODEL, OPENAI_API_KEY

TEMP_PARSER = 0.1

_client = None
if OPENAI_API_KEY:
    try:
        from openai import OpenAI

        _client = OpenAI(api_key=OPENAI_API_KEY)
    except Exception:
        _client = None

# Daftar skill domain yang valid (O*NET 30.3)
VALID_SKILL_DOMAINS = [
    "Programming & Algorithm", "Web Development", "Mobile Development",
    "Database & Data Management", "Artificial Intelligence",
    "Natural Language Processing", "Data Mining & Analytics",
    "Software Engineering", "Cloud Computing",
    "Enterprise Architecture & Integration", "Smart City & E-Government",
    "Statistics & Mathematics", "Project Management", "IT Governance",
    "Business Process & Information Systems", "Innovation & Digital Business",
    "Computer Networking", "UI/UX & Interaction Design",
    "Supply Chain & CRM", "Financial Technology",
    "Human Resource Management", "Information Security & Risk Management",
    "Research & Academic Writing", "Professional & Soft Skills",
]

PARSER_SYSTEM_PROMPT = f"""Kamu adalah sistem ekstraksi skill dari job description.
Tugasmu: identifikasi skill domain yang dibutuhkan job ini.

Pilih HANYA dari daftar skill domain berikut:
{json.dumps(VALID_SKILL_DOMAINS, indent=2)}

Kembalikan HANYA JSON dengan format ini (tanpa teks lain):
{{
  "must_have": ["skill1", "skill2"],
  "nice_to_have": ["skill3", "skill4"],
  "reasoning": "penjelasan singkat 1 kalimat"
}}

Rules:
- must_have: skill yang WAJIB dimiliki (disebutkan eksplisit di job description)
- nice_to_have: skill yang diinginkan tapi tidak wajib
- Maksimal 5 must_have dan 5 nice_to_have
- Gunakan nama skill PERSIS seperti di daftar di atas
"""


def _rule_based_parse(title: str, description: str) -> dict:
    """Fallback: keyword matching dengan SKILL_TAXONOMY dari Agent 1."""
    vec = build_job_vector(description, title, "")
    must_have = [d for d, w in vec.items() if w >= 0.6]
    nice_to_have = [d for d, w in vec.items() if 0.0 < w < 0.6]
    return {
        "must_have": must_have[:5],
        "nice_to_have": nice_to_have[:5],
        "reasoning": (
            "Diekstrak dengan rule-based keyword matching (SKILL_TAXONOMY) "
            "karena GPT tidak tersedia."
        ),
        "parser_mode": "rule-based (fallback)",
    }


def parse_job_description(title: str, company: str, description: str, max_retries: int = 3) -> dict:
    """Ekstrak must_have / nice_to_have dari job description (GPT-4o-mini)."""
    if _client is None:
        return _rule_based_parse(title, description)

    import openai

    user_prompt = f"""Job Title: {title}
Company: {company}

Job Description:
{description[:1500]}

Identifikasi skill domain yang dibutuhkan dari daftar yang tersedia."""

    for attempt in range(max_retries):
        try:
            response = _client.chat.completions.create(
                model=GPT_MODEL,
                messages=[
                    {"role": "system", "content": PARSER_SYSTEM_PROMPT},
                    {"role": "user", "content": user_prompt},
                ],
                max_tokens=300,
                temperature=TEMP_PARSER,
            )
            raw = response.choices[0].message.content.strip()
            raw_clean = raw.replace("```json", "").replace("```", "").strip()
            parsed = json.loads(raw_clean)

            must_have = [s for s in parsed.get("must_have", []) if s in VALID_SKILL_DOMAINS]
            nice_to_have = [s for s in parsed.get("nice_to_have", []) if s in VALID_SKILL_DOMAINS]
            return {
                "must_have": must_have,
                "nice_to_have": nice_to_have,
                "reasoning": parsed.get("reasoning", ""),
                "parser_mode": "llm",
            }
        except (json.JSONDecodeError, openai.RateLimitError):
            time.sleep(2**attempt)
            continue
        except Exception:
            break

    return _rule_based_parse(title, description)
