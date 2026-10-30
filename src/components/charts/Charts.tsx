"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Count } from "@/lib/stats";

const SERIES = ["#8ab8ff", "#f0b35e", "#7fd1a8", "#c9a4ff", "#ff9fb2", "#6fd3e0"];

function TooltipBox({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-line-strong bg-sunken px-3 py-2 text-sm shadow-lg">
      <div className="text-ink-soft">{label}</div>
      <div className="font-semibold text-ink">{payload[0].value}</div>
    </div>
  );
}

/**
 * Horizontal bars — the workhorse for categorical counts. Labels stay
 * readable on phones because they live on the y-axis, never rotated.
 */
export function HBar({
  data,
  height,
  color = SERIES[0],
  multi = false,
  big = false,
}: {
  data: Count[];
  height?: number;
  color?: string;
  multi?: boolean;
  big?: boolean;
}) {
  const rows = data.filter((d) => d.value > 0 || data.length <= 6);
  const h = height ?? Math.max(160, rows.length * (big ? 64 : 34) + 16);
  if (!rows.length) return <Empty />;
  return (
    <ResponsiveContainer width="100%" height={h}>
      <BarChart data={rows} layout="vertical" margin={{ left: 0, right: big ? 48 : 24, top: 4, bottom: 4 }}>
        <CartesianGrid horizontal={false} strokeDasharray="2 4" />
        <XAxis type="number" allowDecimals={false} hide />
        <YAxis
          type="category"
          dataKey="label"
          width={big ? 260 : 170}
          tickLine={false}
          axisLine={false}
          tick={{ fill: "var(--ink-soft)", fontSize: big ? 18 : 12 }}
          interval={0}
        />
        <Tooltip content={<TooltipBox />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
        <Bar
          dataKey="value"
          radius={[0, 4, 4, 0]}
          barSize={big ? 34 : 16}
          label={{
            position: "right",
            fill: "var(--ink)",
            fontSize: big ? 18 : 12,
            fontWeight: 600,
          }}
          isAnimationActive={false}
        >
          {rows.map((_, i) => (
            <Cell key={i} fill={multi ? SERIES[i % SERIES.length] : color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Vertical bars for small ordinal scales (frequency, proficiency). */
export function VBar({
  data,
  height = 220,
  color = SERIES[0],
  big = false,
}: {
  data: Count[];
  height?: number;
  color?: string;
  big?: boolean;
}) {
  if (!data.length) return <Empty />;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ left: 0, right: 8, top: 24, bottom: 0 }}>
        <CartesianGrid vertical={false} strokeDasharray="2 4" />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          interval={0}
          tick={{ fill: "var(--ink-soft)", fontSize: big ? 18 : 12 }}
        />
        <YAxis hide allowDecimals={false} />
        <Tooltip content={<TooltipBox />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
        <Bar
          dataKey="value"
          fill={color}
          radius={[4, 4, 0, 0]}
          barSize={big ? 110 : 36}
          label={{ position: "top", fill: "var(--ink)", fontSize: big ? 20 : 12, fontWeight: 600 }}
          isAnimationActive={false}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

function Empty() {
  return (
    <div className="flex h-40 items-center justify-center text-sm text-ink-mute">
      No responses yet
    </div>
  );
}

export { SERIES };
