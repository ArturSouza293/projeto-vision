"use client";

import { useVisionStore } from "@/lib/store/plan-store";
import type { Locale } from "@/lib/types";
import { cn } from "@/lib/utils";

const OPTIONS: { code: Locale; label: string }[] = [
  { code: "en", label: "EN" },
  { code: "pt-BR", label: "PT" },
];

/** Language toggle. `tone="inverse"` styles it white-on-red for the brand header. */
export function LocaleToggle({ tone = "default" }: { tone?: "default" | "inverse" }) {
  const locale = useVisionStore((s) => s.locale);
  const setLocale = useVisionStore((s) => s.setLocale);
  const inverse = tone === "inverse";

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border p-0.5 text-xs font-semibold",
        inverse ? "border-white/25 bg-white/15" : "border-border bg-card",
      )}
    >
      {OPTIONS.map((o) => {
        const active = locale === o.code;
        return (
          <button
            key={o.code}
            type="button"
            onClick={() => setLocale(o.code)}
            aria-pressed={active}
            className={cn(
              "rounded-full px-2.5 py-1 transition-colors",
              active
                ? inverse
                  ? "bg-white text-primary"
                  : "bg-primary text-primary-foreground"
                : inverse
                  ? "text-white/75 hover:text-white"
                  : "text-muted-foreground hover:text-foreground",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
