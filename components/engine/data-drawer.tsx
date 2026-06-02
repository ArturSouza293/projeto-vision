"use client";

import { useTranslations } from "next-intl";

import { CashflowStep } from "@/components/journey/steps/cashflow-step";
import { GoalsStep } from "@/components/journey/steps/goals-step";
import { NetWorthStep } from "@/components/journey/steps/networth-step";
import { ProfileStep } from "@/components/journey/steps/profile-step";
import { SuitabilityStep } from "@/components/journey/steps/suitability-step";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useVisionStore, type DataTab } from "@/lib/store/plan-store";

const TABS: DataTab[] = ["profile", "cashflow", "networth", "suitability", "goals"];

export function DataDrawer() {
  const t = useTranslations();
  const open = useVisionStore((s) => s.dataDrawerOpen);
  const setOpen = useVisionStore((s) => s.setDataDrawerOpen);
  const tab = useVisionStore((s) => s.dataTab);
  const setDataTab = useVisionStore((s) => s.setDataTab);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-3xl">
        <SheetHeader className="border-b border-border">
          <SheetTitle className="font-heading">{t("dataDrawer.title")}</SheetTitle>
          <SheetDescription>{t("dataDrawer.subtitle")}</SheetDescription>
        </SheetHeader>
        <Tabs
          value={tab}
          onValueChange={(v) => setDataTab(v as DataTab)}
          className="flex min-h-0 flex-1 flex-col"
        >
          <TabsList className="mx-5 mt-4 w-[calc(100%-2.5rem)] justify-start overflow-x-auto">
            {TABS.map((tb) => (
              <TabsTrigger key={tb} value={tb}>
                {t(`dataDrawer.tab.${tb}`)}
              </TabsTrigger>
            ))}
          </TabsList>
          <div className="min-h-0 flex-1 overflow-y-auto p-5">
            <TabsContent value="profile"><ProfileStep /></TabsContent>
            <TabsContent value="cashflow"><CashflowStep /></TabsContent>
            <TabsContent value="networth"><NetWorthStep /></TabsContent>
            <TabsContent value="suitability"><SuitabilityStep /></TabsContent>
            <TabsContent value="goals"><GoalsStep /></TabsContent>
          </div>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
