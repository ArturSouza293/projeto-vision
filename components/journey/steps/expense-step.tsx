"use client";

import { useTranslations } from "next-intl";

import { Plus, Trash2, TriangleAlert } from "@/components/app/icons";
import { MoneyInput } from "@/components/app/number-field";
import { Money } from "@/components/app/money";
import { CartaoSection } from "@/components/engine/cartao-gastos";
import { StepHeader } from "@/components/journey/step-header";
import { StatTile } from "@/components/journey/stat-tile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cashFlowTotals, monthlyDebtService } from "@/lib/calc";
import { formatCurrency, formatPercent } from "@/lib/format";
import { useScrollOnAdd } from "@/lib/use-scroll-on-add";
import { useVisionStore } from "@/lib/store/plan-store";
import type { ExpenseCategory } from "@/lib/types";

// "debt" is intentionally excluded — debt service is derived from the
// liabilities' installments (Patrimônio) to avoid double counting (FPSB).
const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  "housing",
  "living",
  "education",
  "health",
  "card",
  "vehicle",
  "taxes",
  "insurance",
  "lifestyle",
  "other",
];
/** Categories that benefit from a free-text sub-category (e.g. card bucket, IR/IPVA/IPTU). */
const SUBCATEGORY_CATS: ExpenseCategory[] = ["card", "taxes", "insurance", "vehicle"];

