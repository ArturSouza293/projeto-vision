"use client";

/**
 * PARTE B (v10) — aba "Motores de Cálculo e Simulações". FRONT-END nesta fase:
 * shells com inputs EDITÁVEIS, a FÓRMULA visível e o resultado em PLACEHOLDER
 * claramente rotulado ("prévia — cálculo a implementar no backend"). NENHUMA
 * aritmética nova aqui (Regra Zero): quando o backend chegar, o número vem do
 * motor. O Life Planning segue sendo a fonte única do plano; aqui é o playground
 * de simulação do consultor.
 */
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Calculator, Coins, Mail, Plus, Scale, Trash2 } from "lucide-react";

import { MoneyInput } from "@/components/app/number-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useVisionStore } from "@/lib/store/plan-store";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Selo "backend a implementar" — honestidade sobre o estado de cada motor. */
function BackendBadge() {
  const t = useTranslations();
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-warning/15 px-2 py-0.5 text-[10px] font-medium text-warning">
      {t("engines.backendBadge")}
    </span>
  );
}

function MotorShell({
  icon: Icon,
  title,
  subtitle,
  formula,
  children,
  note,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle?: string;
  formula: string;
  children: React.ReactNode;
  note?: string;
}) {
  const t = useTranslations();
  return (
    <section className="flex flex-col rounded-2xl border border-border bg-card p-4 sm:p-5">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <Icon className="size-4 shrink-0 text-primary" />
        <h3 className="font-heading text-sm font-semibold text-foreground">{title}</h3>
        <BackendBadge />
      </div>
      {subtitle && <p className="mb-3 text-xs leading-snug text-muted-foreground">{subtitle}</p>}
      <div className="grid gap-3 sm:grid-cols-2">{children}</div>
      <div className="mt-3 rounded-lg bg-muted/50 px-3 py-2 text-[11px] text-muted-foreground">
        <span className="font-medium text-foreground/70">{t("engines.formula")}:</span>{" "}
        <code className="text-foreground/80">{formula}</code>
      </div>
      <div className="mt-2 flex items-center gap-2 rounded-lg border border-dashed border-border px-3 py-2 text-xs text-muted-foreground">
        <Calculator className="size-3.5 shrink-0" />
        {t("engines.previewPlaceholder")}
      </div>
      {note && <p className="mt-2 text-xs leading-snug text-info">{note}</p>}
    </section>
  );
}

/** Campo numérico simples (taxa %/prazo) — placeholder, apagável (sem "0"). */
function NumField({
  value,
  onChange,
  suffix,
  ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  suffix?: string;
  ariaLabel?: string;
}) {
  return (
    <span className="relative inline-flex w-full items-center">
      <Input
        inputMode="decimal"
        aria-label={ariaLabel}
        value={value}
        placeholder="—"
        onChange={(e) => onChange(e.target.value.replace(/[^\d.,]/g, ""))}
        className="tabular-nums"
      />
      {suffix && (
        <span className="pointer-events-none absolute right-3 text-xs text-muted-foreground">{suffix}</span>
      )}
    </span>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-[11px] tracking-wide text-muted-foreground uppercase">{label}</span>
      {children}
    </label>
  );
}

interface SimSnapshot {
  id: string;
  motor: string;
  resumo: string;
}

