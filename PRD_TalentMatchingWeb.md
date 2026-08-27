# PRD — Talent Matching System Web Application
**Berbasis OBE dengan Multi-Agent AI & Explainable AI**

| Atribut | Detail |
|---|---|
| Proyek | Talent Matching System Berbasis OBE |
| Dibuat oleh | Haekhal M. Syaed (NIM 103052300033) |
| Institusi | Magang Riset PRSDI – BRIN |
| Stack | FastAPI + LangGraph Agent Pipeline + React + TypeScript |
| Versi | v2.0.0 — Agent-Based Architecture |
| Status | PRD untuk Claude Desktop |

---

## 1. Overview

Sistem Talent Matching berbasis OBE adalah sistem rekomendasi kandidat mahasiswa kepada industri menggunakan **Multi-Agent AI (LangGraph)** dan **Explainable AI (SHAP)**. Web application ini memanggil agent pipeline secara langsung — bukan membaca file JSON statis — sehingga setiap request menjalankan pipeline AI secara real-time.

### Arsitektur Utama

```
User input job_id / job description
        ↓
FastAPI Backend
        ↓
LangGraph Pipeline (Multi-Agent)
  ├── Agent 1: Job Requirement Parser
  │     rule-based keyword matching
  │     atau GPT-4o-mini (jika job baru)
  ├── Agent 2: Talent Matching
  │     KG Traversal + Cosine Similarity
  │     + Must-Have Filter (threshold 0.65)
  │     + Boost Must-Have CLO ×1.5
  ├── Agent 3: Candidate Profile
  │     Skill vector per domain
  │     Top/weak skills
  ├── Agent 4: XAI Explainer
  │     KernelSHAP per CLO
  │     ERASER faithfulness
  └── Agent 5: Orchestrator LLM
        GPT-4o-mini narasi untuk HRD
        ↓
JSON response ke frontend
        ↓
React Web UI
```

### Yang TIDAK perlu dibuat
- Database — pakai file CSV/JSON + Knowledge Graph
- Authentication / login
- Edit data mahasiswa yang sudah ada

---

## 2. Tech Stack

### Backend
- **FastAPI** — REST API framework
- **LangGraph** — Multi-Agent orchestration
- **NetworkX** — Knowledge Graph traversal
- **SHAP** — XAI explainer
- **Pandas + NumPy** — data processing
- **OpenAI SDK** — GPT-4o-mini untuk Job Parser LLM + narasi
- **Uvicorn** — ASGI server
- **Python-dotenv** — environment variables

### Frontend
- **React + TypeScript** — UI framework
- **Vite** — build tool
- **Tailwind CSS** — styling
- **Recharts** — chart library (SHAP bar + skill radar)
- **Axios** — HTTP client
- **React Router v6** — routing

---

## 3. Warna & Desain

```
Navy   : #1E2761  → header, judul, sidebar
Teal   : #00A896  → primary button, badge positif, chart
Ice    : #EEF3FE  → card background, row ganjil
Light  : #F7F9FC  → page background
Coral  : #F96167  → error, badge negatif, SHAP negatif
Amber  : #F2A007  → warning, nice_to_have badge
Muted  : #5A6178  → subtitle, metadata, placeholder
```

Font: **Inter** (Google Fonts)

---

## 4. Struktur Folder

