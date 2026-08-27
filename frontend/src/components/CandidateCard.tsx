import { useNavigate } from "react-router-dom";
import type { Candidate } from "../types";
import HealthBadge from "./HealthBadge";

interface CandidateCardProps {
  candidate: Candidate;
  jobId: string;
  /** Skill wajib terkuat menurut SHAP; kosong bila XAI belum dihitung. */
  contextualSkills?: string[];
  selected: boolean;
  onToggleSelect: (nim: string) => void;
  selectionDisabled: boolean;
}

/** Baris tabel kandidat: rank, NIM, kampus, score bar, top skill, aksi. */
export default function CandidateCard({
  candidate,
  jobId,
  contextualSkills = [],
  selected,
  onToggleSelect,
  selectionDisabled,
}: CandidateCardProps) {
  const navigate = useNavigate();
  const scorePct = Math.min(candidate.score * 100, 100);
  const isTopThree = candidate.rank <= 3;

  return (
    <tr
      className={`border-b border-line/70 last:border-0 transition-colors
                  hover:bg-ice/60 focus-within:bg-ice/60 ${selected ? "bg-teal/[0.06]" : ""}`}
    >
      <td className="pl-4 pr-2 py-3">
        <input
          type="checkbox"
          checked={selected}
          disabled={!selected && selectionDisabled}
          onChange={() => onToggleSelect(candidate.nim)}
          className="w-4 h-4 accent-teal-700 cursor-pointer disabled:cursor-not-allowed"
          aria-label={`Pilih kandidat ${candidate.nim} untuk dibandingkan`}
        />
      </td>
      <td className="px-3 py-3">
        <span
          className={`num text-sm ${isTopThree ? "text-navy font-semibold" : "text-muted"}`}
        >
          {String(candidate.rank).padStart(2, "0")}
        </span>
      </td>
      <td className="px-3 py-3 num text-sm font-medium text-navy">{candidate.nim}</td>
      <td className="px-3 py-3 text-sm text-navy/75">
        {candidate.kampus.replace("Telkom University ", "TelU ")}
      </td>
      <td className="px-3 py-3 min-w-[210px]">
        <div className="flex items-center gap-3">
          <div className="flex-1 h-1.5 bg-line rounded-full overflow-hidden" aria-hidden>
            <div
              className="h-full bg-teal rounded-full transition-[width] duration-300"
              style={{ width: `${scorePct}%` }}
            />
          </div>
          <span className="num text-sm font-semibold text-navy">
            {candidate.score.toFixed(4)}
          </span>
          <HealthBadge health={candidate.must_have_health} />
        </div>
        {!candidate.passes_must_have && (
          <span className="mt-0.5 inline-block text-xs text-coral-ink">
            tidak lolos must-have
          </span>
        )}
      </td>
      <td className="px-3 py-3 hidden md:table-cell max-w-[260px]">
        {contextualSkills.length > 0 ? (
          // Skill wajib yang benar-benar mendorong skor kandidat untuk job ini
          <span className="flex flex-wrap gap-1">
            {contextualSkills.map((skill) => (
              <span
                key={skill}
                className="inline-block rounded border border-teal/40 bg-teal/[0.07]
                           px-1.5 py-0.5 text-xs font-medium text-teal-ink"
              >
                {skill}
              </span>
            ))}
          </span>
        ) : candidate.top_skills.length > 0 ? (
          // Fallback: SHAP belum dihitung, jadi hanya kekuatan umum kandidat
          <span
            className="text-sm text-muted"
            title="Skill terkuat kandidat secara umum — SHAP untuk job ini belum dihitung"
          >
            {candidate.top_skills.slice(0, 2).join(", ")}
          </span>
        ) : (
          <span className="text-sm text-muted">—</span>
        )}
      </td>
      <td className="px-3 pr-4 py-3 text-right">
        <button
          onClick={() => navigate(`/candidate/${candidate.nim}?job=${jobId}`)}
          className="btn-ghost !px-2.5 !py-1 whitespace-nowrap"
          aria-label={`Lihat detail kandidat ${candidate.nim}`}
        >
          Detail &rarr;
        </button>
      </td>
    </tr>
  );
}
