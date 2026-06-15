"use client";

import { useTranslations } from "next-intl";

import { Plus, Trash2 } from "@/components/app/icons";
import { MoneyInput } from "@/components/app/number-field";
import { Money } from "@/components/app/money";
import { StepHeader } from "@/components/journey/step-header";
import { StatTile } from "@/components/journey/stat-tile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useScrollOnAdd } from "@/lib/use-scroll-on-add";
import { useVisionStore } from "@/lib/store/plan-store";
import type { IncomeKind, Periodicity } from "@/lib/types";

const INCOME_KINDS: IncomeKind[] = [
  "salary",
  "pro_labore",
  "rent",
  "investments",
  "pension",
  "bonus",
  "plr",
  "thirteenth",
  "other",
];
const EVENT_KINDS: IncomeKind[] = ["bonus", "plr", "thirteenth"];
const PERIODICITIES: Periodicity[] = ["once", "annual", "thirteenth"];

const isEventKind = (k: IncomeKind) => EVENT_KINDS.includes(k);

export function IncomeStep() {
  const t = useTranslations();
  const incomes = useVisionStore((s) => s.activePlan!.cashFlow.incomes);
  const addIncome = useVisionStore((s) => s.addIncome);
  const updateIncome = useVisionStore((s) => s.updateIncome);
  const removeIncome = useVisionStore((s) => s.removeIncome);

  const isEvent = (i: (typeof incomes)[number]) => i.recurring === false || isEventKind(i.kind);
  const recurringMonthly = incomes.filter((i) => !isEvent(i)).reduce((s, i) => s + i.monthly, 0);
  const eventsTotal = incomes.filter(isEvent).reduce((s, i) => s + i.monthly, 0);
  const listRef = useScrollOnAdd<HTMLDivElement>(incomes.length);

  return (
    <div className="space-y-5">
      <StepHeader title={t("income.title")} subtitle={t("income.subtitle")} />

      <div className="grid grid-cols-2 gap-3">
        <StatTile
          label={t("income.recurringMonthly")}
          tone="positive"
          value={<Money value={recurringMonthly} />}
          hint={t("common.perMonth")}
        />
        <StatTile
          label={t("income.eventsTotal")}
          value={<Money value={eventsTotal} compact />}
          hint={t("income.eventsHint")}
        />
      </div>

      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">{t("income.title")}</h3>
          <Button variant="outline" size="sm" onClick={addIncome}>
            <Plus className="size-4" />
            {t("income.add")}
          </Button>
        </div>
        {incomes.length === 0 ? (
          <p className="text-xs text-muted-foreground">{t("income.empty")}</p>
        ) : (
          <div ref={listRef} className="space-y-2">
            {incomes.map((item) => {
              const event = isEvent(item);
              return (
                <div key={item.id} className="flex flex-wrap items-center gap-2">
                  <Input
                    value={item.label}
                    placeholder={t("common.label")}
                    onChange={(e) => updateIncome(item.id, { label: e.target.value })}
                    className="w-full min-w-0 sm:flex-1"
                  />
                  <Select
                    value={item.kind}
                    onValueChange={(v) =>
                      updateIncome(item.id, {
                        kind: v as IncomeKind,
                        recurring: !isEventKind(v as IncomeKind),
                      })
                    }
                  >
                    <SelectTrigger className="w-32 shrink-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {INCOME_KINDS.map((k) => (
                        <SelectItem key={k} value={k}>
                          {t(`incomeKind.${k}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {event && (
                    <Select
                      value={item.periodicity ?? "annual"}
                      onValueChange={(v) => updateIncome(item.id, { periodicity: v as Periodicity })}
                    >
                      <SelectTrigger className="w-28 shrink-0">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PERIODICITIES.map((p) => (
                          <SelectItem key={p} value={p}>
                            {t(`periodicity.${p}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  <MoneyInput
                    value={item.monthly}
                    onChange={(n) => updateIncome(item.id, { monthly: n })}
                    ariaLabel={event ? t("income.eventAmount") : t("common.amount")}
                    className="w-28 shrink-0"
                  />
                  <Button variant="ghost" size="icon-sm" onClick={() => removeIncome(item.id)}>
                    <Trash2 className="size-4 text-muted-foreground" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
