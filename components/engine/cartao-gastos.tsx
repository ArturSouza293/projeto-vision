"use client";

/**
 * v10 C4 — Cartão de crédito: planilha de gastos por categoria (mock, via Open
 * Finance). Conecta com A3 (mesma origem KYC) e com Despesas (mesma taxonomia
 * `ExpenseCategory`). É INFORMATIVO/read-only: não soma no `cashFlow` do plano
 * (sem dupla contagem). REGRA ZERO: soma/share vêm de `lib/cartao`.
 */
import { useTranslations } from "next-intl";

import { CreditCard } from "@/components/app/icons";
import { Money } from "@/components/app/money";
import { SourceBadge } from "@/components/app/data-source";
import { cartaoGastos, cartaoShare, cartaoTotal } from "@/lib/cartao";
import type { KYCCartao } from "@/lib/types";

/** Tabela compacta de gastos por categoria (reaproveitada em Despesas e em A3). */
export function CartaoGastosTable({ cartao }: { cartao: KYCCartao }) {
  const t = useTranslations();
  const linhas = cartaoGastos(cartao);
  if (linhas.length === 0) return null;

  return (
    <div className="space-y-1.5">
      {linhas.map((g, i) => {
        const share = cartaoShare(cartao, g.valor);
        return (
          <div key={`${g.categoria}-${i}`} className="flex items-center gap-2.5 text-xs">
            <span className="w-28 shrink-0 truncate text-muted-foreground">
              {g.label ?? t(`expenseCategory.${g.categoria}`)}
            </span>
            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
              <span
                className="block h-full rounded-full bg-[var(--primary)]"
                style={{ width: `${Math.round(share * 100)}%` }}
              />
            </span>
            <Money value={g.valor} className="w-20 shrink-0 text-right font-medium text-foreground" />
          </div>
        );
      })}
      <div className="flex items-center justify-between border-t border-border/60 pt-1.5 text-xs">
        <span className="font-medium text-foreground">{t("cartao.total")}</span>
        <Money value={cartaoTotal(cartao)} className="font-semibold text-foreground" />
      </div>
    </div>
  );
}

/**
 * Seção completa do cartão para a aba Despesas: cabeçalho + origem (Open Finance)
 * + cartões + planilha por categoria + nota de "não somado ao plano".
 */
export function CartaoSection({ cartao }: { cartao: KYCCartao }) {
  const t = useTranslations();

  return (
    <section className="space-y-3 rounded-2xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
            <CreditCard className="size-4" />
          </span>
          <div>
            <h3 className="text-sm font-semibold text-foreground">{t("cartao.title")}</h3>
            <p className="text-xs text-muted-foreground">
              {cartao.cartoes.join(" · ")}
            </p>
          </div>
        </div>
        <SourceBadge source="open-finance" />
      </div>

      <CartaoGastosTable cartao={cartao} />

      {cartao.openFinanceForaDoBanco?.length ? (
        <p className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground/80">{t("cartao.outsideBank")}:</span>{" "}
          {cartao.openFinanceForaDoBanco.join("; ")}
        </p>
      ) : null}

      <p className="rounded-xl border border-info/20 bg-info/[0.03] p-2.5 text-[11px] leading-snug text-muted-foreground">
        {t("cartao.note")}
      </p>
    </section>
  );
}
