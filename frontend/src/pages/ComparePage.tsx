import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { errorMessage, getCandidate, getJob, postMatching } from "../api/client";
import Breadcrumb from "../components/Breadcrumb";
import ErrorBox from "../components/ErrorBox";
import HealthBadge from "../components/HealthBadge";
import { BlockSkeleton } from "../components/LoadingSkeleton";
import ScoreBadge from "../components/ScoreBadge";
import SkillRadar, { type RadarSeries } from "../components/SkillRadar";
import type { CandidateProfile, Job, MustHaveHealth } from "../types";

// Kandidat 1 teal, 2 purple, 3 amber
const COLORS = ["#00A896", "#534AB7", "#F2A007"];

interface MatchInfo {
  score: number;
  health: MustHaveHealth | null;
}

export default function ComparePage() {
  const [searchParams] = useSearchParams();
  const jobId = searchParams.get("job");
  const nims = useMemo(
    () =>
      (searchParams.get("nims") ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 3),
    [searchParams]
  );

  const [profiles, setProfiles] = useState<CandidateProfile[]>([]);
  const [job, setJob] = useState<Job | null>(null);
  const [matchInfo, setMatchInfo] = useState<Record<string, MatchInfo>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (nims.length < 2) {
      setError("Pilih minimal 2 kandidat untuk dibandingkan.");
      setLoading(false);
      return;
    }
    setLoading(true);

    const tasks: Promise<unknown>[] = [
      Promise.all(nims.map((nim) => getCandidate(nim))).then(setProfiles),
    ];
    if (jobId) {
      // Skill relevan job untuk filter radar
      tasks.push(
        getJob(jobId)
          .then(setJob)
          .catch(() => undefined)
      );
      // Cosine score + kondisi skill wajib per kandidat (hasil pipeline di-cache)
      tasks.push(
        postMatching(jobId, 20)
          .then((m) => {
            const info: Record<string, MatchInfo> = {};
            for (const c of m.candidates) {
              info[c.nim] = { score: c.score, health: c.must_have_health };
            }
            setMatchInfo(info);
          })
          .catch(() => undefined)
      );
    }

    Promise.all(tasks)
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false));
  }, [nims, jobId]);

  const series: RadarSeries[] = useMemo(
    () =>
      profiles.map((p, i) => ({
        key: p.nim,
        name: matchInfo[p.nim]
          ? `${p.nim} · ${matchInfo[p.nim].score.toFixed(4)}`
          : p.nim,
        color: COLORS[i],
        skillVector: p.skill_vector,
      })),
    [profiles, matchInfo]
  );

  const domains = useMemo(
    () => (profiles.length > 0 ? Object.keys(profiles[0].skill_vector) : []),
    [profiles]
  );

  if (error) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-10 page-enter">
        <ErrorBox
          message={error}
          backTo={jobId ? `/results/${jobId}` : "/"}
          backLabel="Kembali"
        />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6 page-enter">
      <Breadcrumb
        items={[
          { label: "Beranda", to: "/" },
          ...(jobId ? [{ label: job?.title ?? "Hasil matching", to: `/results/${jobId}` }] : []),
          { label: "Bandingkan kandidat" },
        ]}
      />

      <header className="border-b border-line pb-4">
        <h1 className="h-page">Perbandingan kandidat</h1>
        <p className="text-sm text-muted mt-1">
          Nilai tertinggi per skill domain disorot pada tabel.
        </p>
      </header>

      {loading ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {nims.map((n) => (
              <BlockSkeleton key={n} height={120} />
            ))}
          </div>
          <BlockSkeleton height={420} />
        </>
      ) : (
        <>
          {/* Kartu ringkas per kandidat */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {profiles.map((p, i) => (
              <div key={p.nim} className="panel p-5">
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: COLORS[i] }}
                    aria-hidden
                  />
                  <p className="num text-base font-semibold text-navy">{p.nim}</p>
                </div>
                <p className="text-xs text-muted mb-2">
                  {p.kampus.replace("Telkom University ", "TelU ")}
                </p>
                {matchInfo[p.nim] && (
                  <p className="text-xs text-muted mb-2">
                    Skor kecocokan{" "}
                    <span className="num font-semibold text-navy">
                      {matchInfo[p.nim].score.toFixed(4)}
                    </span>
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-muted">Rata-rata</span>
                  <ScoreBadge score={p.avg_score} />
                  <HealthBadge health={matchInfo[p.nim]?.health ?? null} />
                </div>
                {jobId && (
                  <Link to={`/candidate/${p.nim}?job=${jobId}`} className="btn-ghost -ml-3 mt-2">
                    Lihat Detail →
                  </Link>
                )}
              </div>
            ))}
          </div>

          {/* Radar overlay dengan filter relevansi */}
          <section className="panel p-6" aria-label="Radar skill overlay">
            <h2 className="h-section mb-1">Radar skill — overlay</h2>
            <p className="text-xs text-muted mb-4">
              Bandingkan {profiles.length} kandidat pada skill yang relevan dengan job.
            </p>
            <SkillRadar
              series={series}
              mustHave={job?.must_have ?? []}
              niceToHave={job?.nice_to_have ?? []}
              size={420}
            />
          </section>

          {/* Tabel side-by-side */}
          <section className="panel overflow-x-auto" aria-label="Tabel perbandingan skill">
            <table className="w-full text-left text-sm">
              <thead>
                <tr>
                  <th className="th">Skill domain</th>
                  {profiles.map((p, i) => (
                    <th key={p.nim} className="th-num">
                      <span className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-navy">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: COLORS[i] }}
                          aria-hidden
                        />
                        {p.nim}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {domains.map((domain, ri) => {
                  const values = profiles.map((p) => p.skill_vector[domain] ?? 0);
                  const max = Math.max(...values);
                  const isMust = (job?.must_have ?? []).includes(domain);
                  const isNice = (job?.nice_to_have ?? []).includes(domain);
                  return (
                    <tr
                      key={domain}
                      className={`border-b border-line/70 last:border-0 ${
                        isMust ? "bg-[#E8FAF7]" : isNice ? "bg-[#FFF8E7]" : ri % 2 === 0 ? "bg-ice/25" : "bg-white"
                      }`}
                    >
                      <td className="px-4 py-2">
                        <span className={isMust ? "font-semibold" : ""}>{domain}</span>
                        {isMust && (
                          <span className="ml-2 text-xs font-medium text-teal-ink border border-teal/40 rounded px-1.5 py-px">
                            must-have
                          </span>
                        )}
                      </td>
                      {profiles.map((p) => {
                        const v = p.skill_vector[domain] ?? 0;
                        const isMax = v === max;
                        return (
                          <td
                            key={p.nim}
                            className={`px-4 py-2 num text-right ${
                              isMax ? "font-semibold text-teal-ink bg-teal/[0.08]" : "text-navy/75"
                            }`}
                          >
                            {v.toFixed(4)}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        </>
      )}
    </div>
  );
}
