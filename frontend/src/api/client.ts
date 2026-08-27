import axios from "axios";
import type {
  CandidateProfile,
  Company,
  CreatedJob,
  Job,
  MatchResult,
  ParsedJob,
  PipelineStatus,
  XAIResult,
} from "../types";

const api = axios.create({
  baseURL: "http://localhost:8000",
  timeout: 120000, // pipeline bisa memakan waktu belasan detik
});

export async function getJobs(): Promise<Job[]> {
  const res = await api.get<Job[]>("/api/jobs");
  return res.data;
}

/** Daftar perusahaan unik — Step 1 di HomePage. */
export async function getCompanies(): Promise<Company[]> {
  const res = await api.get<Company[]>("/api/companies");
  return res.data;
}

/** Semua job dari satu perusahaan — Step 2 di HomePage. */
export async function getCompanyJobs(company: string): Promise<Job[]> {
  const res = await api.get<Job[]>(`/api/companies/${encodeURIComponent(company)}/jobs`);
  return res.data;
}

/** Teks job description lengkap — dipakai accordion di ResultPage. */
export async function getJobDescription(jobId: string): Promise<string> {
  const res = await api.get<{ job_id: string; description: string }>(
    `/api/jobs/${jobId}/description`
  );
  return res.data.description;
}

export async function getJob(jobId: string): Promise<Job> {
  const res = await api.get<Job>(`/api/jobs/${jobId}`);
  return res.data;
}

/** Jalankan LangGraph agent pipeline (5 agent) untuk satu job. */
export async function postMatching(jobId: string, topN = 10): Promise<MatchResult> {
  const res = await api.post<MatchResult>("/api/matching", {
    job_id: jobId,
    top_n: topN,
  });
  return res.data;
}

export async function getMatchingStatus(jobId: string): Promise<PipelineStatus> {
  const res = await api.get<PipelineStatus>(`/api/matching/${jobId}/status`);
  return res.data;
}

export async function getCandidate(nim: string): Promise<CandidateProfile> {
  const res = await api.get<CandidateProfile>(`/api/candidates/${nim}`);
  return res.data;
}

export async function getXai(nim: string, jobId: string): Promise<XAIResult> {
  const res = await api.get<XAIResult>(`/api/candidates/${nim}/xai/${jobId}`);
  return res.data;
}

/** Step 1→2 CreateJobPage: GPT parse job description. */
export async function parseJob(
  title: string,
  company: string,
  description: string
): Promise<ParsedJob> {
  const res = await api.post<ParsedJob>("/api/jobs/parse", {
    title,
    company,
    description,
  });
  return res.data;
}

/** Step 3 CreateJobPage: simpan job baru. */
export async function createJob(
  title: string,
  company: string,
  description: string,
  mustHave: string[],
  niceToHave: string[]
): Promise<CreatedJob> {
  const res = await api.post<CreatedJob>("/api/jobs/create", {
    title,
    company,
    description,
    must_have: mustHave,
    nice_to_have: niceToHave,
  });
  return res.data;
}

/** Ambil pesan error yang bisa dibaca manusia dari error axios/FastAPI. */
export function errorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const detail = err.response?.data?.detail;
    if (typeof detail === "string") return detail;
    if (err.code === "ERR_NETWORK")
      return "Tidak dapat terhubung ke server. Pastikan backend berjalan di http://localhost:8000.";
    return err.message;
  }
  return "Terjadi kesalahan yang tidak diketahui.";
}

/** 24 skill domain valid (untuk dropdown CreateJobPage). */
export const ALL_SKILL_DOMAINS = [
  "Artificial Intelligence",
  "Business Process & Information Systems",
  "Cloud Computing",
  "Computer Networking",
  "Data Mining & Analytics",
  "Database & Data Management",
  "Enterprise Architecture & Integration",
  "Financial Technology",
  "Human Resource Management",
  "IT Governance",
  "Information Security & Risk Management",
  "Innovation & Digital Business",
  "Mobile Development",
  "Natural Language Processing",
  "Professional & Soft Skills",
  "Programming & Algorithm",
  "Project Management",
  "Research & Academic Writing",
  "Smart City & E-Government",
  "Software Engineering",
  "Statistics & Mathematics",
  "Supply Chain & CRM",
  "UI/UX & Interaction Design",
  "Web Development",
];

export default api;
