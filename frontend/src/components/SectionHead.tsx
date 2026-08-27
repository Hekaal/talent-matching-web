import type { ReactNode } from "react";

interface SectionHeadProps {
  title: string;
  id?: string;
  hint?: ReactNode; // teks/metadata di sisi kanan
  actions?: ReactNode; // tombol opsional
}

/** Kepala seksi: judul sentence-case + garis pemisah + metadata di kanan. */
export default function SectionHead({ title, id, hint, actions }: SectionHeadProps) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2 mb-4 pb-2 border-b border-line">
      <h2 id={id} className="h-section">
        {title}
      </h2>
      <div className="flex items-center gap-3">
        {hint && <span className="font-mono text-micro text-muted tabular-nums">{hint}</span>}
        {actions}
      </div>
    </div>
  );
}
