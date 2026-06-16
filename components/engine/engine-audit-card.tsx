"use client";

/**
 * v10 — Cartão "Motor auditável": demonstra o motor Python determinístico
 * (vision_engine) calculando, AO VIVO mas SOB DEMANDA (botão, não no recálculo
 * da timeline), a renda fixa LÍQUIDA de impostos do cliente — com a decomposição
 * bruto → IOF → IR e a versão dos parâmetros (auditável).
 *
 * Chama o proxy server-side /api/engine (o navegador não vê o host do motor).
 * Degrada com elegância quando o motor não está configurado (sem env na Vercel).
 */
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Calculator, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { investableWealth } from "@/lib/calc";
import { formatCurrency } from "@/lib/format";
import { useVisionStore } from "@/lib/store/plan-store";
import type { Plan } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Envelope {
  valor: string;
  unidade: string;
  formula: string;
  parametros_versao: string | null;
  detalhe: Record<string, string> | null;
}
type EngineResp =
  | { ok: true; envelope: Envelope }
  | { error: string; detail?: unknown; message?: string };

type State =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "done"; env: Envelope; baseValor: number }
  | { kind: "off" }
  | { kind: "error"; msg: string };

const PCT_CDI = "120";
const PRAZO_DU = 504; // ~2 anos úteis
const PRAZO_CORRIDOS = 730; // 2 anos (corridos) → IR 15%, sem IOF

export function EngineAuditCard({ plan }: { plan: Plan }) {
  const t = useTranslations();
  const locale = useVisionStore((s) => s.locale);
  const [state, setState] = useState<State>({ kind: "idle" });

  const baseValor = Math.max(Math.round(investableWealth(plan.netWorth)) || 0, 100000);
  const cur = (n: string | number) => formatCurrency(Number(n), locale);

  async function calcular() {
    setState({ kind: "loading" });
    try {
      const res = await fetch("/api/engine", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          tool: "cdb_liquido",
          payload: {
            valor: String(baseValor),
            pct_cdi: PCT_CDI,
            prazo_dias_uteis: PRAZO_DU,
            prazo_dias_corridos: PRAZO_CORRIDOS,
            data_referencia: new Date().toISOString().slice(0, 10),
          },
        }),
      });
      const data: EngineResp = await res.json();
      if ("ok" in data && data.ok) {
        setState({ kind: "done", env: data.envelope, baseValor });
      } else if ("error" in data && data.error === "not-configured") {
        setState({ kind: "off" });
      } else {
        const msg = "message" in data && data.message ? data.message : t("engineAudit.errorBody");
        setState({ kind: "error", msg });
      }
    } catch {
      setState({ kind: "error", msg: t("engineAudit.errorBody") });
    }
  }

  return (
    <section className="flex flex-col rounded-2xl border border-info/30 bg-info/[0.03] p-4 sm:p-5">
      <h3 className="mb-1 flex flex-wrap items-center gap-2 font-heading text-sm font-semibold text-foreground">
        <Calculator className="size-4 shrink-0 text-info" />
        {t("engineAudit.title")}
        <span className="inline-flex items-center gap-1 rounded-full bg-info/10 px-2 py-0.5 text-[10px] font-medium text-info">
          <ShieldCheck className="size-3" />
          {t("engineAudit.badge")}
        </span>
      </h3>
      <p className="mb-3 text-xs leading-snug text-muted-foreground">
        {t("engineAudit.scenario", { valor: cur(baseValor), pct: PCT_CDI })}
      </p>

      {state.kind === "done" ? (
        <div data-testid="engine-result" className="space-y-2.5 text-sm">
          <div className="flex items-baseline justify-between gap-3 rounded-xl border border-border bg-card p-3">
            <span className="text-muted-foreground">{t("engineAudit.liquido")}</span>
            <span className="font-heading text-lg font-semibold text-foreground">{cur(state.env.valor)}</span>
          </div>
          {state.env.detalhe && (
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
              <Row label={t("engineAudit.bruto")} value={cur(state.env.detalhe.rendimento_bruto)} />
              <Row label="IOF" value={cur(state.env.detalhe.iof)} />
              <Row label="IR" value={cur(state.env.detalhe.ir)} />
              <Row label={t("engineAudit.valorFinal")} value={cur(state.env.detalhe.valor_final_liquido)} />
            </dl>
          )}
          <div className="rounded-lg bg-muted/50 px-2.5 py-1.5 text-[11px] text-muted-foreground">
            <span className="font-medium text-foreground/70">{t("engineAudit.formula")}:</span> {state.env.formula}
            {state.env.parametros_versao && (
              <>
                <br />
                <span className="font-medium text-foreground/70">{t("engineAudit.params")}:</span>{" "}
                <code className="text-info">{state.env.parametros_versao}</code>
              </>
            )}
          </div>
          <Button variant="ghost" size="xs" onClick={() => setState({ kind: "idle" })}>
            {t("engineAudit.again")}
          </Button>
        </div>
      ) : state.kind === "off" ? (
        <p className="rounded-lg border border-dashed border-border px-3 py-2 text-xs text-muted-foreground">
          {t("engineAudit.notConfigured")}
        </p>
      ) : state.kind === "error" ? (
        <p className={cn("rounded-lg border border-negative/30 bg-negative/[0.05] px-3 py-2 text-xs text-negative")}>
          {state.msg}
        </p>
      ) : (
        <Button
          size="sm"
          variant="outline"
          className="self-start"
          data-testid="engine-compute"
          disabled={state.kind === "loading"}
          onClick={calcular}
        >
          <Calculator className="size-4" />
          {state.kind === "loading" ? t("engineAudit.computing") : t("engineAudit.compute")}
        </Button>
      )}
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2 border-b border-border/40 pb-0.5">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium tabular-nums text-foreground/90">{value}</dd>
    </div>
  );
}