```
talent-matching-web/
├── .env                           ← OPENAI_API_KEY, DATA_DIR, KG_PATH
├── backend/
│   ├── main.py                    ← FastAPI app + CORS + startup
│   ├── routers/
│   │   ├── jobs.py                ← GET /api/jobs, GET /api/jobs/{id}
│   │   ├── matching.py            ← POST /api/matching (jalankan pipeline)
│   │   └── create_job.py          ← POST /api/jobs/create (job baru + GPT)
│   ├── agents/                    ← Agent pipeline (dari notebook)
│   │   ├── __init__.py
│   │   ├── state.py               ← TalentMatchingState schema
│   │   ├── job_parser.py          ← Agent 1: Job Requirement Parser
│   │   ├── talent_matching.py     ← Agent 2: Talent Matching + filter
│   │   ├── candidate_profile.py   ← Agent 3: Candidate Profile
│   │   ├── xai_explainer.py       ← Agent 4: XAI SHAP
│   │   ├── orchestrator.py        ← Agent 5: Orchestrator LLM
│   │   └── pipeline.py            ← LangGraph graph builder
│   ├── core/
│   │   ├── knowledge_graph.py     ← Load KG + traversal functions
│   │   ├── data_loader.py         ← Load dataset mahasiswa + job vectors
│   │   └── config.py              ← Settings dari .env
│   └── models/
│       └── schemas.py             ← Pydantic request/response models
│
├── data/                          ← File data pipeline
│   ├── knowledge_graph_v1.graphml
│   ├── dataset_mahasiswa_sintetis_v2_rombak.csv
│   ├── dataset_clo_with_skill_onet_2.csv
│   ├── job_requirement_vector.json
│   └── dataset_jobs_summarized.csv
│
└── frontend/
    ├── index.html
    ├── vite.config.ts
    ├── tailwind.config.js
    └── src/
        ├── main.tsx
        ├── App.tsx                ← Router setup
        ├── pages/
        │   ├── HomePage.tsx       ← search + history
        │   ├── ResultPage.tsx     ← Top-10 kandidat
        │   ├── CandidatePage.tsx  ← profil + SHAP
        │   ├── ComparePage.tsx    ← bandingkan 2-3 kandidat
        │   └── CreateJobPage.tsx  ← tambah job baru
        ├── components/
        │   ├── JobSearchBar.tsx
        │   ├── CandidateCard.tsx
        │   ├── ShapChart.tsx
        │   ├── SkillRadar.tsx
        │   ├── NarrativeBox.tsx
        │   ├── ScoreBadge.tsx
        │   ├── MustHaveChip.tsx
        │   ├── PipelineProgress.tsx  ← progress 5 agent (loading)
        │   └── LoadingSkeleton.tsx
        ├── api/
        │   └── client.ts
        └── types/
            └── index.ts
```

---

## 5. Agent Pipeline

### State Schema (LangGraph)

```python
# backend/agents/state.py
from typing import TypedDict, Optional

class TalentMatchingState(TypedDict):
    # Input
    job_id        : str
    top_n         : int

    # Agent 1 output
    job_title     : str
    job_company   : str
    job_vector    : dict          # {skill_domain: weight}
    must_have     : list[str]
    nice_to_have  : list[str]
    llm_reasoning : str

    # Agent 2 output
    top_candidates: list[dict]
    n_filtered    : int
    n_clo_relevant: int

    # Agent 3 output
    candidate_profiles: dict      # {nim: profile}

    # Agent 4 output
    xai_explanations: dict        # {nim: shap_result}

    # Agent 5 output
    narrative     : str
    execution_log : list[str]
    warnings      : list[str]
    status        : str
```

### Pipeline Graph (LangGraph)

```python
# backend/agents/pipeline.py
from langgraph.graph import StateGraph, END
from .state import TalentMatchingState
from .job_parser import job_parser_node
from .talent_matching import talent_matching_node
from .candidate_profile import candidate_profile_node
from .xai_explainer import xai_explainer_node
from .orchestrator import orchestrator_node

def build_pipeline():
    graph = StateGraph(TalentMatchingState)

    graph.add_node("job_parser",        job_parser_node)
    graph.add_node("talent_matching",   talent_matching_node)
    graph.add_node("candidate_profile", candidate_profile_node)
    graph.add_node("xai_explainer",     xai_explainer_node)
    graph.add_node("orchestrator",      orchestrator_node)

    graph.set_entry_point("job_parser")
    graph.add_edge("job_parser",        "talent_matching")
    graph.add_edge("talent_matching",   "candidate_profile")
    graph.add_edge("candidate_profile", "xai_explainer")
    graph.add_edge("xai_explainer",     "orchestrator")
    graph.add_edge("orchestrator",       END)

    return graph.compile()

pipeline = build_pipeline()
```

### Agent 1 — Job Parser

```python
# backend/agents/job_parser.py
# Rule-based keyword matching dari job_requirement_vector.json
# Untuk job baru → GPT-4o-mini

def job_parser_node(state: TalentMatchingState) -> TalentMatchingState:
    job_id = state["job_id"]

    # Cek apakah job sudah ada di cache
    if job_id in job_vectors:
        jv = job_vectors[job_id]
        state["job_title"]    = jv["title"]
        state["job_company"]  = jv["company"]
        state["job_vector"]   = jv["job_vector"]
        state["must_have"]    = jv["must_have"]
        state["nice_to_have"] = jv["nice_to_have"]
    else:
        # Job baru → error, seharusnya sudah di-create dulu
        state["status"] = "error"
        state["warnings"].append(f"job_id {job_id} tidak ditemukan")

    return state
```

### Agent 2 — Talent Matching

