interface PipelineStepInfo {
  label: string;
  description: string;
}

export const PIPELINE_STEPS: PipelineStepInfo[] = [
  { label: "Job Requirement Parser", description: "Menganalisis kebutuhan job" },
  { label: "Talent Matching", description: "Mencari kandidat dari 300 mahasiswa" },
  { label: "Candidate Profile", description: "Membangun profil kompetensi" },
  { label: "XAI Explainer", description: "Menghitung kontribusi CLO (SHAP)" },
  { label: "Orchestrator LLM", description: "Membuat narasi rekomendasi" },
];

interface PipelineProgressProps {
  currentStep: number; // 0-5
  error?: string | null;
}

/** Progres 5 agent pipeline — daftar bernomor dengan rel penghubung. */
export default function PipelineProgress({ currentStep, error }: PipelineProgressProps) {
  const done = Math.max(0, Math.min(currentStep - 1, PIPELINE_STEPS.length));
  const pct = Math.round((done / PIPELINE_STEPS.length) * 100);

  return (
    <section className="panel p-6" aria-live="polite" aria-label="Progres pipeline">
      <div className="flex items-baseline justify-between mb-1">
        <h2 className="h-section">Menjalankan agent pipeline</h2>
        <span className="num text-micro text-muted">{pct}%</span>
      </div>
      <p className="text-sm text-muted mb-5">
        Lima agent dijalankan berurutan — hasil muncul otomatis setelah selesai.
      </p>

      {/* Rel progres */}
      <div className="h-1 w-full bg-line rounded-full overflow-hidden mb-5" aria-hidden>
        <div
          className="h-full bg-teal rounded-full transition-[width] duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      <ol className="space-y-0">
        {PIPELINE_STEPS.map((step, i) => {
          const stepNo = i + 1;
          const isDone = currentStep > stepNo;
          const isRunning = currentStep === stepNo && !error;
          const isError = !!error && currentStep === stepNo;
          return (
            <li
              key={step.label}
              className={`flex items-center gap-4 py-2.5 ${
                i < PIPELINE_STEPS.length - 1 ? "border-b border-line/60" : ""
              }`}
            >
              <span
                aria-hidden
                className={`num text-xs w-6 text-right ${
                  isDone ? "text-teal-ink" : isRunning ? "text-navy font-semibold" : "text-muted/60"
                }`}
              >
                {String(stepNo).padStart(2, "0")}
              </span>
              <span
                aria-hidden
                className={`w-2 h-2 rounded-full shrink-0 ${
                  isDone
                    ? "bg-teal"
                    : isError
                      ? "bg-coral"
                      : isRunning
                        ? "bg-navy animate-pulse"
                        : "bg-line-strong"
                }`}
              />
              <span
                className={`flex-1 min-w-0 text-sm font-medium ${
                  isDone || isRunning ? "text-navy" : "text-muted"
                }`}
              >
                {step.label}
              </span>
              <span
                className={`text-xs hidden sm:block ${
                  isError ? "text-coral-ink" : isRunning ? "text-teal-ink" : "text-muted"
                }`}
              >
                {isDone
                  ? "selesai"
                  : isError
                    ? "gagal"
                    : isRunning
                      ? `${step.description}…`
                      : "menunggu"}
              </span>
            </li>
          );
        })}
      </ol>

      {error && <p className="mt-4 text-sm text-coral-ink font-medium">{error}</p>}
    </section>
  );
}