export function EnginesTab() {
  const t = useTranslations();
  const locale = useVisionStore((s) => s.locale);
  const plan = useVisionStore((s) => s.activePlan);

  // Motor 1 — empréstimo com garantia de investimentos
  const [invest, setInvest] = useState(0);
  const [taxaCredito, setTaxaCredito] = useState("");
  const [prazo, setPrazo] = useState("");

  // Motor 2 — comparativo de taxas (CET × rentabilidade líquida)
  const [cet, setCet] = useState("");
  const [rendLiquida, setRendLiquida] = useState("");

  // Comparação entre simulações (mock — placeholders, sem cálculo)
  const [sims, setSims] = useState<SimSnapshot[]>([]);
  const cur = (n: number) => formatCurrency(n, locale);

  const salvarSim = (motor: string, resumo: string) =>
    setSims((s) => [...s, { id: `${Date.now()}-${s.length}`, motor, resumo }]);

  const exportarEmail = () => {
    const nome = plan?.clientProfile.firstName ?? "cliente";
    const linhas = sims.map((s) => `- ${s.motor}: ${s.resumo}`).join("%0D%0A");
    const corpo = `${t("engines.emailIntro")} ${nome}.%0D%0A%0D%0A${linhas || t("engines.noSims")}%0D%0A%0D%0A${t("engines.emailDisclaimer")}`;
    // mailto: abre o cliente de e-mail do usuário (ele envia) — sem PII a serviço externo.
    window.location.href = `mailto:?subject=${encodeURIComponent(t("engines.emailSubject"))}&body=${corpo}`;
  };

  return (
    <div className="mx-auto max-w-4xl space-y-4 pb-4">
      <header className="rounded-2xl border border-primary/30 bg-primary/[0.03] p-4 sm:p-5">
        <h2 className="flex items-center gap-2 font-heading text-base font-semibold text-foreground">
          <Calculator className="size-5 text-primary" />
          {t("engines.title")}
        </h2>
        <p className="mt-1 text-xs leading-snug text-muted-foreground">{t("engines.intro")}</p>
      </header>

      {/* Motor 1 — empréstimo com garantia de investimentos */}
      <MotorShell
        icon={Coins}
        title={t("engines.loanCollateral.title")}
        subtitle={t("engines.loanCollateral.subtitle")}
        formula={t("engines.loanCollateral.formula")}
        note={t("engines.loanCollateral.note")}
      >
        <Field label={t("engines.loanCollateral.investment")}>
          <MoneyInput value={invest} onChange={setInvest} ariaLabel={t("engines.loanCollateral.investment")} />
        </Field>
        <Field label={t("engines.loanCollateral.rate")}>
          <NumField value={taxaCredito} onChange={setTaxaCredito} suffix="% a.a." />
        </Field>
        <Field label={t("engines.loanCollateral.term")}>
          <NumField value={prazo} onChange={setPrazo} suffix={t("engines.months")} />
        </Field>
        <div className="flex items-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => salvarSim(t("engines.loanCollateral.title"), `${cur(invest)} · ${taxaCredito || "—"}% · ${prazo || "—"}m`)}
          >
            <Plus className="size-4" /> {t("engines.saveSim")}
          </Button>
        </div>
      </MotorShell>

      {/* Motor 2 — comparativo de taxas (CET × rentabilidade líquida) */}
      <MotorShell
        icon={Scale}
        title={t("engines.rateCompare.title")}
        subtitle={t("engines.rateCompare.subtitle")}
        formula={t("engines.rateCompare.formula")}
      >
        <Field label={t("engines.rateCompare.cet")}>
          <NumField value={cet} onChange={setCet} suffix="% a.a." />
        </Field>
        <Field label={t("engines.rateCompare.netReturn")}>
          <NumField value={rendLiquida} onChange={setRendLiquida} suffix="% a.a." />
        </Field>
        <div className="flex items-end sm:col-span-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => salvarSim(t("engines.rateCompare.title"), `CET ${cet || "—"}% × ${rendLiquida || "—"}%`)}
          >
            <Plus className="size-4" /> {t("engines.saveSim")}
          </Button>
        </div>
      </MotorShell>

      {/* Comparação entre simulações + exportar */}
      <section className="flex flex-col rounded-2xl border border-border bg-card p-4 sm:p-5">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-heading text-sm font-semibold text-foreground">{t("engines.compareTitle")}</h3>
          <Button variant="outline" size="sm" onClick={exportarEmail} className="shrink-0">
            <Mail className="size-4" /> {t("engines.exportEmail")}
          </Button>
        </div>
        {sims.length === 0 ? (
          <p className="text-xs text-muted-foreground">{t("engines.noSims")}</p>
        ) : (
          <ul className="space-y-1.5">
            {sims.map((s) => (
              <li
                key={s.id}
                className={cn("flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-sm")}
              >
                <span className="min-w-0">
                  <span className="font-medium text-foreground">{s.motor}</span>
                  <span className="text-muted-foreground"> · {s.resumo}</span>
                </span>
                <button
                  type="button"
                  aria-label={t("common.remove")}
                  onClick={() => setSims((x) => x.filter((y) => y.id !== s.id))}
                  className="shrink-0 text-muted-foreground hover:text-negative"
                >
                  <Trash2 className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-2 text-[11px] text-muted-foreground">{t("engines.exportNote")}</p>
      </section>
    </div>
  );
}
