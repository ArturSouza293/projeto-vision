"use client";

/**
 * C3 — Visão Carteira: alocação ATUAL × RECOMENDADA (pelo perfil) + FIT/gaps.
 * Carteira = MOCK (marcado). "Usar IA para ler a carteira": a BIA classificaria
 * os ativos; com a BIA offline (D1), cai no FIT DETERMINÍSTICO (badge "modo
 * offline"). O motor (lib/portfolio) calcula o FIT — Regra Zero.
 */
import { useTranslations } from "next-intl";
import { PieChart, Sparkles } from "lucide-react";

import { SourceBadge } from "@/components/app/data-source";
import {
  CARTEIRA_RECOMENDADA,
  CLASSES_CARTEIRA,
  carteiraAtual,
  fitCarteira,
  type ClasseCarteira,
} from "@/lib/portfolio";
import type { Plan } from "@/lib/types";
import { cn } from "@/lib/utils";

const CLASS_COLOR: Record<ClasseCarteira, string> = {
  liquidez: "bg-chart-1",
  rendaFixa: "bg-chart-2",
  rendaVariavel: "bg-chart-3",
  previdencia: "bg-chart-4",
  internacional: "bg-chart-5",
};

function Bar({
  aloc,
  label,
  t,
}: {
  aloc: Record<ClasseCarteira, number>;
  label: string;
  t: (k: string) => string;
}) {
  return (
    <div>
      <div className="mb-1 text-[11px] tracking-wide text-muted-foreground uppercase">{label}</div>
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
        {CLASSES_CARTEIRA.map((c) =>
          aloc[c] > 0.001 ? (
            <div
              key={c}
              className={CLASS_COLOR[c]}
              style={{ width: `${aloc[c] * 100}%` }}
              title={`${t(`carteira.class.${c}`)} ${Math.round(aloc[c] * 100)}%`}
            />
          ) : null,
        )}
      </div>
    </div>
  );
}

export function PortfolioView({ plan }: { plan: Plan }) {
  const t = useTranslations();
  const atual = carteiraAtual(plan.netWorth.assets);
  const profile = plan.suitability.profile ?? "moderate";
  const rec = CARTEIRA_RECOMENDADA[profile];
  const { fitPct, gaps } = fitCarteira(atual, rec);
  const desalinhados = gaps.filter((g) => Math.abs(g.delta) >= 0.05);

  return (
    <section className="flex flex-col rounded-2xl border border-border bg-card p-4 sm:p-5">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <PieChart className="size-4 shrink-0 text-primary" />
        <h3 className="font-heading text-sm font-semibold text-foreground">{t("carteira.title")}</h3>
        <SourceBadge source="mock" />
        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
          <Sparkles className="size-3" /> {t("carteira.offline")}
        </span>
      </div>

      <div className="mb-3 flex items-baseline justify-between gap-3">
        <span className="text-sm text-muted-foreground">
          {t("carteira.fit")} · {t(`riskProfile.${profile}`)}
        </span>
        <span
          className={cn(
            "font-heading text-lg font-semibold tabular-nums",
            fitPct >= 80 ? "text-positive" : fitPct >= 60 ? "text-warning" : "text-negative",
          )}
        >
          {fitPct}%
        </span>
      </div>

      <div className="space-y-2.5">
        <Bar aloc={atual} label={t("carteira.current")} t={t} />
        <Bar aloc={rec} label={t("carteira.recommended")} t={t} />
      </div>

      {/* legenda */}
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
        {CLASSES_CARTEIRA.map((c) => (
          <span key={c} className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
            <span className={cn("size-2 rounded-full", CLASS_COLOR[c])} />
            {t(`carteira.class.${c}`)}
          </span>
        ))}
      </div>

      {desalinhados.length > 0 && (
        <div className="mt-3 rounded-lg bg-muted/50 p-3">
          <div className="mb-1 text-[11px] tracking-wide text-muted-foreground uppercase">
            {t("carteira.gaps")}
          </div>
          <ul className="space-y-1 text-sm">
            {desalinhados.map((g) => (
              <li key={g.classe} className="flex items-baseline justify-between gap-2">
                <span className="text-foreground/85">{t(`carteira.class.${g.classe}`)}</span>
                <span className={cn("tabular-nums", g.delta > 0 ? "text-warning" : "text-info")}>
                  {g.delta > 0 ? t("carteira.over") : t("carteira.under")} ·{" "}
                  {Math.round(g.atual * 100)}% → {Math.round(g.recomendada * 100)}%
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
