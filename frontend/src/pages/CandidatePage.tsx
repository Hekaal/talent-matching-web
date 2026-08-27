import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { errorMessage, getCandidate, getJob, getXai, postMatching } from "../api/client";
import Breadcrumb from "../components/Breadcrumb";
import ErrorBox from "../components/ErrorBox";
import { BlockSkeleton } from "../components/LoadingSkeleton";
import MustHaveChip from "../components/MustHaveChip";
import NarrativeBox from "../components/NarrativeBox";
import ScoreBadge from "../components/ScoreBadge";
import ShapChart from "../components/ShapChart";
import SkillRadar from "../components/SkillRadar";
import type { CandidateProfile, CLOContribution, Job, XAIResult } from "../types";
import { groupCloByMataKuliah } from "../utils/clo";

export default function CandidatePage() {
  const { nim } = useParams<{ nim: string }>();
  const [searchParams] = useSearchParams();
  const jobId = searchParams.get("job");

  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [xai, setXai] = useState<XAIResult | null>(null);
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [xaiError, setXaiError] = useState<string | null>(null);
  const [passesMustHave, setPassesMustHave] = useState<boolean | null>(null);

  useEffect(() => {
    if (!nim) return;
    setLoading(true);
    setError(null);
    setXaiError(null);
    setXai(null);
    setJob(null);

    const tasks: Promise<void>[] = [getCandidate(nim).then(setProfile)];
    if (jobId) {
      tasks.push(
        getXai(nim, jobId)
          .then(setXai)
          .catch((err) => setXaiError(errorMessage(err)))
      );
      tasks.push(
        getJob(jobId)
          .then(setJob)
          .catch(() => undefined)
      );
      tasks.push(
        postMatching(jobId, 10)
          .then((m) => {
            const found = m.candidates.find((c) => c.nim === nim);
            setPassesMustHave(found ? found.passes_must_have : null);
          })
          .catch(() => undefined)
      );
    }

    Promise.all(tasks)
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false));
  }, [nim, jobId]);

  if (error) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-10 page-enter">
        <ErrorBox message={error} />
      </div>
    );
  }

  const allClo: CLOContribution[] = xai
    ? [...xai.top_positive_clo, ...xai.top_negative_clo]
    : [];
  // Tabel dikelompokkan per mata kuliah: nilai dirata-rata, SHAP dijumlahkan
  const cloGroups = groupCloByMataKuliah(
    allClo,
    job?.must_have ?? [],
    job?.nice_to_have ?? []
  );

  // Kekuatan / area perhatian kontekstual terhadap job — hanya dari CLO yang
  // mendukung skill WAJIB, diurutkan pakai SHAP terbobot (shap x bobot job).
  const uniqueMk = (items: CLOContribution[]) => {
    const seen = new Set<string>();
    const out: CLOContribution[] = [];
    for (const c of items) {
      if (seen.has(c.mata_kuliah)) continue;
      seen.add(c.mata_kuliah);
      out.push(c);
    }
    return out;
  };
  const mustClo = allClo.filter((c) => c.is_must_have);
  const strengthClo = uniqueMk(
    mustClo
      .filter((c) => c.shap_weighted > 0)
      .sort((a, b) => b.shap_weighted - a.shap_weighted)
  ).slice(0, 3);
  const weakMustClo = allClo.filter((c) => c.is_weak_must);
  const attentionClo = uniqueMk(
    [...weakMustClo].sort((a, b) => a.shap_weighted - b.shap_weighted)
  ).slice(0, 3);
  const weakMustCount = weakMustClo.length;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6 page-enter">
      <Breadcrumb
        items={[
          { label: "Beranda", to: "/" },
          ...(jobId
            ? [{ label: job?.title ?? "Hasil matching", to: `/results/${jobId}` }]
            : []),
          { label: `Kandidat ${nim}` },
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Kolom kiri */}
        <div className="lg:col-span-2 space-y-6">
          <section className="panel p-6">
            {loading || !profile ? (
              <BlockSkeleton height={116} />
            ) : (
              <div className="flex items-center gap-4">
                <div
                  className="w-14 h-14 rounded-md bg-navy text-white grid place-items-center
                             font-mono text-lg font-semibold shrink-0"
                  aria-hidden
                >
                  {profile.nim.slice(-2)}
                </div>
                <div className="min-w-0">
                  <h1 className="num text-lg font-semibold text-navy leading-tight">
                    {profile.nim}
                  </h1>
                  <p className="text-sm text-muted mb-2">{profile.kampus}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted">Rata-rata capaian</span>
                    <ScoreBadge score={profile.avg_score} label="Rata-rata capaian" />
                  </div>
                </div>
              </div>
            )}
          </section>

          <section className="panel p-6" aria-label="Profil kompetensi">
            <h2 className="h-section mb-1">Profil kompetensi</h2>
            <p className="text-xs text-muted mb-4">Nilai per skill domain, skala 0–1.</p>
            {loading || !profile ? (
              <BlockSkeleton height={300} />
            ) : (
              <SkillRadar
                skillVector={profile.skill_vector}
                mustHave={job?.must_have ?? []}
                niceToHave={job?.nice_to_have ?? []}
                size={300}
              />
            )}
          </section>

          {profile && !loading && (
            <section className="panel p-6 space-y-5">
              {jobId && xai ? (
                <>
                  {weakMustCount > 0 && (
                    <div
                      className="rounded-md border p-4"
                      style={{ background: "#FFF8E7", borderColor: "#F2A007" }}
                      role="note"
                    >
                      <p className="text-sm font-semibold text-amber-ink mb-1">
                        <span aria-hidden>⚠️</span> Perlu pendalaman saat wawancara
                      </p>
                      <p className="text-sm text-navy/85 leading-relaxed">
                        Kandidat ini memiliki {weakMustCount} capaian pada skill wajib yang
                        berada di bawah rata-rata kandidat lain. Pertimbangkan untuk menggali
                        lebih dalam di sesi wawancara.
                      </p>
                    </div>
                  )}

                  <div>
                    <h2 className="h-section text-base mb-1">Kekuatan untuk job ini</h2>
                    <p className="text-xs text-muted mb-3">
                      CLO skill wajib dengan kontribusi terbobot terbesar.
                    </p>
                    {strengthClo.length > 0 ? (
                      <ul className="space-y-2">
                        {strengthClo.map((c) => (
                          <li key={c.mata_kuliah} className="flex items-baseline gap-2.5">
                            <span
                              className="w-1.5 h-1.5 rounded-full bg-teal shrink-0 translate-y-[-2px]"
                              aria-hidden
                            />
                            <span className="text-sm text-navy flex-1 leading-snug">
                              {c.mata_kuliah}
                            </span>
                            <span
                              className="num text-xs text-teal-ink shrink-0"
                              title={`SHAP terbobot ${c.shap_weighted.toFixed(6)} (mentah ${c.shap_value.toFixed(6)} x bobot ${c.job_weight})`}
                            >
                              +{c.shap_weighted.toFixed(4)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-muted">
                        Tidak ada CLO skill wajib dengan kontribusi positif.
                      </p>
                    )}
                  </div>
                  <div className="border-t border-line pt-5">
                    <h2 className="h-section text-base mb-1">
                      Area perhatian untuk job ini
                    </h2>
                    <p className="text-xs text-muted mb-3">
                      CLO skill wajib yang berada di bawah rata-rata kandidat lain.
                    </p>
                    {attentionClo.length > 0 ? (
                      <ul className="space-y-2">
                        {attentionClo.map((c) => (
                          <li key={c.mata_kuliah} className="flex items-baseline gap-2.5">
                            <span
                              className="w-1.5 h-1.5 rounded-full bg-coral shrink-0 translate-y-[-2px]"
                              aria-hidden
                            />
                            <span className="text-sm text-navy flex-1 leading-snug">
                              {c.mata_kuliah}
                            </span>
                            <span
                              className="num text-xs text-coral-ink shrink-0"
                              title={`SHAP terbobot ${c.shap_weighted.toFixed(6)} (mentah ${c.shap_value.toFixed(6)} x bobot ${c.job_weight})`}
                            >
                              {c.shap_weighted.toFixed(4)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-muted">
                        Semua capaian pada skill wajib berada di atas rata-rata kandidat lain.
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <h2 className="h-section text-base mb-3">Skill terkuat</h2>
                    <div className="flex flex-wrap gap-1.5">
                      {profile.top_skills.map((s) => (
                        <MustHaveChip key={s} label={s} variant="teal" />
                      ))}
                    </div>
                  </div>
                  <div className="border-t border-line pt-5">
                    <h2 className="h-section text-base mb-3">Skill terlemah</h2>
                    <div className="flex flex-wrap gap-1.5">
                      {profile.weak_skills.map((s) => (
                        <MustHaveChip key={s} label={s} variant="coral" />
                      ))}
                    </div>
                  </div>
                </>
              )}
            </section>
          )}
        </div>

        {/* Kolom kanan */}
        <div className="lg:col-span-3 space-y-6">
          {loading ? (
            <>
              <BlockSkeleton height={96} />
              <BlockSkeleton height={420} />
            </>
          ) : !jobId ? (
            <div className="panel p-6">
              <p className="text-sm text-muted">
                Buka kandidat dari halaman hasil matching untuk melihat penjelasan XAI
                terhadap job tertentu.
              </p>
            </div>
          ) : xai ? (
            <>
              <section
                className="panel grid grid-cols-3 divide-x divide-line"
                aria-label="Ringkasan skor"
              >
                <div className="px-5 py-4">
                  <p className="microlabel mb-1">Cosine score</p>
                  <p className="num text-xl font-semibold text-teal-ink">
                    {xai.score.toFixed(4)}
                  </p>
                </div>
                <div className="px-5 py-4">
                  <p className="microlabel mb-1">Base value</p>
                  <p className="num text-xl font-semibold text-navy">
                    {xai.base_value.toFixed(4)}
                  </p>
                </div>
                <div className="px-5 py-4">
                  <p className="microlabel mb-1">Filter must-have</p>
                  {passesMustHave === null ? (
                    <p className="num text-xl font-semibold text-muted">—</p>
                  ) : passesMustHave ? (
                    <p className="text-xl font-semibold text-teal-ink">Lolos</p>
                  ) : (
                    <p className="text-xl font-semibold text-coral-ink">Tidak lolos</p>
                  )}
                </div>
              </section>

              <section className="panel p-6" aria-label="Kontribusi CLO">
                <div className="flex items-baseline justify-between gap-3 mb-1">
                  <h2 className="h-section">Kontribusi CLO terhadap skor</h2>
                  <span className="microlabel shrink-0">KernelSHAP</span>
                </div>
                <p className="text-xs text-muted mb-5">
                  Sepuluh CLO paling berpengaruh. Batang{" "}
                  <span className="text-teal-ink font-medium">teal</span> menaikkan skor,{" "}
                  <span className="text-coral-ink font-medium">coral</span> menurunkan.
                </p>
                <ShapChart contributions={allClo} height={400} />
              </section>

              <section className="panel overflow-hidden" aria-label="Rincian mata kuliah">
                <div className="px-4 py-3 border-b border-line">
                  <h2 className="h-section">Rincian per mata kuliah</h2>
                  <p className="text-xs text-muted mt-0.5">
                    Nilai dirata-ratakan, kontribusi SHAP dijumlahkan per mata kuliah.
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr>
                        <th className="th">Mata kuliah</th>
                        <th className="th-num">Nilai</th>
                        <th className="th-num">Bobot job</th>
                        <th className="th-num pr-4">SHAP</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cloGroups.map((g) => (
                        <tr
                          key={g.mata_kuliah}
                          className={`border-b border-line/70 last:border-0 ${
                            g.relevance === "must"
                              ? "bg-[#E8FAF7]"
                              : g.relevance === "nice"
                                ? "bg-[#FFF8E7]"
                                : "bg-white"
                          }`}
                        >
                          <td className="px-4 py-2.5">
                            <span className={g.relevance === "must" ? "font-semibold" : ""}>
                              {g.mata_kuliah}
                            </span>
                            <span className="num text-xs text-muted ml-2">
                              {g.clo_ids.length} CLO
                            </span>
                            {g.relevance === "must" && (
                              <span className="ml-2 text-xs font-medium text-teal-ink border border-teal/40 rounded px-1.5 py-px">
                                must-have
                              </span>
                            )}
                            {g.relevance === "nice" && (
                              <span className="ml-2 text-xs font-medium text-amber-ink border border-amber/50 rounded px-1.5 py-px">
                                nice-to-have
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 num text-right">
                            {g.nilai_avg.toFixed(2)}
                          </td>
                          <td className="px-4 py-2.5 num text-right text-muted">
                            {g.job_weight}
                          </td>
                          <td
                            className={`px-4 pr-4 py-2.5 num text-right font-semibold ${
                              g.shap_sum >= 0 ? "text-teal-ink" : "text-coral-ink"
                            }`}
                          >
                            {g.shap_sum >= 0 ? "+" : ""}
                            {g.shap_sum.toFixed(6)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <NarrativeBox title="Penjelasan untuk HRD" text={xai.explanation_text} />
            </>
          ) : (
            <div className="panel border-l-[3px] border-l-amber p-5">
              <h2 className="text-sm font-semibold text-amber-ink mb-1.5">
                Penjelasan XAI tidak tersedia
              </h2>
              <p className="text-sm text-navy/85">
                {xaiError ?? "XAI hanya dihitung untuk sebagian kombinasi job-kandidat."}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
