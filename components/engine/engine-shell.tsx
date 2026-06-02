"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { ChevronLeft, Database, Sparkles } from "lucide-react";

import { BrandMark } from "@/components/app/brand-mark";
import { LocaleToggle } from "@/components/app/locale-toggle";
import { CopilotPanel } from "@/components/advisor-copilot/copilot-panel";
import { DataStudio } from "@/components/engine/data-studio";
import { Output } from "@/components/engine/output";
import { Workspace } from "@/components/engine/workspace";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useVisionStore } from "@/lib/store/plan-store";
import type { EnginePhase } from "@/lib/types";
import { cn } from "@/lib/utils";

const PHASES: EnginePhase[] = ["simulate", "output"];

function PhaseNav() {
  const t = useTranslations();
  const phase = useVisionStore((s) => s.phase);
  const setPhase = useVisionStore((s) => s.setPhase);
  return (
    <div className="relative inline-flex items-center rounded-full border border-border bg-card/60 p-1 text-sm">
      {PHASES.map((p) => {
        const active = phase === p;
        return (
          <button
            key={p}
            type="button"
            onClick={() => setPhase(p)}
            className={cn(
              "relative z-10 rounded-full px-4 py-1.5 font-medium transition-colors",
              active ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {active && (
              <motion.span
                layoutId="phasePill"
                className="absolute inset-0 -z-10 rounded-full bg-primary"
                transition={{ type: "spring", stiffness: 380, damping: 32 }}
              />
            )}
            {p === "simulate" ? t("engine.phaseSimulate") : t("engine.phaseOutput")}
          </button>
        );
      })}
    </div>
  );
}

export function EngineShell() {
  const t = useTranslations();
  const plan = useVisionStore((s) => s.activePlan);
  const phase = useVisionStore((s) => s.phase);
  const closePlan = useVisionStore((s) => s.closePlan);
  const setDataTab = useVisionStore((s) => s.setDataTab);
  const copilotOpen = useVisionStore((s) => s.copilotOpen);
  const setCopilotOpen = useVisionStore((s) => s.setCopilotOpen);
  const toggleCopilot = useVisionStore((s) => s.toggleCopilot);

  if (!plan) return null;
  const p = plan.clientProfile;
  const clientName = p.partnerName
    ? `${p.firstName} & ${p.partnerName}`
    : `${p.firstName} ${p.lastName}`.trim() || t("intake.newDossier");

  return (
    <div className="flex min-h-screen flex-col">
      <header className="glass sticky top-0 z-40 border-b border-border/70">
        <div className="mx-auto grid h-14 w-full max-w-[1400px] grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={closePlan}
              className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ChevronLeft className="size-4" />
              <BrandMark showWordmark={false} />
            </button>
            <div className="hidden min-w-0 items-center gap-2 rounded-full border border-border bg-card/60 px-2.5 py-1 text-xs sm:flex">
              <span className="truncate font-medium text-foreground">{clientName}</span>
              <span className="size-1 shrink-0 rounded-full bg-border" />
              <span className="shrink-0 text-muted-foreground">{t(`segment.${p.segment}`)}</span>
            </div>
          </div>

          <div className="flex justify-center">
            <PhaseNav />
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setDataTab("profile")}>
              <Database className="size-4" />
              <span className="hidden md:inline">{t("engine.data")}</span>
            </Button>
            <LocaleToggle />
            <Button
              variant={copilotOpen ? "default" : "outline"}
              size="sm"
              onClick={toggleCopilot}
              aria-pressed={copilotOpen}
            >
              <Sparkles className="size-4" />
              <span className="hidden lg:inline">{t("engine.copilot")}</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-7 sm:px-6 lg:px-8">
        <motion.div
          key={phase}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
        >
          {phase === "simulate" ? <Workspace /> : <Output />}
        </motion.div>
      </main>

      <DataStudio />

      <Sheet open={copilotOpen} onOpenChange={setCopilotOpen}>
        <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
          <SheetHeader className="border-b border-border">
            <SheetTitle className="font-heading">{t("copilot.title")}</SheetTitle>
            <SheetDescription>{t("copilot.subtitle")}</SheetDescription>
          </SheetHeader>
          <CopilotPanel />
        </SheetContent>
      </Sheet>
    </div>
  );
}
