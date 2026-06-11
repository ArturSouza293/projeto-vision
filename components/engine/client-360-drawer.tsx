"use client";

import { useTranslations } from "next-intl";
import {
  AlertTriangle,
  Banknote,
  Building2,
  Globe2,
  Heart,
  HeartHandshake,
  Landmark,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";

import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { achievableGoalCount, ageFromDob, cashFlowTotals } from "@/lib/calc";
import { formatCompactCurrency, formatCurrency } from "@/lib/format";
import { kycFor, shareOfWalletInsight } from "@/lib/kyc";
import { projectPlan } from "@/lib/plan";
import { useVisionStore } from "@/lib/store/plan-store";
import type { KYCAlertaSeveridade, ScenarioAssumptions } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Pílula de seção. */
function Section({
  icon: Icon,
  title,
  accent,
  className,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  accent?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        "rounded-2xl border bg-card p-4",
        accent ? "border-primary/30 bg-primary/[0.03]" : "border-border",
        className,
      )}
    >
      <h3 className="mb-3 flex items-center gap-2 font-heading text-sm font-semibold text-foreground">
        <Icon className={cn("size-4 shrink-0", accent ? "text-primary" : "text-muted-foreground")} />
        {title}
      </h3>
      <div className="space-y-2.5 text-sm">{children}</div>
    </section>
  );
}

/** Linha rótulo → valor. */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  if (children == null || children === "" ) return null;
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-2">
      <span className="shrink-0 text-[11px] tracking-wide text-muted-foreground uppercase sm:w-40">
        {label}
      </span>
      <span className="text-foreground/90">{children}</span>
    </div>
  );
}

function Chips({ items }: { items: string[] }) {
  if (!items.length) return <span className="text-muted-foreground">—</span>;
  return (
    <span className="flex flex-wrap gap-1.5">
      {items.map((it, i) => (
        <span key={i} className="rounded-full bg-muted px-2 py-0.5 text-xs text-foreground/80">
          {it}
        </span>
      ))}
    </span>
  );
}

/** Badge "exemplo ilustrativo · em produção: BIA" para os resumos mock. */
function IABadge() {
  const t = useTranslations();
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-primary/[0.08] px-2 py-0.5 text-[10px] font-medium text-primary">
      <Sparkles className="size-3" />
      {t("vision360.iaBadge")}
    </span>
  );
}

const SEV_TONE: Record<KYCAlertaSeveridade, string> = {
  alta: "border-negative/40 bg-negative/[0.06] text-negative",
  media: "border-warning/40 bg-warning/[0.06] text-warning",
  baixa: "border-border bg-muted/60 text-foreground/70",
};

