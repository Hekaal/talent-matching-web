export interface Job {
  job_id: string;
  title: string;
  company: string;
  source: string;
  must_have: string[];
  nice_to_have: string[];
  description_summary?: string;
  description?: string;
}

export interface Company {
  company: string;
  n_jobs: number;
}

export interface Candidate {
  rank: number;
  nim: string;
  kampus: string;
  score: number;
  coverage: number;
  passes_must_have: boolean;
  top_skills: string[];
  weak_skills: string[];
  avg_score: number;
  skill_vector: Record<string, number>;
  /** "good" | "medium" | "weak"; null bila SHAP belum dihitung (hanya Top-3). */
  must_have_health: MustHaveHealth | null;
}

export type MustHaveHealth = "good" | "medium" | "weak";

export interface CLOContribution {
  clo_id: string;
  mata_kuliah: string;
  shap_value: number;
  job_weight: number;
  nilai_raw: number;
  skill_domain: string[];
  is_must_have: boolean;
  /** shap_value x job_weight — kontribusi setelah dibobot kepentingan job. */
  shap_weighted: number;
  is_weak_must: boolean;
}

export interface XAIResult {
  nim: string;
  job_id: string;
  score: number;
  base_value: number;
  top_positive_clo: CLOContribution[];
  top_negative_clo: CLOContribution[];
  explanation_text: string;
}

export interface MatchResult {
  status: string;
  job_id: string;
  title: string;
  company: string;
  must_have: string[];
  nice_to_have: string[];
  n_candidates: number;
  n_filtered: number;
  candidates: Candidate[];
  xai_results: Record<string, XAIResult>;
  narrative: string;
  execution_log: string[];
  warnings: string[];
  error?: string | null;
}

export interface PipelineStatus {
  job_id: string;
  status: "idle" | "running" | "done" | "error";
  current_step: number; // 0-5
  error?: string | null;
}

export interface CandidateProfile {
  nim: string;
  kampus: string;
  avg_score: number;
  top_skills: string[];
  weak_skills: string[];
  skill_vector: SkillVector;
}

export interface ParsedJob {
  must_have: string[];
  nice_to_have: string[];
  reasoning: string;
  parser_mode: string;
}

export interface CreatedJob {
  job_id: string;
  title: string;
  company: string;
  must_have: string[];
  nice_to_have: string[];
}

export interface SkillVector {
  [skill_domain: string]: number;
}

export interface SearchHistoryItem {
  job_id: string;
  title: string;
  company: string;
  timestamp: number;
}