```python
# backend/agents/talent_matching.py
# KG Traversal + Cosine Similarity + Must-Have Filter
# Normalisasi: nilai / 100.0 (Han et al. 2011)
# Boost must-have CLO ×1.5 (Lv & Zhu, Qin et al. 2020)
# Filter threshold: 0.65 (OBE Grade BC)

def talent_matching_node(state: TalentMatchingState) -> TalentMatchingState:
    # 1. KG Traversal → job_clo_vector
    # 2. Cosine similarity semua 300 mahasiswa
    # 3. Must-have filter (skill >= 0.65)
    # 4. Ranking Top-N
    # Return state dengan top_candidates
    pass
```

### Agent 3 — Candidate Profile

```python
# backend/agents/candidate_profile.py
# Bangun profil kompetensi per kandidat
# Rata-rata nilai CLO per skill domain
# Identifikasi top/weak skills

def candidate_profile_node(state: TalentMatchingState) -> TalentMatchingState:
    # Untuk setiap NIM di top_candidates
    # Hitung skill_vector per domain
    # Return state dengan candidate_profiles
    pass
```

### Agent 4 — XAI Explainer

```python
# backend/agents/xai_explainer.py
# KernelSHAP untuk Top-3 kandidat
# Background = rata-rata 300 mahasiswa
# ERASER faithfulness (DeYoung et al. 2020)

def xai_explainer_node(state: TalentMatchingState) -> TalentMatchingState:
    # Untuk Top-3 kandidat
    # Jalankan KernelSHAP
    # Return state dengan xai_explanations
    pass
```

### Agent 5 — Orchestrator LLM

```python
# backend/agents/orchestrator.py
# GPT-4o-mini generate narasi rekomendasi untuk HRD
# Input: job info + top-3 kandidat + SHAP
# Output: narasi ~150 kata Bahasa Indonesia

def orchestrator_node(state: TalentMatchingState) -> TalentMatchingState:
    # Generate narasi dengan GPT-4o-mini
    # Return state dengan narrative
    pass
```

---

## 6. API Endpoints

### Base URL: `http://localhost:8000`

### 6.1 Jobs (dari cache job_requirement_vector.json)

```
GET  /api/health
     → { status: "ok", agents_ready: true }

GET  /api/jobs
     → Job[]  (semua job dari job_requirement_vector.json)

GET  /api/jobs/search?q={query}
     → Job[]  (filter by title atau company)

GET  /api/jobs/{job_id}
     → JobDetail
```

### 6.2 Matching (jalankan agent pipeline)

```
POST /api/matching
     Body: { job_id: string, top_n: number }
     → Jalankan LangGraph pipeline
     → Response time: ~15-30 detik
     → MatchResult (lengkap dengan SHAP + narasi)

GET  /api/matching/{job_id}/status
     → Status pipeline (running/done/error)
```

### 6.3 Create Job Baru

```
POST /api/jobs/parse
     Body: { description: string, title: string, company: string }
     → Jalankan GPT-4o-mini Job Parser
     → Return skill yang terdeteksi untuk dikonfirmasi user
     → Response: { must_have[], nice_to_have[], reasoning }

POST /api/jobs/create
     Body: { title, company, description, must_have[], nice_to_have[] }
     → Simpan ke job_requirement_vector.json
     → Generate job_id baru (MANUAL-XXXXXXXX)
     → Return: { job_id, title, must_have[], nice_to_have[] }
```

### 6.4 Candidates

```
GET  /api/candidates/{nim}
     → Profil kandidat + skill vector

GET  /api/candidates/{nim}/xai/{job_id}
     → SHAP explanation (dari cache hasil pipeline)
```

---

## 7. TypeScript Interfaces

```typescript
interface Job {
  job_id: string
  title: string
  company: string
  source: string
  must_have: string[]
  nice_to_have: string[]
  description_summary?: string
}

interface Candidate {
  rank: number
  nim: string
  kampus: string
  score: number
  coverage: number
  passes_must_have: boolean
  top_skills: string[]
  weak_skills: string[]
  avg_score: number
  skill_vector: Record<string, number>
}

interface CLOContribution {
  clo_id: string
  mata_kuliah: string
  shap_value: number
  job_weight: number
  nilai_raw: number
  skill_domain: string[]
}

interface XAIResult {
  nim: string
  job_id: string
  score: number
  base_value: number
  top_positive_clo: CLOContribution[]
  top_negative_clo: CLOContribution[]
  explanation_text: string
}

interface MatchResult {
  job_id: string
  title: string
  company: string
  must_have: string[]
  nice_to_have: string[]
  n_candidates: number
  n_filtered: number
  candidates: Candidate[]
  xai_results: Record<string, XAIResult>  // nim → XAI
  narrative: string
  execution_log: string[]
}

interface ParsedJob {
  must_have: string[]
  nice_to_have: string[]
  reasoning: string
}
```

