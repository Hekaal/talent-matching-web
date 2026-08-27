import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ALL_SKILL_DOMAINS, createJob, errorMessage, parseJob } from "../api/client";
import Breadcrumb from "../components/Breadcrumb";
import MustHaveChip from "../components/MustHaveChip";
import type { ParsedJob } from "../types";

type Step = 1 | 2 | 3;

const STEP_LABELS = ["Input Job", "Review Skill", "Konfirmasi"];

export default function CreateJobPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>(1);

  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [description, setDescription] = useState("");

  const [parsed, setParsed] = useState<ParsedJob | null>(null);
  const [mustHave, setMustHave] = useState<string[]>([]);
  const [niceToHave, setNiceToHave] = useState<string[]>([]);
  const [addSkill, setAddSkill] = useState("");

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const step1Valid =
    title.trim().length > 0 && company.trim().length > 0 && description.trim().length >= 100;

  const analyze = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await parseJob(title.trim(), company.trim(), description.trim());
      setParsed(res);
      setMustHave(res.must_have);
      setNiceToHave(res.nice_to_have);
      setStep(2);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const moveToNice = (s: string) => {
    setMustHave((m) => m.filter((x) => x !== s));
    setNiceToHave((n) => (n.includes(s) ? n : [...n, s]));
  };
  const moveToMust = (s: string) => {
    setNiceToHave((n) => n.filter((x) => x !== s));
    setMustHave((m) => (m.includes(s) ? m : [...m, s]));
  };
  const removeSkill = (s: string) => {
    setMustHave((m) => m.filter((x) => x !== s));
    setNiceToHave((n) => n.filter((x) => x !== s));
  };
  const addManualSkill = () => {
    if (addSkill && !mustHave.includes(addSkill) && !niceToHave.includes(addSkill)) {
      setNiceToHave((n) => [...n, addSkill]);
    }
    setAddSkill("");
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await createJob(
        title.trim(),
        company.trim(),
        description.trim(),
        mustHave,
        niceToHave
      );
      navigate(`/results/${res.job_id}`);
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  };

  const availableSkills = ALL_SKILL_DOMAINS.filter(
    (s) => !mustHave.includes(s) && !niceToHave.includes(s)
  );

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6 page-enter">
      <Breadcrumb items={[{ label: "Beranda", to: "/" }, { label: "Tambah job baru" }]} />

      <header className="border-b border-line pb-4">
        <h1 className="h-page">Tambah job baru</h1>
        <p className="text-sm text-muted mt-1">
          GPT-4o-mini mengekstrak skill domain dari job description — Anda tinggal meninjau
          dan menyesuaikan sebelum menyimpan.
        </p>
      </header>

      {/* Stepper */}
      <ol className="flex items-center gap-0 text-xs" aria-label="Langkah pengisian">
        {STEP_LABELS.map((label, i) => {
          const n = (i + 1) as Step;
          const done = step > n;
          const active = step === n;
          return (
            <li key={label} className="flex items-center">
              <span
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md border font-medium ${
                  active
                    ? "border-navy bg-navy text-white"
                    : done
                      ? "border-teal/50 bg-teal/[0.07] text-teal-ink"
                      : "border-line text-muted"
                }`}
              >
                <span className="num">{done ? "✓" : `0${n}`}</span>
                {label}
              </span>
              {i < 2 && <span className="w-6 h-px bg-line mx-1.5" aria-hidden />}
            </li>
          );
        })}
      </ol>

      {error && (
        <div className="panel border-l-[3px] border-l-coral p-4" role="alert">
          <p className="text-sm text-coral-ink font-medium">{error}</p>
        </div>
      )}

      {/* STEP 1 — Input */}
      {step === 1 && (
        <section className="panel p-6 space-y-4">
          <label className="block">
            <span className="field-label">Job title</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="cth. Data Scientist"
              className="field"
            />
          </label>
          <label className="block">
            <span className="field-label">Perusahaan</span>
            <input
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="cth. PT Tokopedia"
              className="field"
            />
          </label>
          <label className="block">
            <span className="field-label flex justify-between">
              <span>Job description</span>
              <span
                className={`num text-xs font-normal ${
                  description.trim().length >= 100 ? "text-teal-ink" : "text-muted"
                }`}
              >
                {description.trim().length}/100 minimum
              </span>
            </span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={8}
              placeholder="Tempel job description lengkap di sini…"
              className="field leading-relaxed"
            />
          </label>
          <button onClick={analyze} disabled={!step1Valid || loading} className="btn-primary">
            {loading ? "GPT sedang menganalisis… (~5 detik)" : "Analisis dengan GPT"}
          </button>
        </section>
      )}

      {/* STEP 2 — Review */}
      {step === 2 && parsed && (
        <section className="panel p-6 space-y-5">
          <div className="border-l-[3px] border-l-navy bg-ice/60 rounded-r-md px-4 py-3">
            <p className="text-xs font-semibold text-navy mb-1">Analisis GPT · {parsed.parser_mode}</p>
            <p className="text-sm text-navy/85 italic">{parsed.reasoning}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <h2 className="h-section text-base mb-3">Skill wajib</h2>
              <ul className="space-y-1.5">
                {mustHave.map((s) => (
                  <li key={s} className="flex items-center gap-1.5">
                    <MustHaveChip label={s} variant="teal" />
                    <button
                      onClick={() => moveToNice(s)}
                      title="Pindah ke Nice to Have"
                      className="text-xs text-muted hover:text-amber-ink px-1"
                    >
                      ↓nice
                    </button>
                    <button
                      onClick={() => removeSkill(s)}
                      title={`Hapus ${s}`}
                      className="text-xs text-muted hover:text-coral-ink px-1"
                    >
                      ✕
                    </button>
                  </li>
                ))}
                {mustHave.length === 0 && (
                  <li className="text-xs text-coral-ink">Pilih minimal satu skill wajib.</li>
                )}
              </ul>
            </div>
            <div>
              <h2 className="h-section text-base mb-3">Skill pendukung</h2>
              <ul className="space-y-1.5">
                {niceToHave.map((s) => (
                  <li key={s} className="flex items-center gap-1.5">
                    <MustHaveChip label={s} variant="amber" />
                    <button
                      onClick={() => moveToMust(s)}
                      title="Pindah ke Must Have"
                      className="text-xs text-muted hover:text-teal-ink px-1"
                    >
                      ↑must
                    </button>
                    <button
                      onClick={() => removeSkill(s)}
                      title={`Hapus ${s}`}
                      className="text-xs text-muted hover:text-coral-ink px-1"
                    >
                      ✕
                    </button>
                  </li>
                ))}
                {niceToHave.length === 0 && <li className="text-xs text-muted">Belum ada.</li>}
              </ul>
            </div>
          </div>

          <div className="flex items-center gap-2 border-t border-line pt-4">
            <select
              value={addSkill}
              onChange={(e) => setAddSkill(e.target.value)}
              className="field !w-auto flex-1"
              aria-label="Tambah skill manual"
            >
              <option value="">Tambah skill manual…</option>
              {availableSkills.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <button onClick={addManualSkill} disabled={!addSkill} className="btn-secondary !py-2.5">
              Tambah
            </button>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setStep(3)}
              disabled={mustHave.length === 0}
              className="btn-primary"
            >
              Lanjut
            </button>
            <button onClick={() => setStep(1)} className="btn-secondary">
              Ulangi
            </button>
          </div>
        </section>
      )}

      {/* STEP 3 — Konfirmasi */}
      {step === 3 && (
        <section className="panel p-6 space-y-5">
          <h2 className="h-section">Pratinjau akhir</h2>
          <dl className="divide-y divide-line/70 text-sm">
            <div className="flex gap-4 py-2.5">
              <dt className="w-28 shrink-0 text-xs text-muted self-center">Job Title</dt>
              <dd className="font-semibold">{title}</dd>
            </div>
            <div className="flex gap-4 py-2.5">
              <dt className="w-28 shrink-0 text-xs text-muted self-center">Company</dt>
              <dd>{company}</dd>
            </div>
            <div className="flex gap-4 py-2.5 items-start">
              <dt className="w-28 shrink-0 text-xs text-muted pt-1">Must Have</dt>
              <dd className="flex flex-wrap gap-1">
                {mustHave.map((s) => (
                  <MustHaveChip key={s} label={s} variant="teal" />
                ))}
              </dd>
            </div>
            <div className="flex gap-4 py-2.5 items-start">
              <dt className="w-28 shrink-0 text-xs text-muted pt-1">Nice Have</dt>
              <dd className="flex flex-wrap gap-1">
                {niceToHave.map((s) => (
                  <MustHaveChip key={s} label={s} variant="amber" />
                ))}
                {niceToHave.length === 0 && <span className="text-muted">—</span>}
              </dd>
            </div>
          </dl>
          <div className="flex gap-2 pt-1">
            <button onClick={save} disabled={saving} className="btn-primary !px-7 !py-3">
              {saving ? "Menyimpan job dan mencari kandidat…" : "Simpan & Cari Kandidat"}
            </button>
            <button onClick={() => setStep(2)} disabled={saving} className="btn-secondary">
              Kembali
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
