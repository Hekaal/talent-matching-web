import {
  Bar,
  BarChart,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { CLOContribution } from "../types";
import { truncate } from "../utils/format";

interface ShapChartProps {
  contributions: CLOContribution[];
  height?: number;
}

const TEAL = "#00A896";
const CORAL = "#F96167";
const NAVY = "#1E2761";

/**
 * Horizontal bar chart kontribusi SHAP: teal positif, coral negatif.
 * Panjang bar memakai shap_weighted (shap_value x job_weight) sehingga CLO
 * dari skill nice-to-have tidak terlihat sepenting CLO must-have.
 */
export default function ShapChart({ contributions, height = 400 }: ShapChartProps) {
  // Ambil 10 CLO dengan |shap_weighted| terbesar, urut menurun
  const data = [...contributions]
    .sort((a, b) => Math.abs(b.shap_weighted) - Math.abs(a.shap_weighted))
    .slice(0, 10)
    .sort((a, b) => b.shap_weighted - a.shap_weighted)
    .map((c) => ({
      ...c,
      label: truncate(c.mata_kuliah, 25),
    }));

  if (data.length === 0) {
    return <p className="text-sm text-muted">Tidak ada data kontribusi SHAP.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ left: 12, right: 24, top: 8 }}>
        <XAxis
          type="number"
          tick={{ fontSize: 10, fill: NAVY, fontFamily: "'IBM Plex Mono', monospace" }}
          tickFormatter={(v: number) => v.toFixed(3)}
        />
        <YAxis
          type="category"
          dataKey="label"
          width={170}
          tick={{ fontSize: 11, fill: "#3A4270" }}
        />
        <ReferenceLine x={0} stroke="#C8D2E4" />
        <Tooltip
          formatter={(value: number) => [value.toFixed(6), "SHAP terbobot"]}
          labelFormatter={(_, payload) => {
            const p = payload?.[0]?.payload as (typeof data)[number] | undefined;
            if (!p) return "";
            const peran = p.is_must_have ? "must-have" : "pendukung";
            return (
              `${p.mata_kuliah} (${p.clo_id}) — ${peran} · Nilai: ${p.nilai_raw} · ` +
              `Bobot job: ${p.job_weight} · SHAP mentah: ${p.shap_value.toFixed(6)}`
            );
          }}
          contentStyle={{ fontSize: 12, borderRadius: 6, border: "1px solid #DFE5F0" }}
        />
        <Bar dataKey="shap_weighted" radius={[0, 4, 4, 0]} isAnimationActive={false}>
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.shap_weighted >= 0 ? TEAL : CORAL} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