---

## 8. Spesifikasi Halaman

### 8.1 HomePage (`/`)

**Layout:**
- Header navbar: logo + "Talent Matching System" + tagline
- Hero: search bar besar
  - Input text + dropdown autocomplete dari semua job
  - Button "Cari Kandidat" (teal)
  - Button "Tambah Job Baru" (outline navy)
- Section "Pencarian Terakhir" (dari localStorage, max 5)
- Grid 2×4 card job populer

**Behavior:**
- Ketik → filter dropdown real-time (debounce 300ms)
- Pilih job → navigate ke `/results/{job_id}`
- Klik "Tambah Job Baru" → navigate ke `/jobs/create`
- History tersimpan di localStorage

---

### 8.2 ResultPage (`/results/:jobId`)

**Layout:**
```
[Breadcrumb: Home > {job_title}]

[Job Info Panel]
  Title, Company, Source
  Must Have chips (teal)
  Nice to Have chips (amber)
  n_filtered info

[Pipeline Progress — saat loading]
  Step 1: Job Parser     ✅
  Step 2: Talent Matching ✅
  Step 3: Profil         ✅
  Step 4: XAI SHAP       ✅
  Step 5: Narasi GPT     ✅

[Narrative Box - teal border]

[Filter + Export toolbar]
  Dropdown kampus filter
  Button Export Excel
  Button Export CSV
  Top-N selector (5/10/20)
  Checkbox "Bandingkan" (max 3)

[Tabel Kandidat]
  Rank | Checkbox | NIM | Kampus | Score bar | Top Skill | Action

[Button "Bandingkan (N)" — muncul jika ada yang dicentang]
```

**Behavior:**
- Mount → POST `/api/matching` dengan job_id
- Loading: tampilkan PipelineProgress per step
- Response setelah ~15-30 detik
- Filter kampus: real-time di frontend
- Export: SheetJS generate Excel/CSV
- Centang kandidat → button "Bandingkan" muncul

---

### 8.3 CandidatePage (`/candidate/:nim?job=:jobId`)

**Layout (2 kolom):**

```
Kolom Kiri (40%):
  Avatar lingkaran navy (inisial)
  NIM + Kampus
  Avg Score badge
  Radar Chart 24 skill domain (Recharts)
  Top Skills chips (teal)
  Weak Skills chips (coral)

Kolom Kanan (60%):
  Score + Base Value panel
  Passes Must-Have badge

  SHAP Bar Chart (Recharts HorizontalBar)
    teal = positif, coral = negatif
    Y: mata_kuliah (truncate 25 char)
    X: shap_value
    Top 10 CLO by |shap_value|

  Tabel CLO Detail
    Kolom: MK | Nilai | Job Weight | SHAP
    Highlight row jika skill ∈ must_have

  Narrative Box
    explanation_text dari XAI
```

---

### 8.4 ComparePage (`/compare?nims=x,y,z&job=:jobId`)

**Layout:**
```
[Header: Perbandingan Kandidat — {job_title}]

[Radar Chart Overlay]
  3 warna berbeda per kandidat
  Legend: NIM + score masing-masing

[Tabel Perbandingan]
  Kolom: Skill Domain | NIM-1 | NIM-2 | NIM-3
  Highlight kolom dengan nilai tertinggi (teal)
  24 baris (satu per skill domain)

[Score Summary]
  3 card: NIM, Kampus, Score, Passes Must-Have
```

---

### 8.5 CreateJobPage (`/jobs/create`)

**Layout — 3 Step:**

**Step 1 — Input:**
```
Job Title    : [input text]
Company      : [input text]
Description  : [textarea, min 100 char, placeholder contoh JD]
Button: "Analisis dengan GPT" (teal)
```

**Step 2 — Review Hasil GPT:**
```
Loading: "GPT sedang menganalisis... (~5 detik)"

Setelah selesai:
  GPT Reasoning: "[kotak abu, italic]"

  Must Have (Wajib):           Nice to Have (Opsional):
  [✅ AI] [✅ Data Mining]     [✅ Database] [☐ Web Dev]

  Dropdown: Tambah skill manual (24 skill domain)
  Tombol pindah skill: Must ↔ Nice

Button: "Lanjut" (teal) | "Ulangi" (outline)
```

