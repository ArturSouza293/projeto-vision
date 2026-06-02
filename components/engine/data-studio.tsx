"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";

import { CashflowStep } from "@/components/journey/steps/cashflow-step";
import { GoalsStep } from "@/components/journey/steps/goals-step";
import { NetWorthStep } from "@/components/journey/steps/networth-step";
import { ProfileStep } from "@/components/journey/steps/profile-step";
import { SuitabilityStep } from "@/components/journey/steps/suitability-step";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useVisionStore, type DataTab } from "@/lib/store/plan-store";
import { cn } from "@/lib/utils";

const TABS: DataTab[] = ["profile", "cashflow", "networth", "suitability", "goals"];

const COMPONENT: Record<DataTab, React.ComponentType> = {
  profile: ProfileStep,
  cashflow: CashflowStep,
  networth: NetWorthStep,
  suitability: SuitabilityStep,
  goals: GoalsStep,
};

export function DataStudio() {
  const t = useTranslations();
  const open = useVisionStore((s) => s.dataDrawerOpen);
  const setOpen = useVisionStore((s) => s.setDataDrawerOpen);
  const tab = useVisionStore((s) => s.dataTab);
  const setDataTab = useVisionStore((s) => s.setDataTab);

  const idx = TABS.indexOf(tab);
  const Active = COMPONENT[tab];
  const isFirst = idx === 0;
  const isLast = idx === TABS.length - 1;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="flex max-h-[88vh] w-[calc(100vw-2rem)] sm:max-w-3xl flex-col gap-0 overflow-hidden p-0">
        <div className="border-b border-border px-5 pt-5 pb-4">
          <DialogHeader className="space-y-1 text-left">
            <DialogTitle className="font-heading text-lg">{t("dataDrawer.title")}</DialogTitle>
            <DialogDescription>{t("dataDrawer.subtitle")}</DialogDescription>
          </DialogHeader>

          <ol className="mt-4 flex items-center gap-1 overflow-x-auto pb-1">
            {TABS.map((tb, i) => {
              const active = tb === tab;
              const done = i < idx;
              return (
                <li key={tb} className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setDataTab(tb)}
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
                      {done ? <Check className="size-3.5" /> : i + 1}
                    </span>
                    <span
                      className={cn(
                        "text-sm whitespace-nowrap transition-colors",
                        active ? "font-medium text-foreground" : "text-muted-foreground group-hover:text-foreground",
                      )}
                    >
                      {t(`dataDrawer.tab.${tb}`)}
                    </span>
                  </button>
                  {i < TABS.length - 1 && <span className="h-px w-4 shrink-0 bg-border" />}
                </li>
              );
            })}
          </ol>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          >
            <Active />
          </motion.div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-border px-5 py-4">
          <Button variant="outline" disabled={isFirst} onClick={() => setDataTab(TABS[idx - 1])}>
            <ArrowLeft className="size-4" />
            {t("common.back")}
          </Button>
          <span className="text-xs text-muted-foreground tabular-nums">
            {t("common.stepOf", { current: idx + 1, total: TABS.length })}
          </span>
          {isLast ? (
            <Button onClick={() => setOpen(false)}>
              <Check className="size-4" />
              {t("dataDrawer.finish")}
            </Button>
          ) : (
            <Button onClick={() => setDataTab(TABS[idx + 1])}>
              {t("common.next")}
              <ArrowRight className="size-4" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
