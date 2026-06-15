"use client";

/** Compact circular probability-of-success gauge (0..100), colored by band. */
export function ProbabilityGauge({ value }: { value: number }) {
  const r = 46;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value));
  const dash = (pct / 100) * c;
  const color =
    pct >= 70 ? "var(--positive)" : pct >= 40 ? "var(--warning)" : "var(--negative)";

  return (
    <div className="relative grid place-items-center">
      <svg viewBox="0 0 132 132" className="h-auto w-full max-w-[132px] -rotate-90">
        <circle cx="66" cy="66" r={r} fill="none" stroke="var(--secondary)" strokeWidth="11" />
        <circle
          cx="66"
          cy="66"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="11"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c}`}
          style={{ transition: "stroke-dasharray 0.4s ease, stroke 0.3s ease" }}
        />
      </svg>
      <div className="absolute text-center">
        <div className="font-heading text-3xl font-semibold tabular-nums text-foreground">
          {pct}
          <span className="text-lg text-muted-foreground">%</span>
        </div>
      </div>
    </div>
  );
}
