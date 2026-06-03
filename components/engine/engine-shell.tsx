"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { ChevronLeft, Database, Save, Sparkles } from "@/components/app/icons";

import { BradescoLogo } from "@/components/app/bradesco-logo";
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

/** White-outline button styling for the red brand header. */
const headerBtn = "border-white/30 bg-transparent text-white hover:bg-white/15 hover:text-white";

function PhaseNav() {
  const t = useTranslations();
  const phase = useVisionStore((s) => s.phase);
  const setPhase = useVisionStore((s) => s.setPhase);
  return (
    <div className="relative inline-flex items-center rounded-full border border-white/25 bg-white/15 p-1 text-sm">
      {PHASES.map((p) => {
        const active = phase === p;
        return (
          <button
            key={p}
            type="button"
            onClick={() => setPhase(p)}
            className={cn(
              "relative z-10 rounded-full px-4 py-1.5 font-medium transition-colors",
              active ? "text-primary" : "text-white/75 hover:text-white",
            )}
          >
            {active && (
              <motion.span
                layoutId="phasePill"
                className="absolute inset-0 -z-10 rounded-full bg-white"
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
  const savePlan = useVisionStore((s) => s.savePlan);

  async function handleSave() {
    try {
      await savePlan();
      toast.success(t("library.saved"));
    } catch (e) {
      toast.error(
        e instanceof Error && e.message === "not-configured"
          ? t("library.notConfigured")
          : t("library.saveError"),
      );
    }
  }

  if (!plan) return null;
  const p = plan.clientProfile;
  const clientName = p.partnerName
    ? `${p.firstName} & ${p.partnerName}`
    : `${p.firstName} ${p.lastName}`.trim() || t("intake.newDossier");

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 bg-primary text-white">
        <div className="mx-auto grid h-14 w-full max-w-[1400px] grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={closePlan}
              className="flex items-center gap-1.5 text-white/90 transition-colors hover:text-white"
            >
              <ChevronLeft className="size-4" />
              <BradescoLogo />
            </button>
            <div className="hidden min-w-0 items-center gap-2 rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-xs sm:flex">
              <span className="truncate font-medium text-white">{clientName}</span>
              <span className="size-1 shrink-0 rounded-full bg-white/40" />
              <span className="shrink-0 text-white/70">{t(`segment.${p.segment}`)}</span>
            </div>
          </div>

          <div className="flex justify-center">
            <PhaseNav />
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setDataTab("profile")} className={headerBtn}>
              <Database className="size-4" />
              <span className="hidden md:inline">{t("engine.data")}</span>
            </Button>
            <Button variant="outline" size="sm" onClick={handleSave} className={headerBtn}>
              <Save className="size-4" />
              <span className="hidden md:inline">{t("library.save")}</span>
            </Button>
            <LocaleToggle tone="inverse" />
            <Button
              variant="outline"
              size="sm"
              onClick={toggleCopilot}
              aria-pressed={copilotOpen}
              className={
                copilotOpen
                  ? "border-white bg-white text-primary hover:bg-white/90 hover:text-primary"
                  : headerBtn
              }
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
