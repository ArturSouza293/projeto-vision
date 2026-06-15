"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import { Clock, Plus, Users } from "@/components/app/icons";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { salesforce } from "@/lib/api/salesforce";
import { useVisionStore } from "@/lib/store/plan-store";
import type { ClientSummary, Plan, Segment } from "@/lib/types";
import { cn } from "@/lib/utils";

const SEGMENT_DOT: Record<Segment, string> = {
  retail: "bg-muted-foreground",
  prime: "bg-info",
  principal: "bg-chart-5",
  private: "bg-primary",
};

function planName(p: Plan, fallback: string): string {
  const c = p.clientProfile;
  return c.partnerName
    ? `${c.firstName} & ${c.partnerName}`
    : `${c.firstName} ${c.lastName ?? ""}`.trim() || fallback;
}

function PersonaRow({
  name,
  segment,
  meta,
  active,
  onClick,
  testId,
}: {
  name: string;
  segment: Segment;
  meta?: string;
  active?: boolean;
  onClick: () => void;
  testId?: string;
}) {
  return (
    <button
      type="button"
      data-testid={testId}
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-muted",
        active && "bg-muted",
      )}
    >
      <span className={cn("size-2 shrink-0 rounded-full", SEGMENT_DOT[segment])} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-foreground">{name}</span>
        {meta && <span className="block truncate text-xs text-muted-foreground">{meta}</span>}
      </span>
    </button>
  );
}

function SectionLabel({ icon, children }: { icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="mb-1.5 flex items-center gap-1.5 px-1 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
      {icon}
      {children}
    </div>
  );
}

/** Hidden left drawer: create-new + recents + the persona library (an accelerator). */
export function PersonaSidebar() {
  const t = useTranslations();
  const open = useVisionStore((s) => s.sidebarOpen);
  const setOpen = useVisionStore((s) => s.setSidebarOpen);
  const startNewClient = useVisionStore((s) => s.startNewClient);
  const recentPlans = useVisionStore((s) => s.recentPlans);
  const loadRecentPlan = useVisionStore((s) => s.loadRecentPlan);
  const loadClient = useVisionStore((s) => s.loadClient);
  const loadSavedPersona = useVisionStore((s) => s.loadSavedPersona);
  const savedPersonas = useVisionStore((s) => s.savedPersonas);
  const fetchSavedPersonas = useVisionStore((s) => s.fetchSavedPersonas);
  const activeId = useVisionStore((s) => s.activePlan?.clientId);

  const [seed, setSeed] = useState<ClientSummary[]>([]);
  useEffect(() => {
    salesforce.inbound.fetchQueue().then(setSeed).catch(() => {});
    fetchSavedPersonas();
  }, [fetchSavedPersonas]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side="left" className="flex w-[85vw] max-w-80 flex-col gap-0 p-0">
        <SheetHeader className="border-b border-border px-4 py-4">
          <SheetTitle className="font-heading">{t("sidebar.title")}</SheetTitle>
          <SheetDescription>{t("sidebar.subtitle")}</SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
          <Button className="w-full" onClick={startNewClient}>
            <Plus className="size-4" />
            {t("sidebar.newPlan")}
          </Button>

          <div className="mt-5">
            <SectionLabel icon={<Clock className="size-3.5" />}>{t("sidebar.recent")}</SectionLabel>
            {recentPlans.length === 0 ? (
              <p className="px-2.5 py-1 text-xs text-muted-foreground">{t("sidebar.recentEmpty")}</p>
            ) : (
              <div className="space-y-0.5">
                {recentPlans.map((p) => (
                  <PersonaRow
                    key={p.clientId}
                    name={planName(p, t("intake.newDossier"))}
                    segment={p.clientProfile.segment}
                    meta={t(`segment.${p.clientProfile.segment}`)}
                    active={p.clientId === activeId}
                    onClick={() => loadRecentPlan(p.clientId)}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="mt-5">
            <SectionLabel icon={<Users className="size-3.5" />}>{t("sidebar.personas")}</SectionLabel>
            <div className="space-y-0.5">
              {seed.map((c) => (
                <PersonaRow
                  key={c.id}
                  testId={`persona-${c.id}`}
                  name={c.partnerName ? `${c.firstName} & ${c.partnerName}` : `${c.firstName} ${c.lastName}`}
                  segment={c.segment}
                  meta={t(c.taglineKey)}
                  active={c.id === activeId}
                  onClick={() => loadClient(c.id)}
                />
              ))}
            </div>
          </div>

          {savedPersonas.length > 0 && (
            <div className="mt-5">
              <SectionLabel>{t("library.title")}</SectionLabel>
              <div className="space-y-0.5">
                {savedPersonas.map((sp) => (
                  <PersonaRow
                    key={sp.clientId}
                    name={sp.name}
                    segment={sp.segment}
                    meta={t(`segment.${sp.segment}`)}
                    active={sp.clientId === activeId}
                    onClick={() => loadSavedPersona(sp.clientId)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
