import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { errorMessage, getCompanies, getCompanyJobs } from "../api/client";
import CompanySelect from "../components/CompanySelect";
import ErrorBox from "../components/ErrorBox";
import { BlockSkeleton } from "../components/LoadingSkeleton";
import MustHaveChip from "../components/MustHaveChip";
import SectionHead from "../components/SectionHead";
import type { Company, Job, SearchHistoryItem } from "../types";
import { addToHistory, clearHistory, getHistory } from "../utils/history";

const STATS = [
  { value: "1.884", label: "Lowongan" },
  { value: "300", label: "Kandidat" },
  { value: "24", label: "Skill domain" },
  { value: "325", label: "Capaian CLO" },
];

export default function HomePage() {
  const navigate = useNavigate();

  const [companies, setCompanies] = useState<Company[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(false);

  const [history, setHistory] = useState<SearchHistoryItem[]>(getHistory());

  useEffect(() => {
    getCompanies()
      .then(setCompanies)
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoadingCompanies(false));
  }, []);

  const pickCompany = (company: string) => {
    setSelectedCompany(company);
    setJobs([]);
    setLoadingJobs(true);
    setError(null);
    getCompanyJobs(company)
      .then(setJobs)
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoadingJobs(false));
  };

  const pickJob = (job: Job) => {
    setHistory(addToHistory(job));
    navigate(`/results/${job.job_id}`);
  };

  return (
    <div className="page-enter">
      {/* Hero + Langkah 1 */}
      <section className="bg-navy-deep text-white relative">
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.06] pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)",
            backgroundSize: "64px 64px",
          }}
        />
        <div className="max-w-6xl mx-auto px-4 pt-14 pb-12 relative grid lg:grid-cols-12 gap-10">
          <div className="lg:col-span-7">
            <p className="text-xs font-medium tracking-wide text-teal mb-4">
              Sistem rekomendasi kandidat — PRSDI BRIN
            </p>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
              Temukan kandidat terbaik,
              <br />
              lengkap dengan <span className="text-teal">alasannya</span>.
            </h1>
            <p className="text-navy-mist max-w-xl mb-8 text-base leading-relaxed">
              Pilih perusahaan, lalu pilih posisi yang ingin diisi. Lima agent AI menilai
              300 mahasiswa berbasis capaian pembelajaran (OBE) dan menjelaskan setiap
              rekomendasi hingga level mata kuliah.
            </p>

            <div className="max-w-xl">
              <label className="block text-sm font-medium text-white mb-2">
                Langkah 1 — Pilih perusahaan
              </label>
              {loadingCompanies ? (
                <div
                  className="h-[52px] rounded-md bg-white/10 animate-pulse"
                  aria-label="Memuat daftar perusahaan"
                />
              ) : (
                <CompanySelect
                  companies={companies}
                  value={selectedCompany}
                  onChange={pickCompany}
                />
              )}
              <p className="mt-2 text-xs text-navy-mist">
                {loadingCompanies
                  ? "Memuat…"
                  : `${companies.length.toLocaleString("id-ID")} perusahaan tersedia — ketik untuk menyaring`}
              </p>
            </div>
          </div>

          {/* Statistik dataset */}
          <div className="lg:col-span-5 lg:pl-8 lg:border-l lg:border-white/10 flex items-end">
            <dl className="w-full grid grid-cols-2 gap-x-8 gap-y-6">
              {STATS.map((s) => (
                <div key={s.label}>
                  <dd className="num text-2xl font-semibold text-white">{s.value}</dd>
                  <dt className="text-xs text-navy-mist mt-0.5">{s.label}</dt>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 py-10 space-y-12">
        {error && <ErrorBox message={error} />}

        {/* Langkah 2 */}
        <section aria-labelledby="jobs-heading">
          <SectionHead
            id="jobs-heading"
            title={
              selectedCompany
                ? `Langkah 2 — Lowongan di ${selectedCompany}`
                : "Langkah 2 — Pilih lowongan"
            }
            hint={
              selectedCompany && !loadingJobs
                ? `${jobs.length} lowongan`
                : undefined
            }
          />

          {!selectedCompany ? (
            <div className="rounded-lg border border-dashed border-line-strong bg-white/60 p-12 text-center">
              <p className="text-sm text-muted max-w-sm mx-auto">
                Pilih perusahaan terlebih dahulu untuk melihat daftar lowongan yang
                tersedia.
              </p>
            </div>
          ) : loadingJobs ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <BlockSkeleton key={i} height={150} />
              ))}
            </div>
          ) : jobs.length === 0 ? (
            <div className="panel p-12 text-center">
              <p className="text-sm text-muted">Tidak ada lowongan untuk perusahaan ini.</p>
            </div>
          ) : (
            <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {jobs.map((job) => (
                <li key={job.job_id}>
                  <button
                    onClick={() => pickJob(job)}
                    className="group w-full h-full panel p-5 text-left transition-all
                               hover:border-teal-700 hover:shadow-raise
                               flex flex-col gap-2.5 min-h-[150px]"
                  >
                    <span className="microlabel">{job.source}</span>
                    <span className="font-semibold text-navy text-base leading-snug group-hover:text-teal-ink transition-colors">
                      {job.title}
                    </span>
                    <span className="flex flex-wrap gap-1 mt-auto pt-2">
                      {job.must_have.slice(0, 2).map((skill) => (
                        <MustHaveChip key={skill} label={skill} variant="teal" />
                      ))}
                      {job.must_have.length > 2 && (
                        <span className="text-xs text-muted self-center">
                          +{job.must_have.length - 2} lagi
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Riwayat */}
        {history.length > 0 && (
          <section aria-labelledby="history-heading">
            <SectionHead
              id="history-heading"
              title="Pencarian terakhir"
              actions={
                <button
                  onClick={() => {
                    clearHistory();
                    setHistory([]);
                  }}
                  className="text-xs font-medium text-coral-ink hover:underline underline-offset-2"
                >
                  Hapus riwayat
                </button>
              }
            />
            <ul className="flex flex-wrap gap-2">
              {history.map((h) => (
                <li key={h.job_id}>
                  <button
                    onClick={() => navigate(`/results/${h.job_id}`)}
                    className="group px-4 py-2.5 bg-white border border-line rounded-md text-left
                               hover:border-teal-700 transition-colors"
                  >
                    <span className="block text-sm font-medium text-navy group-hover:text-teal-ink transition-colors">
                      {h.title}
                    </span>
                    <span className="block text-xs text-muted">{h.company}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
