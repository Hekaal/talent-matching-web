import { Link, Route, Routes, useLocation } from "react-router-dom";
import CandidatePage from "./pages/CandidatePage";
import ComparePage from "./pages/ComparePage";
import CreateJobPage from "./pages/CreateJobPage";
import HomePage from "./pages/HomePage";
import ResultPage from "./pages/ResultPage";

const NAV = [
  { to: "/", label: "Cari Kandidat", match: (p: string) => p === "/" || p.startsWith("/results") },
  { to: "/jobs/create", label: "Tambah Job", match: (p: string) => p.startsWith("/jobs/create") },
];

export default function App() {
  const { pathname } = useLocation();

  return (
    <div className="min-h-screen flex flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:top-2 focus:left-2
                   focus:bg-white focus:px-3 focus:py-2 focus:rounded-md focus:text-sm focus:shadow-raise"
      >
        Langsung ke konten
      </a>

      <header className="bg-navy-deep text-white sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <Link
            to="/"
            className="flex items-center gap-3 group shrink-0"
            aria-label="Beranda Talent Matching System"
          >
            <span
              className="w-9 h-9 rounded-md bg-teal grid place-items-center font-mono
                         font-semibold text-sm text-navy-deep select-none"
              aria-hidden
            >
              TM
            </span>
            <span className="leading-tight">
              <span className="block font-semibold text-base tracking-tight group-hover:text-teal transition-colors">
                Talent Matching System
              </span>
              <span className="hidden sm:block text-xs text-navy-mist">
                Berbasis OBE · Multi-Agent AI &amp; Explainable AI
              </span>
            </span>
          </Link>

          <nav aria-label="Navigasi utama" className="flex items-center gap-1">
            {NAV.map((item) => {
              const active = item.match(pathname);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  aria-current={active ? "page" : undefined}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    active
                      ? "text-white bg-white/[0.12]"
                      : "text-navy-mist hover:text-white hover:bg-white/[0.07]"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="h-px bg-gradient-to-r from-teal via-teal/30 to-transparent" aria-hidden />
      </header>

      <main id="main" className="flex-1">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/results/:jobId" element={<ResultPage />} />
          <Route path="/candidate/:nim" element={<CandidatePage />} />
          <Route path="/compare" element={<ComparePage />} />
          <Route path="/jobs/create" element={<CreateJobPage />} />
          <Route
            path="*"
            element={
              <div className="max-w-6xl mx-auto px-4 py-20 text-center">
                <p className="microlabel mb-2">Error 404</p>
                <h1 className="h-page mb-4">Halaman tidak ditemukan</h1>
                <Link to="/" className="btn-ghost">
                  &larr; Kembali ke Beranda
                </Link>
              </div>
            }
          />
        </Routes>
      </main>

      <footer className="border-t border-line mt-12 bg-white">
        <div className="max-w-6xl mx-auto px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-muted">
            Talent Matching System — Magang Riset PRSDI–BRIN, 2026
          </p>
          <p className="font-mono text-micro text-muted">
            LangGraph · KernelSHAP · GPT-4o-mini
          </p>
        </div>
      </footer>
    </div>
  );
}
