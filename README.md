# Talent Matching System Web Application

Sistem rekomendasi kandidat mahasiswa berbasis **OBE (Outcome-Based Education)** dengan
**Multi-Agent AI (LangGraph)** dan **Explainable AI (SHAP)** — Magang Riset PRSDI BRIN.

Web app memanggil agent pipeline secara **real-time** (bukan membaca file hasil statis):

```
User pilih job → FastAPI → LangGraph Pipeline:
  1. Job Requirement Parser  (cache job_requirement_vector.json / rule-based / GPT)
  2. Talent Matching         (KG traversal + boost must-have ×1.5 + cosine similarity
                              + must-have filter threshold 0.65)
  3. Candidate Profile       (skill vector 24 domain per kandidat)
  4. XAI Explainer           (KernelSHAP per CLO, Top-3 kandidat)
  5. Orchestrator LLM        (narasi GPT-4o-mini, fallback template tanpa API key)
→ JSON response → React UI
```

## Struktur

```
talent-matching-web/
├── .env                  ← salin dari .env.example (OPENAI_API_KEY opsional)
├── data/                 ← KG + dataset (sudah terisi)
├── backend/
│   ├── main.py           ← FastAPI app + CORS + startup
│   ├── core/             ← config, data_loader, knowledge_graph, progress
│   ├── agents/           ← 5 agent (disalin dari notebook) + pipeline LangGraph
│   ├── routers/          ← jobs, matching, create_job, candidates
│   └── models/schemas.py
└── frontend/             ← React + TypeScript + Vite + Tailwind + Recharts
```

Sumber kode agent (disalin, tidak ditulis ulang):

| Agent | Notebook sumber |
|---|---|
| 1 Job Parser | `Dataset CLO/ipynb/Agent_JobRequirementParser.ipynb` |
| 2 Talent Matching | `Dataset CLO/Ipynb_v2/Agent_TalentMatching_rombak_must_have_min_score=0.65.ipynb` |
| 3 Candidate Profile | `Dataset CLO/Ipynb_v2/Agent_CandidateProfile_rombak.ipynb` |
| 4 XAI Explainer | `Dataset CLO/Ipynb_v2/Agent_XAI_Explainer_rombak.ipynb` |
| 5 Orchestrator LLM | `Dataset CLO/ipynb/Agent_Orchestrator_LLM.ipynb` |

## Cara Menjalankan

### Backend (port 8000)

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Startup memuat KG (2.533 node) + data ± 25 detik. Docs: http://localhost:8000/docs

### Frontend (port 5173)

```bash
cd frontend
npm install
npm run dev
```

UI: http://localhost:5173

### OpenAI (opsional)

Salin `.env.example` → `.env` di root, isi `OPENAI_API_KEY`. Tanpa key:
- Narasi memakai template rule-based
- Parse job baru memakai keyword matching (SKILL_TAXONOMY)

## API Endpoints

| Method | Endpoint | Keterangan |
|---|---|---|
| GET | `/api/health` | `{status, agents_ready}` |
| GET | `/api/jobs` · `/api/jobs/search?q=` · `/api/jobs/{id}` | Daftar / cari job |
| POST | `/api/matching` `{job_id, top_n}` | Jalankan pipeline 5 agent (hasil di-cache) |
| GET | `/api/matching/{job_id}/status` | Progress pipeline (polling PipelineProgress) |
| POST | `/api/jobs/parse` | GPT parse job description baru |
| POST | `/api/jobs/create` | Simpan job baru (`MANUAL-XXXXXXXX`) |
| GET | `/api/candidates/{nim}` | Profil + skill vector 24 domain |
| GET | `/api/candidates/{nim}/xai/{job_id}` | SHAP (cache pipeline / on-demand) |

Catatan: error pipeline dikembalikan sebagai **200 dengan `status: "error"`** (sesuai PRD).

## Halaman

- `/` — search job + history pencarian (localStorage) + grid job
- `/results/:jobId` — pipeline progress 5 step, narasi, tabel Top-N, filter kampus, export Excel/CSV, checkbox bandingkan
- `/candidate/:nim?job=:jobId` — radar 24 skill, SHAP bar chart, tabel CLO, narasi XAI
- `/compare?nims=a,b,c&job=:jobId` — radar overlay + tabel perbandingan
- `/jobs/create` — 3-step: input → review skill GPT → konfirmasi & matching