export function Client360Drawer({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const t = useTranslations();
  const locale = useVisionStore((s) => s.locale);
  const plan = useVisionStore((s) => s.activePlan);
  const setPhase = useVisionStore((s) => s.setPhase);

  const kyc = plan ? kycFor(plan) : undefined;
  if (!plan || !kyc) return null;

  const cur = (n: number) => formatCurrency(n, locale);
  const compact = (n: number) => formatCompactCurrency(n, locale);
  const sevLabel = (s: KYCAlertaSeveridade) =>
    s === "alta" ? t("vision360.severityHigh") : s === "media" ? t("vision360.severityMid") : t("vision360.severityLow");
  const yesNo = (v?: boolean) => (v == null ? "—" : v ? t("vision360.yes") : t("vision360.no"));

  const age = ageFromDob(plan.clientProfile.dateOfBirth);
  const insight = shareOfWalletInsight(plan);
  const name = plan.clientProfile.partnerName
    ? `${plan.clientProfile.firstName} & ${plan.clientProfile.partnerName}`
    : `${plan.clientProfile.firstName} ${plan.clientProfile.lastName}`.trim();

  // 4 KPIs do MOTOR (mesma fonte do workspace), do cenário selecionado.
  const selected =
    plan.scenarios.find((s) => s.id === plan.selectedScenarioId) ?? plan.scenarios[0];
  const a: ScenarioAssumptions | undefined = selected?.assumptions;
  const result = a ? projectPlan(plan, a) : null;
  const surplus = cashFlowTotals(plan.cashFlow, plan.netWorth).surplus;
  const goalsAchievable = result ? achievableGoalCount(result.goalFunding) : 0;

  const openFullPlan = () => {
    setPhase("simulate");
    onOpenChange(false);
  };
  const seeOpportunities = () => {
    setPhase("output");
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        data-testid="client-360"
        className="flex w-full flex-col gap-0 p-0 sm:max-w-4xl"
      >
        {/* Cabeçalho de identidade */}
        <header className="shrink-0 border-b border-border bg-gradient-to-br from-primary/[0.06] to-transparent px-5 py-4">
          <div className="flex items-center gap-2 text-[11px] tracking-wide text-muted-foreground uppercase">
            <HeartHandshake className="size-3.5 text-primary" />
            {t("vision360.title")}
            <span className="text-muted-foreground/60">· {t("vision360.subtitle")}</span>
          </div>
          <div className="mt-1.5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h2 className="font-heading text-xl font-semibold text-foreground">{name}</h2>
            <span className="text-sm text-muted-foreground">
              {age} {t("common.years")} · {t(`segment.${plan.clientProfile.segment}`)}
            </span>
          </div>
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground">
              {kyc.planejamentos.momentoDeVida}
            </span>
            <span className="rounded-full border border-border px-2.5 py-1 text-xs text-foreground/80">
              {t("vision360.knowledge")}: {kyc.perfilPessoal.conhecimentoFinanceiro}
            </span>
            {insight && (
              <span
                className={cn(
                  "rounded-full border px-2.5 py-1 text-xs",
                  insight.captureOpportunity
                    ? "border-positive/40 bg-positive/[0.06] text-positive"
                    : "border-border text-foreground/80",
                )}
                title={insight.captureOpportunity ? t("vision360.shareCapture") : undefined}
              >
                {t("vision360.shareOfWallet")}: {insight.pct}%
                {insight.captureOpportunity ? ` · ${t("vision360.opportunity")}` : ""}
              </span>
            )}
          </div>
        </header>

        {/* Corpo rolável */}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {/* Relacionamento — card prioritário, largura total */}
            <Section
              icon={HeartHandshake}
              title={t("vision360.secRelationship")}
              accent
              className="lg:col-span-2"
            >
              <div className="rounded-xl border border-negative/30 bg-negative/[0.05] p-3">
                <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-negative">
                  <AlertTriangle className="size-3.5" />
                  {t("vision360.sensitiveTopics")}
                </div>
                <ul className="space-y-1 text-sm text-foreground/90">
                  {kyc.relacionamento.temasSensiveis.map((tema, i) => (
                    <li key={i} className="flex gap-1.5">
                      <span className="select-none text-negative">•</span>
                      <span>{tema}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <Field label={t("vision360.channels")}>
                <Chips items={kyc.relacionamento.canaisPreferidos} />
              </Field>
              <Field label={t("vision360.frequency")}>{kyc.relacionamento.frequencia}</Field>
              <Field label={t("vision360.style")}>{kyc.relacionamento.estiloComunicacao}</Field>
              <Field label={t("vision360.spouseClient")}>{yesNo(kyc.relacionamento.conjugeClienteBradesco)}</Field>
              <Field label={t("vision360.childrenClients")}>{yesNo(kyc.relacionamento.filhosClientesBradesco)}</Field>
              <div className="rounded-xl bg-muted/50 p-3">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="text-[11px] tracking-wide text-muted-foreground uppercase">
                    {t("vision360.iaSummary")}
                  </span>
                  <IABadge />
                </div>
                <p className="text-sm leading-relaxed text-foreground/85">
                  {kyc.relacionamento.resumoIAFicha}
                </p>
              </div>
            </Section>

            {/* Perfil pessoal */}
            <Section icon={Heart} title={t("vision360.secPersonal")}>
              <Field label={t("vision360.branch")}>{kyc.perfilPessoal.ramo}</Field>
              <Field label={t("vision360.role")}>{kyc.perfilPessoal.cargo}</Field>
              {kyc.perfilPessoal.contadorAdvogado && (
                <Field label={t("vision360.advisors")}>{kyc.perfilPessoal.contadorAdvogado}</Field>
              )}
              <Field label={t("vision360.interests")}>
                <Chips items={kyc.perfilPessoal.interesses} />
              </Field>
              {kyc.perfilPessoal.esporte && (
                <Field label={t("vision360.sport")}>
                  {kyc.perfilPessoal.esporte.modalidade}
                  {kyc.perfilPessoal.esporte.time ? ` · ${kyc.perfilPessoal.esporte.time}` : ""}
                  {` · ${kyc.perfilPessoal.esporte.nivel}`}
                </Field>
              )}
              <Field label={t("vision360.admires")}>
                <Chips items={kyc.perfilPessoal.admira} />
              </Field>
              <Field label={t("vision360.hobbies")}>
                <Chips items={kyc.perfilPessoal.hobbies} />
              </Field>
              <Field label={t("vision360.travel")}>{kyc.perfilPessoal.viagens.nota ?? yesNo(kyc.perfilPessoal.viagens.gosta)}</Field>
              <Field label={t("vision360.pets")}>
                {kyc.perfilPessoal.pets.length ? <Chips items={kyc.perfilPessoal.pets} /> : t("vision360.none")}
              </Field>
            </Section>

            {/* Perfil familiar */}
            <Section icon={Users} title={t("vision360.secFamily")}>
              <Field label={t("vision360.livesWith")}>{kyc.perfilFamiliar.moraCom}</Field>
              <Field label={t("vision360.children")}>
                {kyc.perfilFamiliar.filhos.length ? (
                  <span className="flex flex-col gap-0.5">
                    {kyc.perfilFamiliar.filhos.map((f, i) => (
                      <span key={i}>
                        {f.nome} ({f.idade}){f.nota ? ` — ${f.nota}` : ""}
                      </span>
                    ))}
                  </span>
                ) : (
                  t("vision360.none")
                )}
              </Field>
              <Field label={t("vision360.familyTree")}>
                <span className="flex flex-col gap-0.5">
                  {kyc.perfilFamiliar.arvoreGenealogica.map((p, i) => (
                    <span key={i}>
                      <span className="text-muted-foreground">{p.parentesco}:</span> {p.nome}
                      {p.banco && p.banco !== "—" ? ` · ${p.banco}` : ""}
                    </span>
                  ))}
                </span>
              </Field>
            </Section>

            {/* Ativos & patrimônio */}
            <Section icon={Landmark} title={t("vision360.secAssets")}>
              <Field label={t("vision360.capitalOrigin")}>{kyc.ativosFinanceiros.origemCapital}</Field>
              <Field label={t("vision360.bankBalance")}>
                <span className="font-medium text-foreground">
                  {cur(kyc.ativosFinanceiros.saldoConsolidadoBanco)}
                </span>
              </Field>
              <Field label={t("vision360.ownProperties")}>{kyc.ativosNaoFinanceiros.imoveisProprios}</Field>
              {kyc.ativosNaoFinanceiros.imoveisInvestimento && (
                <Field label={t("vision360.investmentProperties")}>
                  {kyc.ativosNaoFinanceiros.imoveisInvestimento.qtd}
                  {kyc.ativosNaoFinanceiros.imoveisInvestimento.receitaMensal
                    ? ` · ${cur(kyc.ativosNaoFinanceiros.imoveisInvestimento.receitaMensal)}/${t("vision360.monthlyIncome")}`
                    : ""}
                </Field>
              )}
              {kyc.ativosNaoFinanceiros.imoveisExterior > 0 && (
                <Field label={t("vision360.foreignProperties")}>{kyc.ativosNaoFinanceiros.imoveisExterior}</Field>
              )}
              <Field label={t("vision360.companies")}>
                {kyc.ativosNaoFinanceiros.empresas.length ? (
                  <span className="flex flex-col gap-0.5">
                    {kyc.ativosNaoFinanceiros.empresas.map((e, i) => (
                      <span key={i}>
                        {e.nome}
                        {e.porte ? ` · ${e.porte}` : ""}
                        {e.nota ? ` · ${e.nota}` : ""}
                      </span>
                    ))}
                  </span>
                ) : (
                  t("vision360.none")
                )}
              </Field>
            </Section>

            {/* Posição internacional */}
            <Section icon={Globe2} title={t("vision360.secInternational")}>
              <Field label={t("vision360.internationalAccount")}>{yesNo(kyc.posicaoInternacional.contaInternacional)}</Field>
              <Field label={t("vision360.investsAbroad")}>{yesNo(kyc.posicaoInternacional.investeExterior)}</Field>
              {kyc.posicaoInternacional.valorExterior ? (
                <Field label={t("vision360.abroadValue")}>{cur(kyc.posicaoInternacional.valorExterior)}</Field>
              ) : null}
            </Section>

            {/* Fluxo de caixa & alertas — largura total */}
            <Section icon={Banknote} title={t("vision360.secCashflow")} className="lg:col-span-2">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <div className="mb-1.5 text-[11px] tracking-wide text-muted-foreground uppercase">
                    {t("vision360.fixedExpenses")}
                  </div>
                  <ul className="space-y-1">
                    {kyc.fluxoCaixa.despesasFixas.map((d, i) => (
                      <li key={i} className="flex items-baseline justify-between gap-3 border-b border-border/50 pb-1 text-sm">
                        <span className="text-foreground/80">{d.categoria}</span>
                        <span className="font-medium text-foreground">{cur(d.valor)}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-1.5 text-xs text-muted-foreground">
                    {t("vision360.donations")}:{" "}
                    {kyc.fluxoCaixa.doacoes.realiza ? kyc.fluxoCaixa.doacoes.descricao ?? t("vision360.yes") : t("vision360.no")}
                  </div>
                </div>
                <div>
                  <div className="mb-1.5 flex items-center gap-1.5 text-[11px] tracking-wide text-muted-foreground uppercase">
                    <AlertTriangle className="size-3.5" />
                    {t("vision360.alerts")}
                  </div>
                  <ul className="space-y-1.5">
                    {kyc.fluxoCaixa.alertas.map((al, i) => (
                      <li
                        key={i}
                        className={cn("flex items-start gap-2 rounded-lg border px-2.5 py-1.5 text-sm", SEV_TONE[al.severidade])}
                      >
                        <span className="mt-0.5 shrink-0 rounded-full border border-current/30 px-1.5 text-[10px] font-semibold uppercase">
                          {sevLabel(al.severidade)}
                        </span>
                        <span className="text-foreground/85">{al.texto}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <div className="rounded-xl bg-muted/50 p-3">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="text-[11px] tracking-wide text-muted-foreground uppercase">
                    {t("vision360.iaExpenses")}
                  </span>
                  <IABadge />
                </div>
                <p className="text-sm leading-relaxed text-foreground/85">{kyc.fluxoCaixa.resumoIAGastos}</p>
              </div>
            </Section>

            {/* Proteção — largura total */}
            <Section icon={ShieldCheck} title={t("vision360.secProtection")} className="lg:col-span-2">
              <Field label={t("vision360.succession")}>{kyc.protecao.planejamentoSucessorio}</Field>
              <div>
                <div className="mb-1.5 text-[11px] tracking-wide text-muted-foreground uppercase">
                  {t("vision360.externalInsurance")}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {kyc.protecao.segurosExternos.map((s, i) => (
                    <span
                      key={i}
                      className={cn(
                        "rounded-full border px-2 py-0.5 text-xs",
                        s.possui ? "border-positive/40 bg-positive/[0.05] text-foreground/80" : "border-negative/40 bg-negative/[0.05] text-foreground/80",
                      )}
                      title={s.obs}
                    >
                      {s.possui ? "✓" : "✗"} {s.tipo}
                      {s.obs ? ` · ${s.obs}` : ""}
                    </span>
                  ))}
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={seeOpportunities} className="mt-1 self-start text-primary">
                {t("vision360.seeOpportunities")}
              </Button>
            </Section>
          </div>
        </div>

        {/* Rodapé — 4 números do MOTOR */}
        <footer className="shrink-0 border-t border-border bg-card/80 px-5 py-3">
          <div className="flex items-end justify-between gap-3">
            <div className="grid flex-1 grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-4">
              <FooterKpi label={t("vision360.kpiWealth")} value={result ? compact(result.wealthAtRetirement) : "—"} />
              <FooterKpi label={t("vision360.kpiSurplus")} value={cur(surplus)} />
              <FooterKpi
                label={t("vision360.kpiGoals")}
                value={`${goalsAchievable}/${plan.goals.length}`}
              />
              <FooterKpi label={t("vision360.kpiProbability")} value={result ? `${Math.round(result.probabilityOfSuccess)}%` : "—"} />
            </div>
            <Button size="sm" onClick={openFullPlan} className="shrink-0">
              {t("vision360.openFullPlan")}
            </Button>
          </div>
        </footer>
      </SheetContent>
    </Sheet>
  );
}

function FooterKpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <div className="truncate text-[10px] tracking-wide text-muted-foreground uppercase">{label}</div>
      <div className="font-heading text-sm font-semibold text-foreground">{value}</div>
    </div>
  );
}