**Step 3 — Konfirmasi:**
```
Preview:
  Title   : Data Scientist
  Company : PT Tokopedia
  Must    : [AI] [Data Mining]
  Nice    : [Database]

Button: "Simpan & Cari Kandidat" (teal, besar)
→ POST /api/jobs/create
→ Loading: "Menyimpan job dan mencari kandidat..."
→ Navigate ke /results/{job_id_baru}
```

---

## 9. PipelineProgress Component

Komponen khusus untuk menampilkan progress 5 agent saat loading:

```tsx
interface PipelineProgressProps {
  currentStep: number  // 0-5
  steps: {
    label: string
    description: string
    status: 'waiting' | 'running' | 'done' | 'error'
  }[]
}

// Steps:
// 1. Job Requirement Parser  — "Menganalisis kebutuhan job..."
// 2. Talent Matching         — "Mencari kandidat dari 300 mahasiswa..."
// 3. Candidate Profile       — "Membangun profil kompetensi..."
// 4. XAI Explainer           — "Menghitung kontribusi CLO (SHAP)..."
// 5. Orchestrator LLM        — "Membuat narasi rekomendasi..."
```

---

## 10. Environment Variables

```bash
# .env
OPENAI_API_KEY=sk-...
DATA_DIR=./data
KG_PATH=./data/knowledge_graph_v1.graphml
MHS_CSV=./data/dataset_mahasiswa_sintetis_v2_rombak.csv
CLO_CSV=./data/dataset_clo_with_skill_onet_2.csv
JOB_VECTORS_JSON=./data/job_requirement_vector.json
JOBS_CSV=./data/dataset_jobs_summarized.csv
TOP_N_DEFAULT=10
MUST_HAVE_FILTER_THRESHOLD=0.65
BOOST_MUST_HAVE=1.5
```

---

## 11. Cara Menjalankan

### Backend
```bash
cd backend
pip install fastapi uvicorn pandas numpy networkx shap openai \
            langgraph python-dotenv scikit-learn scipy
cp ../.env .
uvicorn main:app --reload --port 8000
# Docs: http://localhost:8000/docs
```

### Frontend
```bash
cd frontend
npm install
npm run dev
# UI: http://localhost:5173
```

---

## 12. Fitur Lengkap

| Fitur | Halaman | Prioritas | Keterangan |
|---|---|---|---|
| Search job | HomePage | MUST | Dropdown + filter real-time |
| Jalankan agent pipeline | ResultPage | MUST | POST /api/matching |
| Progress 5 agent | ResultPage | MUST | PipelineProgress component |
| Top-10 kandidat + score | ResultPage | MUST | Dari hasil pipeline |
| SHAP bar chart | CandidatePage | MUST | Recharts HorizontalBar |
| Radar skill 24 domain | CandidatePage | MUST | Recharts RadarChart |
| Narasi GPT untuk HRD | ResultPage | MUST | Dari Orchestrator LLM |
| Loading skeleton | Semua | MUST | Saat fetch |
| Error handling | Semua | MUST | 404, timeout, dll |
| Export Excel/CSV | ResultPage | SHOULD | SheetJS |
| Filter kandidat by kampus | ResultPage | SHOULD | Real-time frontend |
| History pencarian | HomePage | SHOULD | localStorage |
| Bandingkan 2-3 kandidat | ComparePage | SHOULD | Radar overlay |
| Tambah job baru + GPT | CreateJobPage | SHOULD | 3-step form |
| Responsive mobile | Semua | SHOULD | Min 375px |

---

## 13. Acceptance Criteria

| No | Kriteria | Prioritas |
|---|---|---|
| 1 | User bisa search job dan jalankan pipeline | MUST |
| 2 | Progress 5 agent tampil saat loading | MUST |
| 3 | Top-10 kandidat tampil dengan score bar | MUST |
| 4 | SHAP bar chart teal/coral tampil | MUST |
| 5 | Radar chart 24 skill domain tampil | MUST |
| 6 | Narasi GPT tampil di hasil | MUST |
| 7 | Error handling jika pipeline gagal | MUST |
| 8 | Export hasil ke Excel/CSV | SHOULD |
| 9 | Filter by kampus real-time | SHOULD |
| 10 | Tambah job baru dengan GPT review | SHOULD |
| 11 | Bandingkan 2-3 kandidat | SHOULD |
| 12 | History pencarian di localStorage | SHOULD |
| 13 | Responsive mobile 375px | SHOULD |

