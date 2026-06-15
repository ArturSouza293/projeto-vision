"use client";

import { AnimatedNumber } from "@/components/app/animated-number";
import { ChevronRight } from "@/components/app/icons";
import { cn } from "@/lib/utils";

type Tone = "default" | "positive" | "negative" | "brand" | "info";

const TONE: Record<Tone, string> = {
  default: "text-foreground",
  positive: "text-positive",
  negative: "text-negative",
  brand: "text-primary",
  info: "text-info",
};

export function KpiTile({
  label,
  value,
  format,
  tone = "default",
  sublabel,
  className,
  onClick,
}: {
  label: string;
  value: number;
  format: (n: number) => string;
  tone?: Tone;
  sublabel?: React.ReactNode;
  className?: string;
  /** When provided, the tile becomes a button that opens a detail modal. */
  onClick?: () => void;
}) {
  const body = (
    <div className="pr-5">
      <div className="text-[11px] tracking-wide text-muted-foreground/80 uppercase">
        {label}
      </div>
      <AnimatedNumber
        value={value}
        format={format}
        className={cn(
          "mt-1.5 block font-heading text-[22px] leading-none font-semibold sm:text-[26px]",
          TONE[tone],
        )}
      />
      {sublabel && <div className="mt-1.5 text-xs text-muted-foreground">{sublabel}</div>}
    </div>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "surface group/kpi relative rounded-2xl p-3 text-left transition-colors hover:border-primary/40 focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none sm:p-4",
          className,
        )}
      >
        {body}
        <ChevronRight className="absolute top-3 right-3 size-3.5 text-muted-foreground/30 transition-colors group-hover/kpi:text-primary" />
      </button>
    );
  }

  return <div className={cn("surface rounded-2xl p-3 sm:p-4", className)}>{body}</div>;
}
