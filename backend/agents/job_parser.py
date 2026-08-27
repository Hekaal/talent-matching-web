"""Agent 1 — Job Requirement Parser.

Disalin dari Agent_JobRequirementParser.ipynb:
- SKILL_TAXONOMY (cell 8)
- build_job_vector() (cell 8)
- job_requirement_parser_agent() (cell 10)
Untuk job yang sudah ada di cache job_requirement_vector.json, agent langsung
memakai vektor dari cache (identik dengan perilaku pipeline notebook).
LLM parser untuk job baru ada di llm_parser.py.
"""

import numpy as np
import pandas as pd

from agents.state import TalentMatchingState
from core import data_loader, progress

# Taxonomy keyword — disalin apa adanya dari notebook cell [8]
SKILL_TAXONOMY = {
    "Programming & Algorithm": ["algorithm", "python programming", "java programming", "javascript developer", "c++ developer", "c# developer", "golang", "typescript", "software development", "object oriented programming", "data structure", "debugging skills", "backend developer", "frontend developer", "software developer", "write code", "clean code", "source code", "programming language", "scripting", "software engineer", "python developer", "java developer", "php", "ruby", "scala"],
    "Web Development": ["html", "css", "bootstrap", "web development", "website", "restful api", "rest api", "graphql", "mvc framework", "frontend development", "backend development", "full stack", "react.js", "angular", "vue.js", "node.js", "django", "flask", "laravel", "spring boot", "web application", "web developer", "web framework"],
    "Mobile Development": ["mobile development", "android development", "ios development", "flutter", "react native", "swift", "kotlin", "mobile app", "mobile application", "mobile developer"],
    "Database & Data Management": ["sql", "mysql", "postgresql", "oracle database", "mongodb", "nosql", "redis", "database management", "data management", "data governance", "elasticsearch", "data warehouse", "relational database", "database administrator", "data pipeline", "etl pipeline", "data modeling", "database design"],
    "Artificial Intelligence": ["machine learning", "deep learning", "neural network", "artificial intelligence", "tensorflow", "pytorch", "keras", "scikit-learn", "reinforcement learning", "computer vision", "supervised learning", "unsupervised learning", "large language model", "generative ai", "llm", "machine learning engineer", "ai engineer", "ml engineer", "machine learning model"],
    "Natural Language Processing": ["natural language processing", "text mining", "sentiment analysis", "topic modeling", "information retrieval", "text classification", "named entity recognition", "word embedding", "bert model", "transformer model", "text processing", "speech recognition", "nlp engineer"],
    "Data Mining & Analytics": ["data mining", "data analytics", "data analysis", "business intelligence", "tableau", "power bi", "data visualization", "analytics dashboard", "big data", "hadoop", "apache spark", "data scientist", "data analyst", "exploratory data analysis", "predictive analytics", "looker", "analytics engineer"],
    "Software Engineering": ["software engineering", "agile methodology", "scrum methodology", "kanban", "devops", "ci/cd pipeline", "continuous integration", "continuous deployment", "git version control", "unit testing", "quality assurance", "software testing", "test automation", "software development lifecycle", "system design", "code review", "docker container", "kubernetes"],
    "Cloud Computing": ["amazon web services", "microsoft azure", "google cloud platform", "cloud computing", "cloud infrastructure", "cloud platform", "terraform", "serverless", "cloud architecture", "cloud deployment", "cloud engineer", "aws lambda", "azure devops", "cloud migration"],
    "Enterprise Architecture & Integration": ["enterprise architecture", "system integration", "sap erp", "enterprise system", "api integration", "middleware", "service oriented architecture", "microservices architecture", "enterprise application", "erp implementation", "solution architect"],
    "Smart City & E-Government": ["smart city", "e-government", "digital government", "government technology", "public sector technology", "civic technology"],
    "Statistics & Mathematics": ["statistical analysis", "probability theory", "hypothesis testing", "regression analysis", "time series analysis", "forecasting model", "linear algebra", "calculus", "quantitative analysis", "statistical modeling", "mathematical modeling", "matlab", "spss", "r programming", "statistician"],
    "Project Management": ["project management", "pmp certification", "prince2", "scrum master", "product owner", "project planning", "stakeholder management", "budget management", "resource planning", "project lifecycle", "project manager", "program manager", "delivery manager", "agile project management"],
    "IT Governance": ["it governance", "cobit framework", "itil framework", "iso 27001", "compliance management", "it audit", "governance framework", "sox compliance", "gdpr compliance"],
    "Business Process & Information Systems": ["business process", "business analysis", "requirements gathering", "system analysis", "process improvement", "bpmn", "workflow automation", "information system", "business requirements", "use case analysis", "functional specification", "business analyst", "systems analyst", "process optimization"],
    "Innovation & Digital Business": ["digital transformation", "innovation management", "startup", "digital strategy", "product development", "product management", "fintech startup", "edtech", "digital business", "technology adoption", "growth hacking", "product manager"],
    "Computer Networking": ["network administration", "computer networking", "tcp/ip protocol", "network routing", "network switching", "vpn configuration", "network security", "cisco certification", "network infrastructure", "network engineer", "network architect", "wireless networking", "firewall configuration", "network monitoring"],
    "UI/UX & Interaction Design": ["ui design", "ux design", "user interface design", "user experience", "design thinking", "figma", "sketch app", "adobe xd", "prototyping", "wireframe", "usability testing", "interaction design", "visual design", "user research", "ui/ux designer", "product designer"],
    "Supply Chain & CRM": ["supply chain management", "logistics management", "inventory management", "procurement", "customer relationship management", "salesforce crm", "hubspot", "demand planning", "vendor management"],
    "Financial Technology": ["financial technology", "financial services", "accounting software", "financial analysis", "banking system", "payment system", "blockchain technology", "cryptocurrency", "financial reporting", "financial modeling", "fintech"],
    "Human Resource Management": ["human resources", "human resource management", "recruitment", "talent acquisition", "performance management", "training development", "payroll management", "employee engagement", "onboarding process", "hris system", "workforce planning", "hr manager", "hr specialist", "talent management"],
    "Information Security & Risk Management": ["cybersecurity", "information security", "penetration testing", "vulnerability assessment", "security audit", "siem", "soc analyst", "incident response", "encryption", "identity management", "risk management framework", "threat analysis", "security engineer", "security analyst"],
    "Research & Academic Writing": ["academic research", "scientific writing", "research publication", "thesis writing", "dissertation", "literature review", "research methodology", "data collection methods", "research analyst", "research scientist"],
    "Professional & Soft Skills": ["communication skills", "teamwork", "leadership skills", "presentation skills", "cross-functional collaboration", "problem solving", "critical thinking skills", "time management", "adaptability", "interpersonal skills", "negotiation skills", "mentoring", "stakeholder communication"],
}


