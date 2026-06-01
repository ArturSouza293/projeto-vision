"use client";

import { useTranslations } from "next-intl";
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { MoneyTooltip } from "@/components/charts/chart-tooltip";
import { formatCompactCurrency } from "@/lib/format";
import { useVisionStore } from "@/lib/store/plan-store";

export function CashflowBar({
  income,
  expense,
}: {
  income: number;
  expense: number;
}) {
  const t = useTranslations();
  const locale = useVisionStore((s) => s.locale);
  const data = [
    { name: t("cashflow.income"), value: Math.round(income), fill: "var(--positive)" },
    { name: t("cashflow.expenses"), value: Math.round(expense), fill: "var(--chart-4)" },
  ];

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
          <XAxis
            dataKey="name"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
          />
          <YAxis
            width={64}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            tickFormatter={(v) => formatCompactCurrency(Number(v), locale)}
          />
          <Tooltip
            content={<MoneyTooltip />}
            cursor={{ fill: "var(--muted)", opacity: 0.4 }}
          />
          <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={90}>
            {data.map((d, i) => (
              <Cell key={i} fill={d.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
