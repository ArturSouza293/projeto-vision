"use client";

import { useTranslations } from "next-intl";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { MoneyTooltip } from "@/components/charts/chart-tooltip";
import { formatCompactCurrency } from "@/lib/format";
import { useVisionStore } from "@/lib/store/plan-store";
import type { ProjectionPoint } from "@/lib/types";

export function IncomeNeedsChart({ points }: { points: ProjectionPoint[] }) {
  const t = useTranslations();
  const locale = useVisionStore((s) => s.locale);

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={points} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
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
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Area
            type="monotone"
            dataKey="income"
            name={t("scenarios.chart.income")}
            stroke="var(--positive)"
            strokeWidth={2}
            fill="var(--positive)"
            fillOpacity={0.14}
          />
          <Line
            type="monotone"
            dataKey="needs"
            name={t("scenarios.chart.needs")}
            stroke="var(--negative)"
            strokeWidth={2}
            strokeDasharray="5 4"
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