---

## 14. Catatan Penting untuk Claude Desktop

1. **Import agent dari notebook** — salin logika dari notebook `.ipynb` ke file Python terpisah di `backend/agents/`
2. **KG harus di-load sekali** saat startup FastAPI (`@app.on_event("startup")`) — jangan load ulang per request
3. **MHS_MATRIX_NORM** — hitung sekali saat startup, simpan di memory
4. **Response time** — pipeline ~15-30 detik, frontend HARUS tampilkan loading yang informatif per step
5. **SHAP hanya untuk Top-3** — terlalu lambat kalau untuk semua 10 kandidat
6. **NIM selalu string** — jangan integer
7. **Skill domain names dengan spasi** — `"Artificial Intelligence"` bukan `"skill_Artificial_Intelligence"`
8. **CORS** — allow `http://localhost:5173`
9. **Error pipeline** — return 200 dengan `status: "error"` dan pesan jelas, jangan 500

---

*PRD ini dibuat untuk Claude Desktop dalam membangun web application Talent Matching System berbasis Agent AI.*
*Haekhal M. Syaed | Magang Riset PRSDI–BRIN | 2026*

---

## 15. Kode Agent yang Sudah Ada — Dipindahkan ke Backend

> **PENTING untuk Claude Desktop:** Kode berikut sudah ada di notebook Python.
> Pindahkan ke file Python di `backend/agents/` — JANGAN tulis ulang dari nol.
> Sesuaikan import dan path file sesuai struktur folder backend.

---

### 15.1 File: `backend/agents/job_parser.py`

Ambil dari: `Agent_JobRequirementParser.ipynb`

**Yang dipindahkan:**
- Cell [8]: `SKILL_TAXONOMY` — dictionary keyword per skill domain
- Cell [10]: `job_requirement_parser_agent()` — fungsi agent utama
- Cell [6]: `build_job_vector()` — konversi keyword → job vector

```python
# backend/agents/job_parser.py
# SALIN dari Agent_JobRequirementParser.ipynb cell [6], [8], [10]

from .state import TalentMatchingState
from ..core.data_loader import job_vectors, df_jobs

# Cell [8] — SKILL_TAXONOMY
SKILL_TAXONOMY = {
    "Programming & Algorithm": ["algorithm", "python", "java", ...],
    "Artificial Intelligence": ["machine learning", "deep learning", ...],
    # ... semua 24 skill domain
}

# Cell [6] — build_job_vector()
def build_job_vector(description: str) -> dict:
    # Salin dari notebook
    pass

# Cell [10] — job_requirement_parser_agent()
def job_requirement_parser_agent(state: TalentMatchingState) -> TalentMatchingState:
    # Salin dari notebook
    # Ganti: df_jobs → data_loader.df_jobs
    # Ganti: job_vectors → data_loader.job_vectors
    pass
```

---

### 15.2 File: `backend/agents/talent_matching.py`

Ambil dari: `Agent_TalentMatching_rombak.ipynb`

**Yang dipindahkan:**
- Cell [6]: Normalisasi `MHS_MATRIX_NORM = nilai/100.0`
- Cell [8]: `clo_node_to_col_idx()` — mapping KG node ke index
- Cell [10]: `project_job_to_clo_space()` — KG traversal + boost must-have ×1.5
- Cell [12]: `must_to_col_tm()` + `passes_must_have_filter()` + `rank_candidates()`
- Cell [14/15]: `talent_matching_agent()` — fungsi agent utama

```python
# backend/agents/talent_matching.py
# SALIN dari Agent_TalentMatching_rombak.ipynb

from .state import TalentMatchingState
from ..core.knowledge_graph import G, CLO_COLS, COL_INDEX, CLO_TO_SKILL
from ..core.data_loader import MHS_MATRIX_NORM, df_mhs, df_cp, job_vectors

BOOST_MUST = 1.5   # Lv & Zhu, Qin et al. (2020)
BOOST_NICE = 1.0
MUST_HAVE_MIN_SCORE = 0.65  # OBE Grade BC

# Cell [10] — project_job_to_clo_space()
def project_job_to_clo_space(job_vector, must_have=None, nice_to_have=None):
    # Salin dari notebook
    pass

# Cell [12] — passes_must_have_filter() + rank_candidates()
def passes_must_have_filter(mhs_idx, must_have, min_score=0.65):
    # Salin dari notebook
    pass

def rank_candidates(job_clo_vector, top_n=10, must_have=None,
                    must_have_min_score=0.65):
    # Salin dari notebook
    # Return: (candidates_list, n_filtered)
    pass

# Cell [15] — talent_matching_agent()
def talent_matching_agent(state: TalentMatchingState) -> TalentMatchingState:
    # Salin dari notebook
    pass
```

