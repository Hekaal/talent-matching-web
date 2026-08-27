import type { MustHaveHealth } from "../types";

interface HealthBadgeProps {
  health: MustHaveHealth | null;
}

const LEVELS: Record<
  MustHaveHealth,
  { icon: string; label: string; tooltip: string; cls: string }
> = {
  good: {
    icon: "🟢",
    label: "Skill wajib aman",
    tooltip: "Semua skill wajib di atas rata-rata",
    cls: "border-teal/40 bg-teal/[0.07] text-teal-ink",
  },
  medium: {
    icon: "🟡",
    label: "Perlu diperhatikan",
    tooltip: "1-2 skill wajib di bawah rata-rata",
    cls: "border-amber/50 bg-amber/[0.10] text-amber-ink",
  },
  weak: {
    icon: "🔴",
    label: "Perlu wawancara mendalam",
    tooltip:
      "Mayoritas skill wajib di bawah rata-rata — pertimbangkan wawancara mendalam",
    cls: "border-coral/40 bg-coral/[0.08] text-coral-ink",
  },
};

/** Indikator kondisi skill wajib kandidat (dari SHAP must-have). */
export default function HealthBadge({ health }: HealthBadgeProps) {
  if (!health) return null;
  const level = LEVELS[health];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-xs
                  font-medium whitespace-nowrap ${level.cls}`}
      title={level.tooltip}
    >
      <span aria-hidden>{level.icon}</span>
      <span className="sr-only">
        {level.label} — {level.tooltip}
      </span>
      <span aria-hidden className="hidden lg:inline">
        {level.label}
      </span>
    </span>
  );
}
