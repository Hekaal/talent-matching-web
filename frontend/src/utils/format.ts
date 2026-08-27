/** Label pendek untuk 24 skill domain (dipakai di radar chart). */
export const SHORT_LABELS: Record<string, string> = {
  "Artificial Intelligence": "AI",
  "Business Process & Information Systems": "BPIS",
  "Cloud Computing": "Cloud",
  "Computer Networking": "Network",
  "Data Mining & Analytics": "Data Mining",
  "Database & Data Management": "Database",
  "Enterprise Architecture & Integration": "Ent. Arch",
  "Financial Technology": "FinTech",
  "Human Resource Management": "HRM",
  "IT Governance": "IT Gov",
  "Information Security & Risk Management": "InfoSec",
  "Innovation & Digital Business": "Innovation",
  "Mobile Development": "Mobile",
  "Natural Language Processing": "NLP",
  "Professional & Soft Skills": "Soft Skills",
  "Programming & Algorithm": "Programming",
  "Project Management": "Project Mgmt",
  "Research & Academic Writing": "Research",
  "Smart City & E-Government": "Smart City",
  "Software Engineering": "SW Eng",
  "Statistics & Mathematics": "Statistics",
  "Supply Chain & CRM": "Supply Chain",
  "UI/UX & Interaction Design": "UI/UX",
  "Web Development": "Web Dev",
};

export function shortLabel(domain: string): string {
  return SHORT_LABELS[domain] ?? domain;
}

export function truncate(text: string, max = 25): string {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

export function formatScore(score: number, digits = 4): string {
  return score.toFixed(digits);
}

/** Format angka ribuan gaya Indonesia: 1863 -> "1.863" */
export function formatNumber(n: number): string {
  return n.toLocaleString("id-ID");
}