---

### 15.3 File: `backend/agents/candidate_profile.py`

Ambil dari: `Agent_CandidateProfile_rombak.ipynb`

**Yang dipindahkan:**
- Cell [8]: `build_skill_vector()` — rata-rata nilai CLO per skill domain
- Cell [10]: `candidate_profile_agent()` — fungsi agent utama

```python
# backend/agents/candidate_profile.py
# SALIN dari Agent_CandidateProfile_rombak.ipynb

from .state import TalentMatchingState
from ..core.data_loader import df_mhs, df_clo, CLO_TO_SKILL_DOMAIN

# Cell [8] — build_skill_vector()
def build_skill_vector(nim: str) -> dict:
    # Rata-rata nilai CLO per skill domain
    # Normalisasi nilai/100.0
    # Salin dari notebook
    pass

# Cell [10] — candidate_profile_agent()
def candidate_profile_agent(state: TalentMatchingState) -> TalentMatchingState:
    # Salin dari notebook
    pass
```

---

### 15.4 File: `backend/agents/xai_explainer.py`

Ambil dari: `Agent_XAI_Explainer_rombak.ipynb`

**Yang dipindahkan:**
- Cell [6]: Normalisasi + `CLO_INFO` + `CLO_TO_SKILL`
- Cell [8]: `get_job_clo_vector()` — bangun vektor job untuk SHAP
- Cell [10]: `predict_fn()` — fungsi cosine untuk KernelSHAP
- Cell [12]: `xai_explainer_agent()` — jalankan SHAP per kandidat

```python
# backend/agents/xai_explainer.py
# SALIN dari Agent_XAI_Explainer_rombak.ipynb
# PENTING: SHAP hanya untuk Top-3 kandidat (performance!)

import shap
import numpy as np
from .state import TalentMatchingState
from ..core.data_loader import MHS_MATRIX_NORM, df_mhs

# Background SHAP = rata-rata 300 mahasiswa
# Dihitung sekali saat startup

# Cell [8] — get_job_clo_vector()
def get_job_clo_vector(job_id: str) -> tuple:
    # Salin dari notebook
    pass

# Cell [10] — predict_fn() untuk KernelSHAP
def make_predict_fn(job_vec_rel, relevant_idx):
    def predict_fn(mhs_matrix_subset):
        # Cosine similarity
        pass
    return predict_fn

# Cell [12] — xai_explainer_agent()
def xai_explainer_agent(state: TalentMatchingState) -> TalentMatchingState:
    # Hanya Top-3 kandidat (bukan Top-10)
    # Salin dari notebook
    pass
```

---

### 15.5 File: `backend/agents/orchestrator.py`

Ambil dari: `Agent_Orchestrator_LLM.ipynb`

**Yang dipindahkan:**
- Cell [8]: `VALID_SKILL_DOMAINS` — list 24 skill domain
- Cell [10]: `NARASI_SYSTEM_PROMPT` — system prompt GPT
- Cell [12]: `llm_generate_narasi()` — generate narasi dengan GPT-4o-mini
- Cell [14]: `orchestrator_agent()` — fungsi agent utama

```python
# backend/agents/orchestrator.py
# SALIN dari Agent_Orchestrator_LLM.ipynb

from openai import OpenAI
from .state import TalentMatchingState
from ..core.config import OPENAI_API_KEY

client = OpenAI(api_key=OPENAI_API_KEY)

# Cell [10] — NARASI_SYSTEM_PROMPT
NARASI_SYSTEM_PROMPT = """Kamu adalah asisten HRD yang membantu merekomendasikan
kandidat mahasiswa untuk posisi pekerjaan berdasarkan kompetensi OBE...
"""

# Cell [12] — llm_generate_narasi()
def llm_generate_narasi(job_data: dict, candidates: list) -> str:
    # Salin dari notebook
    pass

# Cell [14] — orchestrator_agent()
def orchestrator_agent(state: TalentMatchingState) -> TalentMatchingState:
    # Salin dari notebook
    pass
```

---

### 15.6 File: `backend/core/knowledge_graph.py`

Ambil dari: `Agent_TalentMatching_rombak.ipynb` cell [4] (load KG)

