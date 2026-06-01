"use client";

import { formatCurrency } from "@/lib/format";
import { useVisionStore } from "@/lib/store/plan-store";

type TooltipItem = {
  name?: string | number;
  value?: number | string;
  color?: string;
  fill?: string;
};

/** Shared Recharts tooltip rendering BRL values with the active locale. */
export function MoneyTooltip(props: {
  active?: boolean;
  payload?: TooltipItem[];
  label?: string | number;
}) {
  const locale = useVisionStore((s) => s.locale);
  const { active, payload, label } = props;
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md">
      {label !== undefined && label !== "" && (
        <div className="mb-1 font-medium text-foreground">{label}</div>
      )}
      <div className="space-y-1">
        {payload.map((p, i) => (
          <div key={i} className="flex items-center gap-2">
            <span
              className="size-2 shrink-0 rounded-full"
              style={{ background: p.color ?? p.fill ?? "var(--foreground)" }}
            />
            {p.name !== undefined && (
              <span className="text-muted-foreground">{p.name}</span>
            )}
            <span className="ml-auto pl-3 font-medium text-foreground tabular-nums">
              {formatCurrency(Number(p.value ?? 0), locale)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
