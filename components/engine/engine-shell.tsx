"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Database, EllipsisVertical, LogOut, Menu, Plus, Save, ScanFace, Sparkles } from "@/components/app/icons";

import { BradescoLogo } from "@/components/app/bradesco-logo";
import { LocaleToggle } from "@/components/app/locale-toggle";
import { CopilotPanel } from "@/components/advisor-copilot/copilot-panel";
import { Client360Modal } from "@/components/engine/client-360-modal";
import { DataStudio } from "@/components/engine/data-studio";
import { kycFor } from "@/lib/kyc";
import { Output } from "@/components/engine/output";
import { PersonaSidebar } from "@/components/engine/persona-sidebar";
import { WhyPlan } from "@/components/engine/why-plan";
import { Workspace } from "@/components/engine/workspace";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

/** Empty state shown in the centre when no plan is open. */
function Welcome() {
  const t = useTranslations();
  const advisorName = useVisionStore((s) => s.advisorName);
  const startNewClient = useVisionStore((s) => s.startNewClient);
  const setSidebarOpen = useVisionStore((s) => s.setSidebarOpen);
  return (
    <div className="grid place-items-center py-12 text-center sm:py-24">
      <div className="max-w-md">
        <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          {t("welcome.title", { name: advisorName })}
        </h1>
        <p className="mt-2 text-muted-foreground">{t("welcome.subtitle")}</p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Button size="lg" onClick={startNewClient}>
            <Plus className="size-4" />
            {t("sidebar.newPlan")}
          </Button>
          <Button size="lg" variant="outline" onClick={() => setSidebarOpen(true)}>
            <Menu className="size-4" />
            {t("welcome.openPersonas")}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function EngineShell() {
  const t = useTranslations();
  const plan = useVisionStore((s) => s.activePlan);
  const introSeen = useVisionStore((s) => s.introSeen);
  const phase = useVisionStore((s) => s.phase);
  const closePlan = useVisionStore((s) => s.closePlan);
  const setDataTab = useVisionStore((s) => s.setDataTab);
  const copilotOpen = useVisionStore((s) => s.copilotOpen);
  const setCopilotOpen = useVisionStore((s) => s.setCopilotOpen);
  const toggleCopilot = useVisionStore((s) => s.toggleCopilot);
  const savePlan = useVisionStore((s) => s.savePlan);
  const setSidebarOpen = useVisionStore((s) => s.setSidebarOpen);
  const advisorName = useVisionStore((s) => s.advisorName);
  const logout = useVisionStore((s) => s.logout);

  // v8 — Visão 360 (drawer). Só aparece no workspace de uma persona seed
  // (resolvido pelo clientId via kycFor, robusto a snapshot persistido velho).
  // Casos criados do zero têm clientId aleatório → sem 360.
  const [vision360Open, setVision360Open] = useState(false);
  const hasKyc = Boolean(plan && kycFor(plan));

  async function handleSave() {
    const res = await savePlan();
    if (res.synced) {
      toast.success(t("library.saved"));
    } else if (res.error === "no-plan") {
      // nothing to save
    } else if (res.error === "db-not-configured") {
      toast.success(t("library.savedLocal"));
    } else {
      // Saved locally; surface the DB's REAL cause instead of a generic message.
      toast.warning(t("library.syncError", { cause: res.error ?? "?" }));
    }
  }

  const clientName = plan
    ? plan.clientProfile.partnerName
      ? `${plan.clientProfile.firstName} & ${plan.clientProfile.partnerName}`
      : `${plan.clientProfile.firstName} ${plan.clientProfile.lastName}`.trim() ||
        t("intake.newDossier")
    : "";

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 bg-primary text-white">
        <div className="mx-auto flex h-14 w-full max-w-[1400px] items-center gap-3 px-4 sm:px-6">
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            <button
              type="button"
              data-testid="open-sidebar"
              onClick={() => setSidebarOpen(true)}
              aria-label={t("sidebar.open")}
              className="grid size-8 shrink-0 place-items-center rounded-full text-white/90 transition-colors hover:bg-white/15"
            >
              <Menu className="size-5" />
            </button>
            <button
              type="button"
              onClick={closePlan}
              className="shrink-0 text-white/95 transition-colors hover:text-white"
              aria-label={t("welcome.home")}
            >
              <BradescoLogo />
            </button>
            {plan && (
              <div className="hidden min-w-0 items-center gap-2 rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-xs sm:flex">
                <span className="truncate font-medium text-white">{clientName}</span>
                <span className="size-1 shrink-0 rounded-full bg-white/40" />
                <span className="shrink-0 text-white/70">{t(`segment.${plan.clientProfile.segment}`)}</span>
              </div>
            )}
          </div>

          {plan && (
            <div className="hidden shrink-0 justify-center xl:flex">
              <PhaseNav />
            </div>
          )}

          <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
            {plan && (
              <>
                {/* Desktop (md+): individual action buttons. Below md they
                    collapse into the overflow menu so the header never overflows. */}
                {hasKyc && (
                  <Button
                    variant="outline"
                    size="sm"
                    data-testid="open-vision-360"
                    onClick={() => setVision360Open(true)}
                    title={t("vision360.tooltip")}
                    className={cn("hidden xl:inline-flex", headerBtn)}
                  >
                    <ScanFace className="size-4" />
                    <span className="hidden md:inline">{t("vision360.open")}</span>
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  data-testid="open-data"
                  onClick={() => setDataTab("profile")}
                  className={cn("hidden xl:inline-flex", headerBtn)}
                >
                  <Database className="size-4" />
                  <span className="hidden md:inline">{t("engine.data")}</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSave}
                  className={cn("hidden xl:inline-flex", headerBtn)}
                >
                  <Save className="size-4" />
                  <span className="hidden md:inline">{t("library.save")}</span>
                </Button>
                {/* Copilot (BIA) — primary action, visible on every size. */}
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
              </>
            )}

            {/* Overflow menu (phones/tablets < md): secondary actions + logout,
                so every action stays reachable without crowding the header. */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label={t("common.more")}
                  className={cn("xl:hidden", headerBtn)}
                >
                  <EllipsisVertical className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {plan && (
                  <>
                    {hasKyc && (
                      <DropdownMenuItem className="py-2.5" onSelect={() => setVision360Open(true)}>
                        <ScanFace className="size-4" />
                        {t("vision360.open")}
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem className="py-2.5" onSelect={() => setDataTab("profile")}>
                      <Database className="size-4" />
                      {t("engine.data")}
                    </DropdownMenuItem>
                    <DropdownMenuItem className="py-2.5" onSelect={handleSave}>
                      <Save className="size-4" />
                      {t("library.save")}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem variant="destructive" className="py-2.5" onSelect={logout}>
                  <LogOut className="size-4" />
                  {t("login.logout")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <LocaleToggle tone="inverse" />
            {/* Desktop advisor identity + logout (md+); below md logout lives in
                the overflow menu above. */}
            <div className="hidden items-center gap-1.5 pl-1 xl:flex">
              <span className="max-w-28 truncate text-xs font-medium text-white/85">{advisorName}</span>
              <button
                type="button"
                onClick={logout}
                aria-label={t("login.logout")}
                className="grid size-8 shrink-0 place-items-center rounded-full text-white/80 transition-colors hover:bg-white/15 hover:text-white"
              >
                <LogOut className="size-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Mobile phase switcher — its own full-width row so the top bar stays
            uncrowded (desktop keeps the centered nav inside the bar). */}
        {plan && (
          <div className="flex justify-center border-t border-white/15 px-4 py-1.5 xl:hidden">
            <PhaseNav />
          </div>
        )}
      </header>

      <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-7 sm:px-6 lg:px-8">
        {plan ? (
          <motion.div
            key={phase}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          >
            {phase === "simulate" ? <Workspace /> : <Output />}
          </motion.div>
        ) : introSeen ? (
          <Welcome />
        ) : (
          <WhyPlan />
        )}
      </main>

      <PersonaSidebar />
      <DataStudio />
      <Client360Modal open={vision360Open} onOpenChange={setVision360Open} />

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
