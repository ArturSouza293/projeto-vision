"use client";

import { useTranslations } from "next-intl";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { MoneyTooltip } from "@/components/charts/chart-tooltip";
import { formatCompactCurrency } from "@/lib/format";
import { useVisionStore } from "@/lib/store/plan-store";
import type { ProjectionPoint } from "@/lib/types";

export function WealthArea({
  points,
  retirementYear,
  events = [],
  ghostPoints,
}: {
  points: ProjectionPoint[];
  retirementYear: number;
  events?: { year: number; title: string }[];
  /** A second, dimmed "what-if" curve overlaid during a timeline drag. */
  ghostPoints?: ProjectionPoint[] | null;
}) {
  const t = useTranslations();
  const locale = useVisionStore((s) => s.locale);

  // Merge the ghost series by YEAR (not index) so it stays aligned even if the
  // two series differ in length (e.g. a retirement drag changing the horizon).
  const ghostByYear = ghostPoints ? new Map(ghostPoints.map((g) => [g.year, g.wealth])) : null;
  const data = ghostByYear ? points.map((p) => ({ ...p, ghost: ghostByYear.get(p.year) })) : points;

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 12, right: 8, left: 8, bottom: 0 }}>
          <defs>
            <linearGradient id="wealthFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.35} />
              <stop offset="95%" stopColor="var(--primary)" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
          <XAxis
            dataKey="year"
            tickLine={false}
            axisLine={false}
            minTickGap={28}
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
          />
          <YAxis
            width={58}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            tickFormatter={(v) => formatCompactCurrency(Number(v), locale)}
          />
          <Tooltip content={<MoneyTooltip />} />
          <ReferenceLine
            x={retirementYear}
            stroke="var(--muted-foreground)"
            strokeDasharray="4 4"
            label={{
              value: t("scenarios.retirementAge"),
              position: "insideTopRight",
              fontSize: 10,
              fill: "var(--muted-foreground)",
            }}
          />
          <Area
            type="monotone"
            dataKey="wealth"
            name={t("scenarios.chart.wealth")}
            stroke="var(--primary)"
            strokeWidth={2}
            fill="url(#wealthFill)"
          />
          {ghostPoints && (
            <Area
              type="monotone"
              dataKey="ghost"
              stroke="var(--info)"
              strokeWidth={2}
              strokeDasharray="5 4"
              fill="none"
              dot={false}
              isAnimationActive={false}
            />
          )}
          {events.map((ev, i) => (
            <ReferenceLine
              key={`ev-${i}`}
              x={ev.year}
              stroke="var(--info)"
              strokeDasharray="2 3"
              label={{
                value: ev.title,
                position: "insideTopLeft",
                fontSize: 9,
                fill: "var(--info)",
              }}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
