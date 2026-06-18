"use client";

/**
 * C11 — "Próximo passo" por sinal vital (modelo Prime Top Tier). Presentacional:
 * recebe as recomendações já calculadas (lib/vital-signs) — a magnitude vem
 * SEMPRE do motor (Regra Zero). Cada item traz a alavanca, a magnitude e o CTA
 * "simular este ajuste" que abre o cenário com a alavanca aplicada.
 */
import { useTranslations } from "next-intl";
import {
  ArrowRight,
  CalendarClock,
  PiggyBank,
  Shield,
  SlidersHorizontal,
  TrendingUp,
  Wallet,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/format";
import type { Locale } from "@/lib/types";
import type { AlavancaId, Recomendacao } from "@/lib/vital-signs";

const ICON: Record<AlavancaId, typeof Wallet> = {
  aporte: PiggyBank,
  adiar_usufruto: CalendarClock,
  padrao_vida: Wallet,
  perfil_retorno: TrendingUp,
  alocar_existente: SlidersHorizontal,
  protecao_sucessao: Shield,
};

export function NextStepCard({
  recomendacoes,
  locale,
  onSimular,
}: {
  recomendacoes: Recomendacao[];
  locale: Locale;
  onSimular?: (alavanca: AlavancaId) => void;
}) {
  const t = useTranslations();
  if (!recomendacoes.length) return null;

  const fmtMag = (r: Recomendacao): string => {
    if (r.magnitude == null) return t("vitalSign.seeEffect");
    if (r.unidade === "anos") {
      const n = Math.round(r.magnitude);
      return `${n} ${n === 1 ? t("vitalSign.year") : t("vitalSign.years")}`;
    }
    const v = formatCurrency(Math.abs(r.magnitude), locale);
    return r.unidade === "BRL/mês" ? `${v}/${t("vitalSign.month")}` : v;
  };

  return (
    <section className="flex flex-col rounded-2xl border border-warning/30 bg-warning/[0.04] p-4 sm:p-5">
      <h3 className="mb-1 flex items-center gap-2 font-heading text-sm font-semibold text-foreground">
        <TrendingUp className="size-4 shrink-0 text-warning" />
        {t("vitalSign.title")}
      </h3>
      <p className="mb-3 text-xs leading-snug text-muted-foreground">{t("vitalSign.subtitle")}</p>
      <ul className="space-y-2">
        {recomendacoes.map((r) => {
          const Icon = ICON[r.alavanca];
          return (
            <li
              key={r.alavanca}
              className={cnRow(r.binding)}
            >
              <Icon className="mt-0.5 size-4 shrink-0 text-foreground/70" aria-hidden />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <span className="text-sm font-medium text-foreground">
                    {t(`vitalSign.lever.${r.alavanca}`)}
                  </span>
                  {r.binding && (
                    <span className="rounded-full bg-warning/15 px-1.5 text-[10px] font-medium text-warning">
                      {t("vitalSign.priority")}
                    </span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  {t("vitalSign.magnitude")}: <span className="font-medium text-foreground/80">{fmtMag(r)}</span>
                </div>
              </div>
              <Button
                variant="ghost"
                size="xs"
                className="shrink-0 text-primary"
                onClick={() => onSimular?.(r.alavanca)}
              >
                {t("vitalSign.simulate")}
                <ArrowRight className="size-3.5" />
              </Button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function cnRow(binding: boolean): string {
  return [
    "flex items-start gap-2.5 rounded-xl border p-2.5",
    binding ? "border-warning/40 bg-card" : "border-border bg-card/60",
  ].join(" ");
}
