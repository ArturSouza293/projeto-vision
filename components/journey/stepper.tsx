"use client";

import { useTranslations } from "next-intl";
import { Check } from "lucide-react";

import { JOURNEY_STEPS, stepDone } from "@/lib/journey";
import { useVisionStore } from "@/lib/store/plan-store";
import { cn } from "@/lib/utils";

export function Stepper() {
  const t = useTranslations();
  const plan = useVisionStore((s) => s.activePlan);
  const current = useVisionStore((s) => s.currentStepId);
  const setCurrentStep = useVisionStore((s) => s.setCurrentStep);
  if (!plan) return null;

  return (
    <nav className="sticky top-14 z-30 border-b border-border/80 bg-background/95 backdrop-blur">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <ol className="flex items-center gap-1 overflow-x-auto py-3">
          {JOURNEY_STEPS.map((id, i) => {
            const active = id === current;
            const done = stepDone(plan, id);
            return (
              <li key={id} className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => setCurrentStep(id)}
                  className="group flex items-center gap-2 rounded-full px-1.5 py-1 outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span
                    className={cn(
                      "grid size-6 shrink-0 place-items-center rounded-full border text-[11px] font-semibold transition-colors",
                      active
                        ? "border-primary bg-primary text-primary-foreground"
                        : done
                          ? "border-primary/30 bg-primary/10 text-primary"
                          : "border-border bg-card text-muted-foreground",
                    )}
                  >
                    {done && !active ? <Check className="size-3.5" /> : i + 1}
                  </span>
                  <span
                    className={cn(
                      "text-sm whitespace-nowrap transition-colors",
                      active
                        ? "font-medium text-foreground"
                        : "text-muted-foreground group-hover:text-foreground",
                    )}
                  >
                    {t(`stepsShort.${id}`)}
                  </span>
                </button>
                {i < JOURNEY_STEPS.length - 1 && (
                  <span className="h-px w-4 shrink-0 bg-border sm:w-6" />
                )}
              </li>
            );
          })}
        </ol>
      </div>
    </nav>
  );
}
