interface MustHaveChipProps {
  label: string;
  variant?: "teal" | "amber" | "coral";
}

/** Chip skill: teal = must-have, amber = nice-to-have, coral = weak skill. */
const VARIANTS: Record<NonNullable<MustHaveChipProps["variant"]>, string> = {
  teal: "text-teal-ink border-teal/40 bg-teal/[0.07]",
  amber: "text-amber-ink border-amber/50 bg-amber/[0.10]",
  coral: "text-coral-ink border-coral/40 bg-coral/[0.08]",
};

export default function MustHaveChip({ label, variant = "teal" }: MustHaveChipProps) {
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded border text-xs font-medium ${VARIANTS[variant]}`}
    >
      {label}
    </span>
  );
}