export function ExpenseStep() {
  const t = useTranslations();
  const locale = useVisionStore((s) => s.locale);
  const cashFlow = useVisionStore((s) => s.activePlan!.cashFlow);
  const netWorth = useVisionStore((s) => s.activePlan!.netWorth);
  // v10 C4 — cartão (via Open Finance), só nas personas com KYC; informativo.
  const cartao = useVisionStore((s) => s.activePlan!.clientProfile.kyc?.fluxoCaixa.cartao);
  const addExpense = useVisionStore((s) => s.addExpense);
  const updateExpense = useVisionStore((s) => s.updateExpense);
  const removeExpense = useVisionStore((s) => s.removeExpense);
  const updateRetirementIncome = useVisionStore((s) => s.updateRetirementIncome);

  const totals = cashFlowTotals(cashFlow, netWorth);
  const debtService = monthlyDebtService(netWorth);
  const deficit = totals.surplus < 0;
  const listRef = useScrollOnAdd<HTMLDivElement>(cashFlow.expenses.length);
  const essential = cashFlow.expenses
    .filter((e) => e.primary !== false)
    .reduce((s, e) => s + e.monthly, 0);
  const ri = cashFlow.retirementIncome ?? { mode: "percent" as const, value: 70, inss: true };

  return (
    <div className="space-y-5">
      <StepHeader title={t("expense.title")} subtitle={t("expense.subtitle")} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label={t("expense.total")} value={<Money value={totals.expense} compact />} />
        <StatTile label={t("expense.essential")} value={<Money value={essential} compact />} />
        <StatTile
          label={deficit ? t("cashflow.deficit") : t("cashflow.surplus")}
          tone={deficit ? "negative" : "positive"}
          value={<Money value={totals.surplus} compact />}
          hint={t("common.perMonth")}
        />
        <StatTile
          label={t("cashflow.savingsRate")}
          tone={deficit ? "negative" : "default"}
          value={formatPercent(totals.savingsRate, locale)}
        />
      </div>

      {deficit && (
        <div className="flex items-start gap-2 rounded-xl border border-negative/30 bg-negative-muted p-3 text-sm text-negative">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          <span>{t("cashflow.deficitWarning")}</span>
        </div>
      )}

      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">{t("expense.title")}</h3>
          <Button variant="outline" size="sm" onClick={addExpense}>
            <Plus className="size-4" />
            {t("expense.add")}
          </Button>
        </div>
        {debtService > 0 && (
          <div className="mb-3 flex items-start gap-2 rounded-xl border border-info/25 bg-info/5 p-2.5 text-xs leading-snug text-foreground/80">
            <TriangleAlert className="mt-0.5 size-3.5 shrink-0 text-info" />
            <span>
              {t("expense.debtServiceNote", { amount: formatCurrency(debtService, locale) })}
            </span>
          </div>
        )}
        {cashFlow.expenses.length === 0 ? (
          <p className="text-xs text-muted-foreground">{t("expense.empty")}</p>
        ) : (
          <div ref={listRef} className="space-y-3">
            {cashFlow.expenses.map((item) => {
              const primary = item.primary !== false;
              const commitment = totals.income > 0 ? item.monthly / totals.income : 0;
              return (
                <div key={item.id} className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Input
                      value={item.label}
                      placeholder={t("common.label")}
                      onChange={(e) => updateExpense(item.id, { label: e.target.value })}
                      className="min-w-0 flex-1"
                    />
                    <Select
                      value={item.category}
                      onValueChange={(v) => updateExpense(item.id, { category: v as ExpenseCategory })}
                    >
                      <SelectTrigger className="w-32 shrink-0">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {EXPENSE_CATEGORIES.map((c) => (
                          <SelectItem key={c} value={c}>
                            {t(`expenseCategory.${c}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <MoneyInput
                      value={item.monthly}
                      onChange={(n) => updateExpense(item.id, { monthly: n })}
                      className="w-28 shrink-0"
                    />
                    <Button variant="ghost" size="icon-sm" onClick={() => removeExpense(item.id)}>
                      <Trash2 className="size-4 text-muted-foreground" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 pl-1 text-xs text-muted-foreground">
                    <label className="flex items-center gap-1.5">
                      <Switch
                        size="sm"
                        checked={primary}
                        onCheckedChange={(c) => updateExpense(item.id, { primary: c })}
                      />
                      <span className={primary ? "text-foreground" : ""}>
                        {primary ? t("expense.primary") : t("expense.secondary")}
                      </span>
                    </label>
                    <span className="tabular-nums">
                      {t("expense.commitment", { pct: formatPercent(commitment, locale) })}
                    </span>
                    {SUBCATEGORY_CATS.includes(item.category) && (
                      <Input
                        value={item.subcategory ?? ""}
                        placeholder={t("expense.subcategory")}
                        onChange={(e) => updateExpense(item.id, { subcategory: e.target.value || undefined })}
                        className="h-7 w-full text-xs sm:w-40"
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* v10 C4 — planilha de gastos do cartão (mock, via Open Finance) */}
      {cartao && <CartaoSection cartao={cartao} />}

      {/* Retirement income link */}
      <section className="space-y-3 rounded-2xl border border-border bg-card p-5">
        <div>
          <h3 className="text-sm font-semibold text-foreground">{t("expense.retirement.title")}</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">{t("expense.retirement.subtitle")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Select
            value={ri.mode}
            onValueChange={(v) => updateRetirementIncome({ mode: v as "percent" | "nominal" })}
          >
            <SelectTrigger className="w-44 shrink-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="percent">{t("expense.retirement.percent")}</SelectItem>
              <SelectItem value="nominal">{t("expense.retirement.nominal")}</SelectItem>
            </SelectContent>
          </Select>
          {ri.mode === "percent" ? (
            <div className="flex items-center gap-1.5">
              <Input
                type="number"
                min={0}
                max={200}
                value={Number.isFinite(ri.value) ? ri.value : 0}
                onChange={(e) =>
                  updateRetirementIncome({
                    value: Number.isNaN(e.target.valueAsNumber) ? 0 : e.target.valueAsNumber,
                  })
                }
                className="w-20 tabular-nums"
              />
              <span className="text-sm text-muted-foreground">{t("expense.retirement.ofIncome")}</span>
            </div>
          ) : (
            <MoneyInput
              value={ri.value}
              onChange={(n) => updateRetirementIncome({ value: n })}
              ariaLabel={t("expense.retirement.nominal")}
              className="w-32"
            />
          )}
          <label className="flex items-center gap-2 text-sm text-foreground">
            <Switch checked={ri.inss} onCheckedChange={(c) => updateRetirementIncome({ inss: c })} />
            {t("expense.retirement.inss")}
          </label>
        </div>
      </section>
    </div>
  );
}
