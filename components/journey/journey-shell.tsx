"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Cloud,
  Sparkles,
} from "lucide-react";

import { CopilotPanel } from "@/components/advisor-copilot/copilot-panel";
import { LocaleToggle } from "@/components/app/locale-toggle";
import { TopBar } from "@/components/app/top-bar";
import { StepRouter } from "@/components/journey/step-router";
import { Stepper } from "@/components/journey/stepper";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { nextStepId, prevStepId } from "@/lib/journey";
import { useVisionStore } from "@/lib/store/plan-store";
import { cn } from "@/lib/utils";

function SaveButton() {
  const t = useTranslations();
  const savePlan = useVisionStore((s) => s.savePlan);
  const busy = useVisionStore((s) => s.busy);
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={busy}
      onClick={async () => {
        await savePlan();
        toast.success(t("common.saved"));
      }}
    >
      <Cloud className="size-4" />
      <span className="hidden sm:inline">{t("topbar.save")}</span>
    </Button>
  );
}

export function JourneyShell() {
  const t = useTranslations();
  const plan = useVisionStore((s) => s.activePlan);
  const current = useVisionStore((s) => s.currentStepId);
  const setCurrentStep = useVisionStore((s) => s.setCurrentStep);
  const closePlan = useVisionStore((s) => s.closePlan);
  const copilotOpen = useVisionStore((s) => s.copilotOpen);
  const setCopilotOpen = useVisionStore((s) => s.setCopilotOpen);
  const toggleCopilot = useVisionStore((s) => s.toggleCopilot);

  if (!plan) return null;

  const p = plan.clientProfile;
  const clientName = p.partnerName
    ? `${p.firstName} & ${p.partnerName}`
    : `${p.firstName} ${p.lastName}`.trim() || t("entry.newClient");

  const prev = prevStepId(current);
  const next = nextStepId(current);

  return (
    <div className="flex min-h-screen flex-col">
      <TopBar onBrandClick={closePlan}>
        <div className="mr-1 hidden items-center gap-2 rounded-full border border-border bg-card px-2.5 py-1 text-xs text-muted-foreground sm:flex">
          <span className="font-medium text-foreground">{clientName}</span>
          <span className="size-1 rounded-full bg-border" />
          <span>{t(`segment.${p.segment}`)}</span>
        </div>
        <SaveButton />
        <LocaleToggle />
        <Button
          variant={copilotOpen ? "default" : "outline"}
          size="sm"
          onClick={toggleCopilot}
          aria-pressed={copilotOpen}
        >
          <Sparkles className="size-4" />
          <span className="hidden md:inline">{t("copilot.title")}</span>
        </Button>
      </TopBar>

      <Stepper />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <motion.div
          key={current}
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        >
          <StepRouter stepId={current} />
        </motion.div>

        <div
          className={cn(
            "mt-10 flex items-center gap-3",
            prev ? "justify-between" : "justify-end",
          )}
        >
          {prev && (
            <Button variant="outline" onClick={() => setCurrentStep(prev)}>
              <ChevronLeft className="size-4" />
              {t("common.back")}
            </Button>
          )}
          {next ? (
            <Button onClick={() => setCurrentStep(next)}>
              {t("common.next")}
              <ChevronRight className="size-4" />
            </Button>
          ) : (
            <Button variant="outline" onClick={closePlan}>
              <Check className="size-4" />
              {t("topbar.backToClients")}
            </Button>
          )}
        </div>
      </main>

      <Sheet open={copilotOpen} onOpenChange={setCopilotOpen}>
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 p-0 sm:max-w-md"
        >
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
