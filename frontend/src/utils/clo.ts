import type { CLOContribution } from "../types";

export type CloRelevance = "must" | "nice" | "other";

export interface CloGroup {
  mata_kuliah: string;
  nilai_avg: number; // rata-rata nilai_raw semua CLO di MK ini
  job_weight: number; // dari CLO pertama (sama untuk semua CLO di satu MK)
  shap_sum: number; // total kontribusi SHAP MK ini
  clo_ids: string[];
  skill_domains: string[];
  relevance: CloRelevance;
}

/** Tentukan relevansi MK terhadap job: must_have menang atas nice_to_have. */
function resolveRelevance(
  domains: string[],
  mustHave: Set<string>,
  niceToHave: Set<string>
): CloRelevance {
  if (domains.some((d) => mustHave.has(d))) return "must";
  if (domains.some((d) => niceToHave.has(d))) return "nice";
  return "other";
}

/**
 * Gabungkan kontribusi per-CLO menjadi per-mata kuliah.
 * nilai = rata-rata nilai_raw, shap = jumlah shap_value, job_weight = CLO pertama.
 * Hasil diurutkan by shap_sum descending.
 */
export function groupCloByMataKuliah(
  contributions: CLOContribution[],
  mustHave: string[] = [],
  niceToHave: string[] = []
): CloGroup[] {
  const mustSet = new Set(mustHave);
  const niceSet = new Set(niceToHave);
  const buckets = new Map<
    string,
    { nilai: number[]; shap: number; weight: number; clo: string[]; domains: Set<string> }
  >();

  for (const c of contributions) {
    const key = c.mata_kuliah;
    let b = buckets.get(key);
    if (!b) {
      b = { nilai: [], shap: 0, weight: c.job_weight, clo: [], domains: new Set() };
      buckets.set(key, b);
    }
    b.nilai.push(c.nilai_raw);
    b.shap += c.shap_value;
    b.clo.push(c.clo_id);
    for (const d of c.skill_domain) b.domains.add(d);
  }

  return [...buckets.entries()]
    .map(([mata_kuliah, b]) => {
      const domains = [...b.domains];
      return {
        mata_kuliah,
        nilai_avg: b.nilai.reduce((s, v) => s + v, 0) / b.nilai.length,
        job_weight: b.weight,
        shap_sum: b.shap,
        clo_ids: b.clo,
        skill_domains: domains,
        relevance: resolveRelevance(domains, mustSet, niceSet),
      };
    })
    .sort((a, b) => b.shap_sum - a.shap_sum);
}

/**
 * Skill unggulan yang KONTEKSTUAL terhadap job.
 *
 * Diambil dari CLO yang mendukung skill wajib dengan kontribusi SHAP terbobot
 * positif, lalu dipetakan hanya ke skill domain yang memang termasuk must-have
 * job. Pemetaan itu penting: satu CLO bisa mendukung banyak domain sekaligus,
 * sehingga tanpa penyaringan domain yang tidak diminta job (mis. "Innovation &
 * Digital Business" pada lowongan Data Analyst) ikut terbawa.
 */
export function contextualTopSkills(
  contributions: CLOContribution[],
  mustHave: string[],
  limit = 2
): string[] {
  const mustSet = new Set(mustHave);
  const ranked = contributions
    .filter((c) => c.is_must_have && c.shap_weighted > 0)
    .sort((a, b) => b.shap_weighted - a.shap_weighted);

  const out: string[] = [];
  for (const clo of ranked) {
    for (const domain of clo.skill_domain) {
      if (!mustSet.has(domain) || out.includes(domain)) continue;
      out.push(domain);
      if (out.length >= limit) return out;
    }
  }
  return out;
}
