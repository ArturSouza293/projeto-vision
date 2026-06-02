"use client";

import { useTranslations } from "next-intl";
import { Plus, Trash2, TriangleAlert } from "@/components/app/icons";

import { MoneyInput } from "@/components/app/number-field";
import { StepHeader } from "@/components/journey/step-header";
import { StatTile } from "@/components/journey/stat-tile";
import { Money } from "@/components/app/money";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cashFlowTotals } from "@/lib/calc";
import { formatPercent } from "@/lib/format";
import { useVisionStore } from "@/lib/store/plan-store";
import type { ExpenseCategory, IncomeKind } from "@/lib/types";

const INCOME_KINDS: IncomeKind[] = [
  "salary",
  "pro_labore",
  "rent",
  "investments",
  "pension",
  "other",
];
const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  "housing",
  "living",
  "education",
  "health",
  "debt",
  "lifestyle",
  "other",
];

function KindSelect({
  value,
  onChange,
  ns,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  ns: string;
  options: string[];
}) {
  const t = useTranslations();
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-32 shrink-0">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o} value={o}>
            {t(`${ns}.${o}`)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function CashflowStep() {
  const t = useTranslations();
  const locale = useVisionStore((s) => s.locale);
  const cashFlow = useVisionStore((s) => s.activePlan!.cashFlow);
  const { addIncome, updateIncome, removeIncome, addExpense, updateExpense, removeExpense } =
    useVisionStore.getState();

  const totals = cashFlowTotals(cashFlow);
  const deficit = totals.surplus < 0;

  return (
    <div className="space-y-5">
      <StepHeader title={t("cashflow.title")} subtitle={t("cashflow.subtitle")} />

      {/* Live summary strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile
          label={deficit ? t("cashflow.deficit") : t("cashflow.surplus")}
          tone={deficit ? "negative" : "positive"}
          value={<Money value={totals.surplus} />}
          hint={t("common.perMonth")}
        />
        <StatTile
          label={t("cashflow.savingsRate")}
          tone={deficit ? "negative" : "default"}
          value={formatPercent(totals.savingsRate, locale)}
        />
        <StatTile label={t("cashflow.totalIncome")} tone="positive" value={<Money value={totals.income} compact />} />
        <StatTile label={t("cashflow.totalExpense")} value={<Money value={totals.expense} compact />} />
      </div>

      {deficit && (
        <div className="flex items-start gap-2 rounded-xl border border-negative/30 bg-negative-muted p-3 text-sm text-negative">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          <span>{t("cashflow.deficitWarning")}</span>
        </div>
      )}

      {/* Income */}
      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">{t("cashflow.income")}</h3>
          <Button variant="outline" size="sm" onClick={addIncome}>
            <Plus className="size-4" />
            {t("cashflow.addIncome")}
          </Button>
        </div>
        <div className="space-y-2">
          {cashFlow.incomes.map((item) => (
            <div key={item.id} className="flex items-center gap-2">
              <Input
                value={item.label}
                placeholder={t("common.label")}
                onChange={(e) => updateIncome(item.id, { label: e.target.value })}
                className="min-w-0 flex-1"
              />
              <KindSelect
                value={item.kind}
                onChange={(v) => updateIncome(item.id, { kind: v as IncomeKind })}
                ns="incomeKind"
                options={INCOME_KINDS}
              />
              <MoneyInput
                value={item.monthly}
                onChange={(n) => updateIncome(item.id, { monthly: n })}
                className="w-28 shrink-0"
              />
              <Button variant="ghost" size="icon-sm" onClick={() => removeIncome(item.id)}>
                <Trash2 className="size-4 text-muted-foreground" />
              </Button>
            </div>
          ))}
        </div>
      </section>

      {/* Expenses */}
      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">{t("cashflow.expenses")}</h3>
          <Button variant="outline" size="sm" onClick={addExpense}>
            <Plus className="size-4" />
            {t("cashflow.addExpense")}
          </Button>
        </div>
        <div className="space-y-2">
          {cashFlow.expenses.map((item) => (
            <div key={item.id} className="flex items-center gap-2">
              <Input
                value={item.label}
                placeholder={t("common.label")}
                onChange={(e) => updateExpense(item.id, { label: e.target.value })}
                className="min-w-0 flex-1"
              />
              <KindSelect
                value={item.category}
                onChange={(v) => updateExpense(item.id, { category: v as ExpenseCategory })}
                ns="expenseCategory"
                options={EXPENSE_CATEGORIES}
              />
              <MoneyInput
                value={item.monthly}
                onChange={(n) => updateExpense(item.id, { monthly: n })}
                className="w-28 shrink-0"
              />
              <Button variant="ghost" size="icon-sm" onClick={() => removeExpense(item.id)}>
                <Trash2 className="size-4 text-muted-foreground" />
              </Button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