```python
# backend/core/knowledge_graph.py
# Load KG SEKALI saat startup — jangan load per request!
# KG berukuran besar (2.533 node, 106.801 edge)

import networkx as nx
import pandas as pd
from .config import KG_PATH, CLO_CSV

# Load saat import module
G = nx.read_graphml(KG_PATH)

# Build CLO_COLS, COL_INDEX, CLO_TO_SKILL dari KG
CLO_COLS    = [...]  # list semua CLO key
COL_INDEX   = {...}  # {clo_key: index}
CLO_TO_SKILL = {...} # {clo_key: [skill_domain]}

print(f"KG loaded: {G.number_of_nodes()} nodes, {G.number_of_edges()} edges")
```

---

### 15.7 File: `backend/core/data_loader.py`

Ambil dari: semua notebook — bagian load data + normalisasi

```python
# backend/core/data_loader.py
# Load semua data SEKALI saat startup FastAPI

import pandas as pd
import numpy as np
import json
from .config import MHS_CSV, CLO_CSV, JOB_VECTORS_JSON, JOBS_CSV

# Dataset mahasiswa
df_mhs     = pd.read_csv(MHS_CSV)
CLO_COLS_M = [c for c in df_mhs.columns if c not in ['nim','kampus']]

# Normalisasi nilai/100.0 (Han et al. 2011)
MHS_MATRIX_NORM = df_mhs[CLO_COLS_M].values.astype(float) / 100.0

# Index NIM → row
NIM_TO_IDX = {str(row['nim']): i
              for i, (_, row) in enumerate(df_mhs.iterrows())}

# Dataset CLO
df_clo = pd.read_csv(CLO_CSV)

# Job vectors (cache dari job_requirement_vector.json)
with open(JOB_VECTORS_JSON, encoding='utf-8') as f:
    job_vectors = json.load(f)

# Job descriptions
df_jobs = pd.read_csv(JOBS_CSV)

print(f"Data loaded:")
print(f"  Mahasiswa    : {len(df_mhs)}")
print(f"  CLO          : {len(df_clo)}")
print(f"  Job vectors  : {len(job_vectors)}")
print(f"  Job CSV      : {len(df_jobs)}")
```

---

### 15.8 `backend/main.py`

```python
# backend/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Talent Matching System API")

# CORS untuk frontend React
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load semua data + KG saat startup
@app.on_event("startup")
async def startup():
    from .core import knowledge_graph, data_loader
    from .agents.pipeline import build_pipeline
    app.state.pipeline = build_pipeline()
    print("✅ Pipeline siap")

# Register routers
from .routers import jobs, matching, create_job
app.include_router(jobs.router,       prefix="/api")
app.include_router(matching.router,   prefix="/api")
app.include_router(create_job.router, prefix="/api")

@app.get("/api/health")
def health():
    return {"status": "ok", "agents": 5}
```

---

## 16. Panduan untuk Claude Desktop

### Instruksi Utama

> Bangun web application Talent Matching System sesuai PRD ini.
> Kode agent pipeline SUDAH ADA di folder notebook — JANGAN tulis ulang.
> Tugas Claude Desktop adalah:
> 1. Salin logika dari notebook ke file Python di `backend/agents/`
> 2. Buat FastAPI backend yang memanggil agent pipeline via LangGraph
> 3. Buat frontend React yang menampilkan hasil pipeline

### Urutan Pengerjaan

```
Step 1: Setup struktur folder (backend/ + frontend/)
Step 2: Buat backend/core/ (config, knowledge_graph, data_loader)
Step 3: Salin kode dari notebook ke backend/agents/ (5 agent)
Step 4: Buat backend/agents/pipeline.py (LangGraph graph)
Step 5: Buat backend/routers/ (jobs, matching, create_job)
Step 6: Test backend: uvicorn main:app --reload
Step 7: Buat frontend React (HomePage, ResultPage, CandidatePage)
Step 8: Buat komponen (ShapChart, SkillRadar, PipelineProgress)
Step 9: Connect frontend ke backend via Axios
Step 10: Test end-to-end
```

### File Notebook yang Dirujuk

```
Agent_JobRequirementParser.ipynb   → backend/agents/job_parser.py
Agent_TalentMatching_rombak.ipynb  → backend/agents/talent_matching.py
Agent_CandidateProfile_rombak.ipynb→ backend/agents/candidate_profile.py
Agent_XAI_Explainer_rombak.ipynb   → backend/agents/xai_explainer.py
Agent_Orchestrator_LLM.ipynb       → backend/agents/orchestrator.py
```

