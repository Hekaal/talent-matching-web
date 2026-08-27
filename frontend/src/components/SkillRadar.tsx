import { useState } from "react";
import {
  Legend,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import type { SkillVector } from "../types";
import { shortLabel } from "../utils/format";

export interface RadarSeries {
  key: string; // pengenal unik (NIM)
  name: string; // label legend
  color: string;
  skillVector: SkillVector;
}

interface SkillRadarProps {
  /** Mode tunggal — satu kandidat. */
  skillVector?: SkillVector;
  /** Mode overlay — 2-3 kandidat sekaligus. */
  series?: RadarSeries[];
  mustHave?: string[];
  niceToHave?: string[];
  size?: number;
}

const TEAL = "#00A896"; // fill grafik (brand)
const TEAL_INK = "#00695C"; // label must-have
const AMBER_INK = "#8F5B00"; // label nice-to-have
const GREY = "#8A90A6"; // label domain lain
const NAVY = "#1E2761";

/**
 * Radar skill domain dengan toggle relevansi.
 * Default menampilkan hanya skill yang relevan dengan job (must_have +
 * nice_to_have); toggle "Semua Skill" menampilkan seluruh 24 domain dengan
 * label berwarna sesuai perannya terhadap job.
 */
export default function SkillRadar({
  skillVector,
  series,
  mustHave = [],
  niceToHave = [],
  size = 300,
}: SkillRadarProps) {
  const mustSet = new Set(mustHave);
  const niceSet = new Set(niceToHave);
  const relevantSet = new Set([...mustHave, ...niceToHave]);
  const hasRelevant = relevantSet.size >= 3; // radar butuh minimal 3 sumbu

  const [showAll, setShowAll] = useState(!hasRelevant);

  const isOverlay = Array.isArray(series) && series.length > 0;
  const domains = isOverlay
    ? Object.keys(series![0].skillVector)
    : Object.keys(skillVector ?? {});

  const visibleDomains = domains.filter((d) => showAll || relevantSet.has(d));

  const data = visibleDomains.map((domain) => {
    const row: Record<string, string | number> = {
      domain,
      label: shortLabel(domain),
      role: mustSet.has(domain) ? "must" : niceSet.has(domain) ? "nice" : "other",
    };
    if (isOverlay) {
      for (const s of series!) row[s.key] = s.skillVector[domain] ?? 0;
    } else {
      row.value = skillVector?.[domain] ?? 0;
    }
    return row;
  });

  if (data.length === 0) {
    return <p className="text-sm text-muted">Tidak ada data skill.</p>;
  }

  /** Label sumbu diwarnai sesuai peran skill terhadap job. */
  const renderTick = ({ payload, x, y, textAnchor }: any) => {
    const item = data.find((d) => d.label === payload.value);
    const role = (item?.role as string) ?? "other";
    const fill = role === "must" ? TEAL_INK : role === "nice" ? AMBER_INK : showAll ? GREY : NAVY;
    return (
      <text
        x={x}
        y={y}
        textAnchor={textAnchor}
        fill={fill}
        fontSize={9}
        fontWeight={role === "must" ? 700 : 400}
        fontFamily="'IBM Plex Mono', monospace"
        dominantBaseline="central"
      >
        {payload.value}
      </text>
    );
  };

  return (
    <div>
      {hasRelevant && (
        <div className="mb-3">
          <div
            className="inline-flex rounded-md border border-line overflow-hidden"
            role="group"
            aria-label="Tampilan radar"
          >
            <button
              onClick={() => setShowAll(false)}
              aria-pressed={!showAll}
              className={`px-3.5 py-2 text-xs font-medium transition-colors ${
                !showAll ? "bg-navy text-white" : "bg-white text-muted hover:text-navy"
              }`}
            >
              Skill Relevan Job
            </button>
            <button
              onClick={() => setShowAll(true)}
              aria-pressed={showAll}
              className={`px-3.5 py-2 text-xs font-medium border-l border-line transition-colors ${
                showAll ? "bg-navy text-white" : "bg-white text-muted hover:text-navy"
              }`}
            >
              Semua Skill ({domains.length})
            </button>
          </div>
          <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ background: TEAL }} aria-hidden />
              Must Have
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span
                className="w-2 h-2 rounded-full"
                style={{ background: "#F2A007" }}
                aria-hidden
              />
              Nice to Have
            </span>
            {showAll && (
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ background: GREY }} aria-hidden />
                Lainnya
              </span>
            )}
          </p>
        </div>
      )}

      <ResponsiveContainer width="100%" height={size}>
        <RadarChart data={data} outerRadius="70%">
          <PolarGrid stroke="#DFE5F0" />
          <PolarAngleAxis dataKey="label" tick={renderTick} />
          <PolarRadiusAxis domain={[0, 1]} tick={false} axisLine={false} />

          {isOverlay ? (
            series!.map((s) => (
              <Radar
                key={s.key}
                name={s.name}
                dataKey={s.key}
                stroke={s.color}
                strokeWidth={1.8}
                fill={s.color}
                fillOpacity={0.12}
                isAnimationActive={false}
              />
            ))
          ) : (
            <Radar
              name="Skill"
              dataKey="value"
              stroke={TEAL}
              fill={TEAL}
              fillOpacity={0.3}
              isAnimationActive={false}
            />
          )}

          {isOverlay && (
            <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} iconType="circle" />
          )}
          <Tooltip
            formatter={(value: number, name: string) => [value.toFixed(4), name]}
            labelFormatter={(label, payload) =>
              (payload?.[0]?.payload?.domain as string) ?? label
            }
            contentStyle={{ fontSize: 12, borderRadius: 6, border: "1px solid #DFE5F0" }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
