"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { ArrowRight, Menu, Sparkles } from "@/components/app/icons";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/format";
import { useVisionStore } from "@/lib/store/plan-store";
import type { Segment } from "@/lib/types";
import { cn } from "@/lib/utils";

const SEGMENTS: Segment[] = ["retail", "prime", "principal", "private"];
/** Illustrative target nest-egg per segment (real BRL, marketing example only). */
const SEGMENT_TARGET: Record<Segment, number> = {
  retail: 500_000,
  prime: 1_000_000,
  principal: 3_000_000,
  private: 8_000_000,
};
const EXAMPLE_RETURN = 0.04; // real, illustrative
const START_EARLY = 35;
const START_LATE = 45;
const TARGET_AGE = 65;

/** Monthly contribution to reach `target` in `years` at annual real return `r`. */
function monthlyFor(target: number, startAge: number, r: number): number {
  const years = TARGET_AGE - startAge;
  if (years <= 0) return target;
  return Math.round((target * r) / (12 * (Math.pow(1 + r, years) - 1)));
}

const CARD_KEYS = ["c1", "c2", "c3", "c4"] as const;

export function WhyPlan() {
  const t = useTranslations();
  const locale = useVisionStore((s) => s.locale);
  const startNewClient = useVisionStore((s) => s.startNewClient);
  const setSidebarOpen = useVisionStore((s) => s.setSidebarOpen);
  const setIntroSeen = useVisionStore((s) => s.setIntroSeen);
  const advisorName = useVisionStore((s) => s.advisorName);
  const [segment, setSegment] = useState<Segment>("prime");

  const cur = (n: number) => formatCurrency(n, locale);
  const target = SEGMENT_TARGET[segment];

  function begin() {
    setIntroSeen(true);
    startNewClient();
  }

  return (
    <div className="mx-auto max-w-2xl py-10">
      <div className="text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          <Sparkles className="size-3.5" />
          {t("welcome.title", { name: advisorName })}
        </span>
        <h1 className="mt-3 font-heading text-3xl font-semibold tracking-tight text-foreground">
          {t("whyPlan.title")}
        </h1>
        <p className="mt-2 text-muted-foreground">{t("whyPlan.subtitle")}</p>
      </div>

      {/* Segment selector — tweaks the example */}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
        <span className="text-xs text-muted-foreground">{t("whyPlan.segmentHint")}</span>
        <div className="inline-flex rounded-full border border-border p-0.5">
          {SEGMENTS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSegment(s)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                segment === s ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t(`segment.${s}`)}
            </button>
          ))}
        </div>
      </div>

      {/* The four "why" cards */}
      <Accordion type="single" collapsible defaultValue="c1" className="mt-6 space-y-2">
        {CARD_KEYS.map((k) => (
          <AccordionItem key={k} value={k} className="rounded-2xl border border-border bg-card px-4">
            <AccordionTrigger
              data-testid={`why-card-${k}`}
              className="py-4 text-left font-heading text-base font-medium hover:no-underline"
            >
              {t(`whyPlan.cards.${k}.q`)}
            </AccordionTrigger>
            <AccordionContent className="pb-4 text-sm leading-relaxed text-muted-foreground">
              {t(`whyPlan.cards.${k}.a`)}
              {k === "c4" && (
                <div className="mt-3 rounded-xl bg-primary/[0.04] p-3 text-foreground/80">
                  {t("whyPlan.example", {
                    target: cur(target),
                    a1: START_EARLY,
                    m1: cur(monthlyFor(target, START_EARLY, EXAMPLE_RETURN)),
                    a2: START_LATE,
                    m2: cur(monthlyFor(target, START_LATE, EXAMPLE_RETURN)),
                  })}
                </div>
              )}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      {/* CTAs */}
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Button size="lg" className="glow-primary" data-testid="why-cta" onClick={begin}>
          {t("whyPlan.cta")}
          <ArrowRight className="size-4" />
        </Button>
        <Button
          size="lg"
          variant="outline"
          onClick={() => {
            setIntroSeen(true);
            setSidebarOpen(true);
          }}
        >
          <Menu className="size-4" />
          {t("whyPlan.openPersonas")}
        </Button>
      </div>
    </div>
  );
}
