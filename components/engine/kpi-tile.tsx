"use client";

import { AnimatedNumber } from "@/components/app/animated-number";
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
}: {
  label: string;
  value: number;
  format: (n: number) => string;
  tone?: Tone;
  sublabel?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("surface rounded-2xl p-4", className)}>
      <div className="text-[11px] tracking-wide text-muted-foreground/80 uppercase">
        {label}
      </div>
      <AnimatedNumber
        value={value}
        format={format}
        className={cn("mt-1.5 block font-heading text-[26px] leading-none font-semibold", TONE[tone])}
      />
      {sublabel && <div className="mt-1.5 text-xs text-muted-foreground">{sublabel}</div>}
    </div>
  );
}
