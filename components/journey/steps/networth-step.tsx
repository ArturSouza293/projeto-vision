"use client";

import { useTranslations } from "next-intl";
import { Plus, Trash2 } from "@/components/app/icons";

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
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { assetValueBRL, netWorthTotals } from "@/lib/calc";
import { formatPercent } from "@/lib/format";
import { useScrollOnAdd } from "@/lib/use-scroll-on-add";
import { useVisionStore } from "@/lib/store/plan-store";
import type {
  AssetClass,
  AssetOwnership,
  CurrencyCode,
  LiabilityKind,
  PropertyType,
} from "@/lib/types";

const ASSET_CLASSES: AssetClass[] = [
  "cash",
  "investments",
  "pension",
  "real_estate",
  "vehicle",
  "foreign",
  "fgts",
  "business",
  "other",
];
const PROPERTY_TYPES: PropertyType[] = ["house", "apartment", "farm", "land", "commercial"];
const OWNERSHIPS: AssetOwnership[] = ["individual", "joint", "spouse"];
const CURRENCIES: CurrencyCode[] = ["BRL", "USD", "EUR", "GBP"];
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
  const locale = useVisionStore((s) => s.locale);
  const netWorth = useVisionStore((s) => s.activePlan!.netWorth);
  const addAsset = useVisionStore((s) => s.addAsset);
  const updateAsset = useVisionStore((s) => s.updateAsset);
  const removeAsset = useVisionStore((s) => s.removeAsset);
  const addLiability = useVisionStore((s) => s.addLiability);
  const updateLiability = useVisionStore((s) => s.updateLiability);
  const removeLiability = useVisionStore((s) => s.removeLiability);

  const totals = netWorthTotals(netWorth);
  const assetsRef = useScrollOnAdd<HTMLDivElement>(netWorth.assets.length);
  const liabRef = useScrollOnAdd<HTMLDivElement>(netWorth.liabilities.length);
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
        <div ref={assetsRef} className="space-y-2">
          {netWorth.assets.length === 0 && (
            <p className="px-1 py-2 text-xs text-muted-foreground">{t("networth.assetsEmpty")}</p>
          )}
          {netWorth.assets.map((a) => (
            <div key={a.id} className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
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
              {a.assetClass === "real_estate" && (
                <Select
                  value={a.propertyType ?? "house"}
                  onValueChange={(v) => updateAsset(a.id, { propertyType: v as PropertyType })}
                >
                  <SelectTrigger className="w-28 shrink-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROPERTY_TYPES.map((p) => (
                      <SelectItem key={p} value={p}>
                        {t(`propertyType.${p}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {a.assetClass === "fgts" && (
                <Input
                  type="date"
                  value={a.fgtsUseDate ?? ""}
                  aria-label={t("networth.fgtsUseDate")}
                  onChange={(e) => updateAsset(a.id, { fgtsUseDate: e.target.value || undefined })}
                  className="w-36 shrink-0"
                />
              )}
              <label className="flex shrink-0 cursor-pointer items-center gap-1.5 text-xs text-muted-foreground">
                <Checkbox checked={a.liquid} onCheckedChange={(c) => updateAsset(a.id, { liquid: c === true })} />
                <span className="hidden sm:inline">{t("networth.liquid")}</span>
              </label>
              <MoneyInput value={a.value} onChange={(n) => updateAsset(a.id, { value: n })} className="w-28 shrink-0" />
              <Button variant="ghost" size="icon-sm" onClick={() => removeAsset(a.id)}>
                <Trash2 className="size-4 text-muted-foreground" />
              </Button>
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 pl-1 text-xs text-muted-foreground">
                <label className="flex items-center gap-1.5">
                  <span>{t("networth.ownership")}</span>
                  <Select
                    value={a.ownership ?? "individual"}
                    onValueChange={(v) => updateAsset(a.id, { ownership: v as AssetOwnership })}
                  >
                    <SelectTrigger className="h-9 w-28 sm:h-7"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {OWNERSHIPS.map((o) => (
                        <SelectItem key={o} value={o}>{t(`ownership.${o}`)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </label>
                {a.assetClass === "foreign" && (
                  <>
                    <label className="flex items-center gap-1.5">
                      <span>{t("networth.currency")}</span>
                      <Select
                        value={a.currency ?? "BRL"}
                        onValueChange={(v) => updateAsset(a.id, { currency: v as CurrencyCode })}
                      >
                        <SelectTrigger className="h-9 w-20 sm:h-7"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {CURRENCIES.map((c) => (
                            <SelectItem key={c} value={c}>{c}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </label>
                    {a.currency && a.currency !== "BRL" && (
                      <>
                        <label className="flex items-center gap-1">
                          <span>{t("networth.fxRate")}</span>
                          <Input
                            type="number"
                            step="0.01"
                            value={a.fxRate ?? ""}
                            placeholder="—"
                            aria-label={t("networth.fxRate")}
                            onChange={(e) =>
                              updateAsset(a.id, {
                                fxRate: e.target.value === "" ? undefined : e.target.valueAsNumber,
                              })
                            }
                            className="h-9 w-16 tabular-nums sm:h-7"
                          />
                          <span>BRL</span>
                        </label>
                        <span className="tabular-nums">
                          ≈ <Money value={assetValueBRL(a)} compact />
                        </span>
                      </>
                    )}
                  </>
                )}
              </div>
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
        <div ref={liabRef} className="space-y-2">
          {netWorth.liabilities.length === 0 && (
            <p className="px-1 py-2 text-xs text-muted-foreground">{t("networth.liabilitiesEmpty")}</p>
          )}
          {netWorth.liabilities.map((l) => (
            <div key={l.id} className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
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
                <MoneyInput
                  value={l.balance}
                  onChange={(n) => updateLiability(l.id, { balance: n })}
                  ariaLabel={t("networth.balance")}
                  className="w-28 shrink-0"
                />
                <Button variant="ghost" size="icon-sm" onClick={() => removeLiability(l.id)}>
                  <Trash2 className="size-4 text-muted-foreground" />
                </Button>
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 pl-1 text-xs text-muted-foreground">
                <label className="flex items-center gap-1">
                  <span>{t("networth.rate")}</span>
                  <Input
                    type="number"
                    value={l.annualRate ?? ""}
                    placeholder="—"
                    aria-label={t("networth.rate")}
                    onChange={(e) =>
                      updateLiability(l.id, {
                        annualRate: e.target.value === "" ? undefined : e.target.valueAsNumber,
                      })
                    }
                    className="h-9 w-16 tabular-nums sm:h-7"
                  />
                  <span>% a.a.</span>
                </label>
                <label className="flex items-center gap-1">
                  <span>{t("networth.term")}</span>
                  <Input
                    type="number"
                    value={l.termMonths ?? ""}
                    placeholder="—"
                    aria-label={t("networth.term")}
                    onChange={(e) =>
                      updateLiability(l.id, {
                        termMonths: e.target.value === "" ? undefined : e.target.valueAsNumber,
                      })
                    }
                    className="h-9 w-16 tabular-nums sm:h-7"
                  />
                  <span>{t("networth.months")}</span>
                </label>
                <label className="flex items-center gap-1.5">
                  <span>{t("networth.payment")}</span>
                  <MoneyInput
                    value={l.monthlyPayment ?? 0}
                    onChange={(n) => updateLiability(l.id, { monthlyPayment: n || undefined })}
                    ariaLabel={t("networth.payment")}
                    className="h-9 w-24 sm:h-7"
                  />
                </label>
                <label className="flex items-center gap-1.5">
                  <Switch
                    size="sm"
                    checked={l.hasGuarantee ?? false}
                    onCheckedChange={(c) => updateLiability(l.id, { hasGuarantee: c })}
                  />
                  <span>{t("networth.guarantee")}</span>
                </label>
                {netWorth.assets.length > 0 && (
                  <label className="flex items-center gap-1.5">
                    <span>{t("networth.linkedAsset")}</span>
                    <Select
                      value={l.linkedAssetId ?? "none"}
                      onValueChange={(v) =>
                        updateLiability(l.id, { linkedAssetId: v === "none" ? undefined : v })
                      }
                    >
                      <SelectTrigger className="h-9 w-full sm:h-7 sm:w-40"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">{t("networth.linkedNone")}</SelectItem>
                        {netWorth.assets.map((as) => (
                          <SelectItem key={as.id} value={as.id}>
                            {as.label || t(`assetClass.${as.assetClass}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </label>
                )}
              </div>
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
                <span className="ml-auto flex items-baseline gap-2">
                  <Money value={value} compact className="font-medium" />
                  <span className="w-11 text-right text-xs tabular-nums text-muted-foreground">
                    {totals.totalAssets > 0 ? formatPercent(value / totals.totalAssets, locale) : "—"}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