def build_job_vector(description: str, title: str, skill_domain_str: str) -> dict:
    """Bangun job vector berbobot dari deskripsi + skill domain.

    Disalin dari Agent_JobRequirementParser.ipynb cell [8]:
    1. Hitung frekuensi keyword per skill domain dari deskripsi + title
    2. Gabungkan dengan skill domain yang sudah ada di dataset
    3. Normalisasi ke 0-1
    """
    combined = (str(title) + " " + str(description)).lower()
    raw_scores = {}

    for domain, keywords in SKILL_TAXONOMY.items():
        score = 0.0
        for kw in keywords:
            count = combined.count(kw.lower())
            if count > 0:
                # Bobot lebih tinggi untuk keyword yang lebih panjang (lebih spesifik)
                specificity = min(len(kw.split()) / 3.0, 1.0)
                score += (1 + np.log1p(count)) * specificity
        if score > 0:
            raw_scores[domain] = round(score, 4)

    if pd.notna(skill_domain_str) and skill_domain_str not in ["Umum", "nan", ""]:
        for domain in str(skill_domain_str).split(" | "):
            domain = domain.strip()
            if domain and domain != "Umum":
                if domain not in raw_scores:
                    raw_scores[domain] = 0.5  # bobot default jika tidak ada keyword match

    if not raw_scores:
        return {}

    max_score = max(raw_scores.values())
    return {d: round(s / max_score, 4) for d, s in raw_scores.items()}


def job_parser_node(state: TalentMatchingState) -> dict:
    """Agent 1 — mengisi job_title, job_vector, must_have, nice_to_have.

    Job yang sudah ada di cache job_requirement_vector.json langsung dipakai;
    job yang belum ada dibangun on-the-fly dari dataset jobs (rule-based).
    """
    job_id = state.get("job_id", "")
    warnings = list(state.get("warnings", []))
    log = list(state.get("execution_log", []))
    progress.set_step(job_id, 1)

    jv = data_loader.job_vectors.get(job_id)
    if jv is not None:
        log.append(
            f"[Job Parser] ✅ {jv.get('title', '')[:40]} | "
            f"{len(jv.get('job_vector', {}))} skill domain (cache)"
        )
        return {
            "status": "parsed",
            "job_title": jv.get("title", ""),
            "job_company": jv.get("company", ""),
            "job_source": jv.get("source", ""),
            "job_vector": jv.get("job_vector", {}),
            "must_have": jv.get("must_have", []),
            "nice_to_have": jv.get("nice_to_have", []),
            "llm_reasoning": jv.get("llm_reasoning", ""),
            "warnings": warnings,
            "execution_log": log,
        }

    # Job tidak ada di cache — coba bangun dari dataset jobs (rule-based)
    job_row = data_loader.df_jobs[data_loader.df_jobs["job_id"] == job_id]
    if job_row.empty:
        log.append(f"[Job Parser] ❌ job_id tidak ditemukan: {job_id}")
        return {
            "status": "error",
            "warnings": warnings + [f"job_id tidak ditemukan: {job_id}"],
            "execution_log": log,
        }

    row = job_row.iloc[0]
    job_vector = build_job_vector(
        row.get("description_summary", ""),
        row.get("title", ""),
        row.get("skill_domain_summary_str", ""),
    )
    if not job_vector:
        warnings.append(f"Tidak ada skill domain teridentifikasi untuk {job_id}")

    must_have = [d for d, w in job_vector.items() if w >= 0.6]
    nice_to_have = [d for d, w in job_vector.items() if 0.0 < w < 0.6]
    log.append(
        f"[Job Parser] ✅ {str(row.get('title', ''))[:40]} | "
        f"{len(job_vector)} skill | {len(must_have)} must_have (rule-based)"
    )

    return {
        "status": "parsed",
        "job_title": str(row.get("title", "")),
        "job_company": str(row.get("company", "")),
        "job_source": str(row.get("source", "")),
        "job_description": str(row.get("description", ""))[:500],
        "job_vector": job_vector,
        "must_have": must_have,
        "nice_to_have": nice_to_have,
        "warnings": warnings,
        "execution_log": log,
    }
