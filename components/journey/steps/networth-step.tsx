"use client";

import { useTranslations } from "next-intl";
import { Plus, Trash2 } from "lucide-react";

import { Money } from "@/components/app/money";
import { MoneyInput } from "@/components/app/number-field";
import {
  ASSET_CLASS_COLOR,
  NetWorthDonut,
} from "@/components/charts/networth-donut";
import { StepHeader } from "@/components/journey/step-header";
import { StatTile } from "@/components/journey/stat-tile";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { netWorthTotals } from "@/lib/calc";
import { useVisionStore } from "@/lib/store/plan-store";
import type { AssetClass, LiabilityKind } from "@/lib/types";

const ASSET_CLASSES: AssetClass[] = [
  "cash",
  "investments",
  "pension",
  "real_estate",
  "business",
  "other",
];
const LIABILITY_KINDS: LiabilityKind[] = [
  "mortgage",
  "auto",
  "personal",
  "card",
  "consigned",
  "other",
];

export function NetWorthStep() {
  const t = useTranslations();
  const netWorth = useVisionStore((s) => s.activePlan!.netWorth);
  const { addAsset, updateAsset, removeAsset, addLiability, updateLiability, removeLiability } =
    useVisionStore.getState();

  const totals = netWorthTotals(netWorth);
  const legend = (Object.entries(totals.byClass) as [AssetClass, number][]).filter(
    ([, v]) => v > 0,
  );

  return (
    <div className="space-y-5">
      <StepHeader title={t("networth.title")} subtitle={t("networth.subtitle")} />

      {/* Live summary strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label={t("networth.netWorth")} tone={totals.netWorth < 0 ? "negative" : "brand"} value={<Money value={totals.netWorth} compact />} />
        <StatTile label={t("networth.totalAssets")} tone="positive" value={<Money value={totals.totalAssets} compact />} />
        <StatTile label={t("networth.totalLiabilities")} value={<Money value={totals.totalLiabilities} compact />} />
        <StatTile label={t("networth.liquidAssets")} value={<Money value={totals.liquidAssets} compact />} />
      </div>

      {/* Assets */}
      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">{t("networth.assets")}</h3>
          <Button variant="outline" size="sm" onClick={addAsset}>
            <Plus className="size-4" />
            {t("networth.addAsset")}
          </Button>
        </div>
        <div className="space-y-2">
          {netWorth.assets.map((a) => (
            <div key={a.id} className="flex items-center gap-2">
              <Input
                value={a.label}
                placeholder={t("common.label")}
                onChange={(e) => updateAsset(a.id, { label: e.target.value })}
                className="min-w-0 flex-1"
              />
              <Select
                value={a.assetClass}
                onValueChange={(v) => updateAsset(a.id, { assetClass: v as AssetClass })}
              >
                <SelectTrigger className="w-32 shrink-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ASSET_CLASSES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {t(`assetClass.${c}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <label className="flex shrink-0 cursor-pointer items-center gap-1.5 text-xs text-muted-foreground">
                <Checkbox checked={a.liquid} onCheckedChange={(c) => updateAsset(a.id, { liquid: c === true })} />
                <span className="hidden sm:inline">{t("networth.liquid")}</span>
              </label>
              <MoneyInput value={a.value} onChange={(n) => updateAsset(a.id, { value: n })} className="w-28 shrink-0" />
              <Button variant="ghost" size="icon-sm" onClick={() => removeAsset(a.id)}>
                <Trash2 className="size-4 text-muted-foreground" />
              </Button>
            </div>
          ))}
        </div>
      </section>

      {/* Liabilities */}
      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">{t("networth.liabilities")}</h3>
          <Button variant="outline" size="sm" onClick={addLiability}>
            <Plus className="size-4" />
            {t("networth.addLiability")}
          </Button>
        </div>
        <div className="space-y-2">
          {netWorth.liabilities.map((l) => (
            <div key={l.id} className="flex items-center gap-2">
              <Input
                value={l.label}
                placeholder={t("common.label")}
                onChange={(e) => updateLiability(l.id, { label: e.target.value })}
                className="min-w-0 flex-1"
              />
              <Select
                value={l.kind}
                onValueChange={(v) => updateLiability(l.id, { kind: v as LiabilityKind })}
              >
                <SelectTrigger className="w-32 shrink-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LIABILITY_KINDS.map((k) => (
                    <SelectItem key={k} value={k}>
                      {t(`liabilityKind.${k}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="number"
                value={l.annualRate ?? ""}
                placeholder="%"
                aria-label={t("networth.rate")}
                onChange={(e) =>
                  updateLiability(l.id, {
                    annualRate: e.target.value === "" ? undefined : e.target.valueAsNumber,
                  })
                }
                className="w-16 shrink-0 tabular-nums"
              />
              <MoneyInput value={l.balance} onChange={(n) => updateLiability(l.id, { balance: n })} className="w-28 shrink-0" />
              <Button variant="ghost" size="icon-sm" onClick={() => removeLiability(l.id)}>
                <Trash2 className="size-4 text-muted-foreground" />
              </Button>
            </div>
          ))}
        </div>
      </section>

      {/* Composition */}
      {legend.length > 0 && (
        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {t("networth.compositionTitle")}
          </div>
          <NetWorthDonut byClass={totals.byClass} />
          <ul className="mt-3 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {legend.map(([cls, value]) => (
              <li key={cls} className="flex items-center gap-2 text-sm">
                <span className="size-2.5 shrink-0 rounded-full" style={{ background: ASSET_CLASS_COLOR[cls] }} />
                <span className="text-muted-foreground">{t(`assetClass.${cls}`)}</span>
                <Money value={value} compact className="ml-auto font-medium" />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
