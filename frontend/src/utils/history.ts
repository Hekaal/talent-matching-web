import type { Job, SearchHistoryItem } from "../types";

const KEY = "search_history";
const MAX_ITEMS = 5;

export function getHistory(): SearchHistoryItem[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function addToHistory(job: Job): SearchHistoryItem[] {
  const item: SearchHistoryItem = {
    job_id: job.job_id,
    title: job.title,
    company: job.company,
    timestamp: Date.now(),
  };
  const next = [item, ...getHistory().filter((h) => h.job_id !== job.job_id)].slice(
    0,
    MAX_ITEMS
  );
  localStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export function clearHistory(): void {
  localStorage.removeItem(KEY);
}
