import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import * as XLSX from "xlsx";
import {
  errorMessage,
  getJobDescription,
  getMatchingStatus,
  postMatching,
} from "../api/client";
import Breadcrumb from "../components/Breadcrumb";
import CandidateCard from "../components/CandidateCard";
import ErrorBox from "../components/ErrorBox";
import MustHaveChip from "../components/MustHaveChip";
import NarrativeBox from "../components/NarrativeBox";
import PipelineProgress from "../components/PipelineProgress";
import type { MatchResult } from "../types";
import { contextualTopSkills } from "../utils/clo";
import { formatNumber } from "../utils/format";

const MAX_COMPARE = 3;

export default function ResultPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();

  const [topN, setTopN] = useState(10);
  const [result, setResult] = useState<MatchResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pipelineStep, setPipelineStep] = useState(0);
  const [selectedKampus, setSelectedKampus] = useState("all");
  const [selectedNims, setSelectedNims] = useState<string[]>([]);
  const [showLog, setShowLog] = useState(false);
  const [showJd, setShowJd] = useState(false);
  const [jd, setJd] = useState<string | null>(null);
  const [jdError, setJdError] = useState<string | null>(null);
  const [jdLoading, setJdLoading] = useState(false);
  const pollRef = useRef<number | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current !== null) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!jobId) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setPipelineStep(0);
    setShowJd(false);
    setJd(null);
    setJdError(null);

    pollRef.current = window.setInterval(async () => {
      try {
        const s = await getMatchingStatus(jobId);
        if (s.status === "running") setPipelineStep(s.current_step);
        else if (s.status === "done") setPipelineStep(5);
      } catch {
        // abaikan error polling
      }
    }, 700);

    postMatching(jobId, topN)
      .then((res) => {
        if (res.status === "error") {
          setError(res.error || "Pipeline gagal tanpa pesan error.");
        } else {
          setResult(res);
        }
      })
      .catch((err) => setError(errorMessage(err)))
      .finally(() => {
        stopPolling();
        setLoading(false);
      });

    return stopPolling;
  }, [jobId, topN, stopPolling]);

  const kampusList = useMemo(
    () => [...new Set((result?.candidates ?? []).map((c) => c.kampus))].sort(),
    [result]
  );

  const filteredCandidates = useMemo(
    () =>
      (result?.candidates ?? []).filter(
        (c) => selectedKampus === "all" || c.kampus === selectedKampus
      ),
    [result, selectedKampus]
  );

  // Skill unggulan per kandidat: skill WAJIB dengan kontribusi SHAP tertinggi,
  // bukan nilai absolut tertinggi yang belum tentu relevan dengan job ini.
  const skillsByNim = useMemo(() => {
    const map: Record<string, string[]> = {};
    if (!result) return map;
    for (const [nim, xai] of Object.entries(result.xai_results)) {
      const clo = [...xai.top_positive_clo, ...xai.top_negative_clo];
      map[nim] = contextualTopSkills(clo, result.must_have, 2);
    }
    return map;
  }, [result]);

  const toggleJd = () => {
    const next = !showJd;
    setShowJd(next);
    if (next && jd === null && !jdLoading && jobId) {
      setJdLoading(true);
      setJdError(null);
      getJobDescription(jobId)
        .then(setJd)
        .catch((err) => setJdError(errorMessage(err)))
        .finally(() => setJdLoading(false));
    }
  };

  const toggleSelect = (nim: string) => {
    setSelectedNims((prev) =>
      prev.includes(nim)
        ? prev.filter((n) => n !== nim)
        : prev.length < MAX_COMPARE
          ? [...prev, nim]
          : prev
    );
  };

  const exportRows = () =>
    filteredCandidates.map((c) => ({
      Rank: c.rank,
      NIM: c.nim,
      Kampus: c.kampus,
      Score: c.score,
      "Top Skill 1": (skillsByNim[c.nim]?.[0] ?? c.top_skills[0]) ?? "",
      "Top Skill 2": (skillsByNim[c.nim]?.[1] ?? c.top_skills[1]) ?? "",
      "Passes Must Have": c.passes_must_have ? "Ya" : "Tidak",
    }));

  const exportFileName = (ext: string) => {
    const title = (result?.title ?? "job").replace(/[^a-zA-Z0-9]+/g, "_");
    const date = new Date().toISOString().slice(0, 10);
    return `kandidat_top${topN}_${title}_${date}.${ext}`;
  };

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(exportRows());
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Kandidat");
    XLSX.writeFile(wb, exportFileName("xlsx"));
  };

  const exportCsv = () => {
    const ws = XLSX.utils.json_to_sheet(exportRows());
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = exportFileName("csv");
    a.click();
    URL.revokeObjectURL(a.href);
  };

  if (error) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-10 page-enter">
        <ErrorBox message={error} />
      </div>
    );
  }

  const passCount = filteredCandidates.filter((c) => c.passes_must_have).length;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6 page-enter">
      <Breadcrumb
        items={[
          { label: "Beranda", to: "/" },
          { label: result?.title ?? "Menjalankan pipeline…" },
        ]}
      />

      {loading && <PipelineProgress currentStep={pipelineStep} />}

      {/* Ringkasan job */}
      {result && !loading && (
        <header className="panel p-6">
          <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
            <div className="min-w-0">
              <h1 className="h-page">{result.title}</h1>
              <p className="text-sm text-muted mt-1">
                {result.company}
                <span className="mx-2 text-line-strong" aria-hidden>·</span>
                <span className="font-mono text-xs">{jobId}</span>
              </p>
            </div>
            <dl className="flex gap-6 shrink-0">
              <div>
                <dt className="microlabel">Dievaluasi</dt>
                <dd className="num text-lg font-semibold text-navy">
                  {formatNumber(result.n_candidates)}
                </dd>
              </div>
              <div>
                <dt className="microlabel">Tidak lolos filter</dt>
                <dd className="num text-lg font-semibold text-navy">
                  {formatNumber(result.n_filtered)}
                </dd>
              </div>
            </dl>
          </div>

          <div className="grid sm:grid-cols-2 gap-x-8 gap-y-4 mt-5 pt-5 border-t border-line">
            <div>
              <p className="microlabel mb-2">Skill wajib (must have)</p>
              <div className="flex flex-wrap gap-1.5">
                {result.must_have.length > 0 ? (
                  result.must_have.map((s) => <MustHaveChip key={s} label={s} variant="teal" />)
                ) : (
                  <span className="text-sm text-muted">—</span>
                )}
              </div>
            </div>
            <div>
              <p className="microlabel mb-2">Skill pendukung (nice to have)</p>
              <div className="flex flex-wrap gap-1.5">
                {result.nice_to_have.length > 0 ? (
                  result.nice_to_have.map((s) => (
                    <MustHaveChip key={s} label={s} variant="amber" />
                  ))
                ) : (
                  <span className="text-sm text-muted">—</span>
                )}
              </div>
            </div>
          </div>

          {/* Job description — collapsed by default */}
          <div className="mt-5 pt-4 border-t border-line">
            <button
              onClick={toggleJd}
              aria-expanded={showJd}
              aria-controls="job-description"
              className="inline-flex items-center gap-2 text-sm font-medium text-navy
                         hover:text-teal-ink transition-colors"
            >
              <span aria-hidden>📄</span>
              Lihat job description
              <span aria-hidden className={`transition-transform ${showJd ? "rotate-180" : ""}`}>
                ▾
              </span>
            </button>

            {showJd && (
              <div
                id="job-description"
                className="mt-3 rounded-md p-4 text-[14px] leading-relaxed text-navy/90
                           max-h-[300px] overflow-y-auto whitespace-pre-line"
                style={{ background: "#F7F9FC", border: "1px solid #D1DCF8" }}
              >
                {jdLoading && <p className="text-muted">Memuat job description…</p>}
                {jdError && <p className="text-coral-ink">{jdError}</p>}
                {jd && jd}
              </div>
            )}
          </div>

          {result.execution_log.length > 0 && (
            <div className="mt-5 pt-4 border-t border-line">
              <button
                onClick={() => setShowLog((v) => !v)}
                className="text-xs font-medium text-teal-ink hover:underline underline-offset-2"
                aria-expanded={showLog}
              >
                {showLog ? "Sembunyikan" : "Tampilkan"} log eksekusi pipeline
              </button>
              {showLog && (
                <ul className="mt-3 bg-navy-deep text-navy-mist rounded-md p-4 space-y-1 font-mono text-xs overflow-x-auto">
                  {result.execution_log.map((line, i) => (
                    <li key={i} className="whitespace-nowrap">
                      {line}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </header>
      )}

      {result?.narrative && !loading && <NarrativeBox text={result.narrative} />}

      {/* Kendali tabel */}
      {result && !loading && (
        <div className="flex flex-wrap items-end gap-x-5 gap-y-3">
          <div>
            <label htmlFor="topn" className="field-label !mb-1 text-xs text-muted">
              Jumlah kandidat
            </label>
            <select
              id="topn"
              value={topN}
              onChange={(e) => setTopN(Number(e.target.value))}
              className="field !w-auto !py-1.5"
            >
              <option value={5}>Top 5</option>
              <option value={10}>Top 10</option>
              <option value={20}>Top 20</option>
            </select>
          </div>

          <div>
            <label htmlFor="kampus" className="field-label !mb-1 text-xs text-muted">
              Kampus
            </label>
            <select
              id="kampus"
              value={selectedKampus}
              onChange={(e) => setSelectedKampus(e.target.value)}
              className="field !w-auto !py-1.5"
            >
              <option value="all">Semua kampus</option>
              {kampusList.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </div>

          <div className="ml-auto flex gap-2">
            <button
              onClick={exportExcel}
              disabled={filteredCandidates.length === 0}
              className="btn-primary !py-2"
            >
              Export Excel
            </button>
            <button
              onClick={exportCsv}
              disabled={filteredCandidates.length === 0}
              className="btn-secondary !py-2"
            >
              Export CSV
            </button>
          </div>
        </div>
      )}

      {/* Tabel kandidat */}
      {result && !loading && (
        <section className="panel overflow-hidden" aria-label="Tabel kandidat">
          <div className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-3 border-b border-line">
            <h2 className="h-section">Kandidat teratas</h2>
            <p className="text-xs text-muted">
              <span className="num">{filteredCandidates.length}</span> ditampilkan ·{" "}
              <span className="num">{passCount}</span> memenuhi seluruh must-have
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr>
                  <th className="th pl-4 pr-2 w-10">
                    <span className="sr-only">Pilih</span>
                  </th>
                  <th className="th">Rank</th>
                  <th className="th">NIM</th>
                  <th className="th">Kampus</th>
                  <th className="th">Score &amp; skill wajib</th>
                  <th className="th hidden md:table-cell">Skill unggulan</th>
                  <th className="th text-right pr-4">
                    <span className="sr-only">Aksi</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredCandidates.map((c) => (
                  <CandidateCard
                    key={c.nim}
                    candidate={c}
                    jobId={jobId!}
                    contextualSkills={skillsByNim[c.nim]}
                    selected={selectedNims.includes(c.nim)}
                    onToggleSelect={toggleSelect}
                    selectionDisabled={selectedNims.length >= MAX_COMPARE}
                  />
                ))}
                {filteredCandidates.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-sm text-muted">
                      Tidak ada kandidat untuk filter yang dipilih.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2.5 border-t border-line text-xs text-muted space-y-1">
            <p>Centang 2–3 kandidat untuk membandingkan profil kompetensinya.</p>
            <p>
              Skill unggulan menampilkan skill <em>wajib</em> dengan kontribusi SHAP
              tertinggi untuk job ini; teks abu-abu berarti SHAP belum dihitung sehingga
              yang tampil adalah kekuatan umum kandidat.
            </p>
            <p>
              Indikator skill wajib: <span aria-hidden>🟢</span> semua di atas rata-rata ·{" "}
              <span aria-hidden>🟡</span> 1–2 di bawah rata-rata ·{" "}
              <span aria-hidden>🔴</span> mayoritas di bawah rata-rata. Hanya tersedia
              untuk kandidat yang dihitung SHAP (Top-3).
            </p>
          </div>
        </section>
      )}

      {/* Aksi banding */}
      {selectedNims.length >= 2 && (
        <div className="sticky bottom-4 flex justify-center">
          <button
            onClick={() => navigate(`/compare?nims=${selectedNims.join(",")}&job=${jobId}`)}
            className="btn-primary !bg-navy hover:!bg-navy-deep shadow-raise !px-7 !py-3"
          >
            Bandingkan {selectedNims.length} kandidat &rarr;
          </button>
        </div>
      )}
    </div>
  );
}
