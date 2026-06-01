"use client";

import { useTranslations } from "next-intl";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { MoneyTooltip } from "@/components/charts/chart-tooltip";
import type { AssetClass } from "@/lib/types";

export const ASSET_CLASS_COLOR: Record<AssetClass, string> = {
  cash: "var(--chart-2)",
  investments: "var(--chart-3)",
  pension: "var(--chart-5)",
  real_estate: "var(--chart-4)",
  business: "var(--chart-1)",
  other: "var(--muted-foreground)",
};

export function NetWorthDonut({
  byClass,
}: {
  byClass: Record<AssetClass, number>;
}) {
  const t = useTranslations();
  const data = (Object.entries(byClass) as [AssetClass, number][])
    .filter(([, v]) => v > 0)
    .map(([k, v]) => ({ name: t(`assetClass.${k}`), value: v, key: k }));

  if (data.length === 0) {
    return (
      <div className="grid h-56 w-full place-items-center text-sm text-muted-foreground">
        —
      </div>
    );
  }

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={56}
            outerRadius={86}
            paddingAngle={2}
            stroke="none"
          >
            {data.map((d) => (
              <Cell key={d.key} fill={ASSET_CLASS_COLOR[d.key]} />
            ))}
          </Pie>
          <Tooltip content={<MoneyTooltip />} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
