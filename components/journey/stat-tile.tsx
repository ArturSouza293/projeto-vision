import { cn } from "@/lib/utils";

type Tone = "default" | "positive" | "negative" | "brand" | "info";

const TONE: Record<Tone, string> = {
  default: "text-foreground",
  positive: "text-positive",
  negative: "text-negative",
  brand: "text-primary",
  info: "text-info",
};

/** Compact KPI card: small uppercase label over a large tabular figure. */
export function StatTile({
  label,
  value,
  tone = "default",
  hint,
  className,
}: {
  label: string;
  value: React.ReactNode;
  tone?: Tone;
  hint?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-xl border border-border bg-card p-4", className)}>
      <div className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </div>
      <div
        className={cn(
          "mt-1 font-heading text-2xl font-semibold tabular-nums",
          TONE[tone],
        )}
      >
        {value}
      </div>
      {hint && <div className="mt-0.5 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}
