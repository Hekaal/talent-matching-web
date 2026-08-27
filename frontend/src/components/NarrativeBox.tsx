interface NarrativeBoxProps {
  title?: string;
  text: string;
}

/** Blok narasi rekomendasi — rule teal di kiri, gaya kutipan editorial. */
export default function NarrativeBox({ title = "Narasi rekomendasi", text }: NarrativeBoxProps) {
  return (
    <section className="panel border-l-[3px] border-l-teal p-5" aria-label={title}>
      <h2 className="text-sm font-semibold text-teal-ink mb-2">{title}</h2>
      <p className="text-base text-navy/90 leading-relaxed whitespace-pre-line">{text}</p>
    </section>
  );
}
