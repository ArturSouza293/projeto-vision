"use client";

import { useVisionStore } from "@/lib/store/plan-store";
import type { Locale } from "@/lib/types";
import { cn } from "@/lib/utils";

const OPTIONS: { code: Locale; label: string }[] = [
  { code: "en", label: "EN" },
  { code: "pt-BR", label: "PT" },
];

export function LocaleToggle() {
  const locale = useVisionStore((s) => s.locale);
  const setLocale = useVisionStore((s) => s.setLocale);

  return (
    <div className="inline-flex items-center rounded-full border border-border bg-card p-0.5 text-xs font-semibold">
      {OPTIONS.map((o) => (
        <button
          key={o.code}
          type="button"
          onClick={() => setLocale(o.code)}
          aria-pressed={locale === o.code}
          className={cn(
            "rounded-full px-2.5 py-1 transition-colors",
            locale === o.code
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
