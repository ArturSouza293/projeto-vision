"use client";

/**
 * C8 — objetivo de renda para USUFRUTO (pós parar de trabalhar). Toggle
 * "economicamente ativo" (inativo = modo manutenção) + derivação BIDIRECIONAL
 * renda↔capital (preencher um deriva o outro) + horizonte customizável (perpétuo
 * preserva o principal; finito permite renda além da longevidade — "maior
 * incapaz"). Números do motor (lib/usufruto reusa o mathcore) — Regra Zero.
 */
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Infinity as InfinityIcon, Landmark } from "lucide-react";

import { MoneyInput } from "@/components/app/number-field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { formatCurrency } from "@/lib/format";
import type { Locale } from "@/lib/types";
import { capitalNecessario, rendaSustentavel } from "@/lib/usufruto";

export function UsufrutoPanel({
  retornoRealAA,
  locale,
}: {
  retornoRealAA: number;
  locale: Locale;
}) {
  const t = useTranslations();
  const [ativo, setAtivo] = useState(true);
  const [perpetuo, setPerpetuo] = useState(false);
  const [horizonte, setHorizonte] = useState(35);
  const [renda, setRenda] = useState(0);
  const [capital, setCapital] = useState(0);
  const [last, setLast] = useState<"renda" | "capital">("renda");

  // Recomputa o lado derivado quando horizonte/perpétuo/retorno mudam.
  useEffect(() => {
    if (last === "renda") setCapital(capitalNecessario(renda, retornoRealAA, horizonte, perpetuo));
    else setRenda(rendaSustentavel(capital, retornoRealAA, horizonte, perpetuo));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [horizonte, perpetuo, retornoRealAA]);

  const onRenda = (v: number) => {
    setRenda(v);
    setLast("renda");
    setCapital(capitalNecessario(v, retornoRealAA, horizonte, perpetuo));
  };
  const onCapital = (v: number) => {
    setCapital(v);
    setLast("capital");
    setRenda(rendaSustentavel(v, retornoRealAA, horizonte, perpetuo));
  };

  return (
    <section className="flex flex-col rounded-2xl border border-border bg-card p-4 sm:p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 font-heading text-sm font-semibold text-foreground">
          <Landmark className="size-4 text-primary" />
          {t("usufruto.title")}
        </h3>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          {t("usufruto.economicallyActive")}
          <Switch checked={ativo} onCheckedChange={setAtivo} />
        </label>
      </div>

      {!ativo && (
        <p className="mb-3 rounded-lg bg-info/[0.06] px-3 py-1.5 text-xs text-info">
          {t("usufruto.maintenanceMode")}
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-[11px] tracking-wide text-muted-foreground uppercase">
            {t("usufruto.targetIncome")}
          </span>
          <MoneyInput value={renda} onChange={onRenda} ariaLabel={t("usufruto.targetIncome")} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-[11px] tracking-wide text-muted-foreground uppercase">
            {t("usufruto.targetCapital")}
          </span>
          <MoneyInput value={capital} onChange={onCapital} ariaLabel={t("usufruto.targetCapital")} />
        </label>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={perpetuo} onCheckedChange={setPerpetuo} />
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <InfinityIcon className="size-3.5" /> {t("usufruto.perpetual")}
          </span>
        </label>
        {!perpetuo && (
          <label className="flex items-center gap-2 text-sm">
            <span className="text-[11px] tracking-wide text-muted-foreground uppercase">
              {t("usufruto.horizon")}
            </span>
            <Input
              inputMode="numeric"
              aria-label={t("usufruto.horizon")}
              value={String(horizonte)}
              onChange={(e) => setHorizonte(Math.max(0, parseInt(e.target.value.replace(/\D/g, "") || "0", 10)))}
              className="w-20 tabular-nums"
            />
            <span className="text-muted-foreground">{t("usufruto.years")}</span>
          </label>
        )}
      </div>

      <div className="mt-3 rounded-lg bg-muted/50 px-3 py-2 text-[11px] text-muted-foreground">
        <span className="font-medium text-foreground/70">{t("usufruto.formula")}:</span>{" "}
        <code className="text-foreground/80">
          {perpetuo ? t("usufruto.formulaPerpetual") : t("usufruto.formulaFinite")}
        </code>
        <br />
        {t("usufruto.realReturn")}: <span className="tabular-nums">{(retornoRealAA * 100).toFixed(1)}%</span>
        {" · "}
        {capital > 0 ? formatCurrency(capital, locale) : "—"}
        {" ↔ "}
        {renda > 0 ? `${formatCurrency(renda, locale)}/${t("usufruto.month")}` : "—"}
      </div>
    </section>
  );
}
