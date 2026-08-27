interface ScoreBadgeProps {
  score: number;
  /** Sertakan keterangan tingkatan untuk pembaca layar. */
  label?: string;
}

/**
 * Badge skor (0-1) dengan ambang sesuai PRD.
 * Memakai latar bertint + teks gelap agar kontras lulus WCAG AA —
 * warna brand penuh tetap dipakai sebagai rule kiri sebagai penanda tingkat.
 */
const LEVELS = [
  { min: 0.9, cls: "bg-teal/15 text-teal-ink border-l-teal", note: "sangat tinggi" },
  { min: 0.75, cls: "bg-ice text-navy border-l-navy", note: "tinggi" },
  { min: 0.6, cls: "bg-amber/15 text-amber-ink border-l-amber", note: "sedang" },
  { min: -Infinity, cls: "bg-coral/12 text-coral-ink border-l-coral", note: "rendah" },
];

export default function ScoreBadge({ score, label }: ScoreBadgeProps) {
  const level = LEVELS.find((l) => score >= l.min)!;
  return (
    <span
      className={`inline-flex items-center rounded border-l-[3px] px-2 py-0.5
                  font-mono text-sm font-semibold tabular-nums ${level.cls}`}
      title={`${label ?? "Skor"} ${score.toFixed(2)} — ${level.note}`}
    >
      {score.toFixed(2)}
      <span className="sr-only"> ({level.note})</span>
    </span>
  );
}
