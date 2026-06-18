"use client";

/**
 * v9 — Cliente 360 em PÁGINA INTEIRA (Aba 1 do registro do cliente). Substitui
 * o modal/drawer do v8. Seis seções na ordem do spec + faixa de KPIs do MOTOR.
 *
 * REGRA ZERO/privacidade: números do PLANO vêm do motor (projectPlan /
 * cashFlowTotals — origem única, idênticos ao Life Planning). Derivações sobre
 * KYC (Share of Wallet) ficam em lib/kyc.ts. Resumos IA são MOCK (badge). Nada
 * do KYC entra no payload da BIA (whitelist em buildPlanoIdealPayload).
 */
import { useTranslations } from "next-intl";
import {
  AlertTriangle,
  Banknote,
  Cake,
  CreditCard,
  FileText,
  Globe2,
  HeartHandshake,
  History,
  Landmark,
  ShieldCheck,
  Sparkles,
  Star,
  UserRound,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { CartaoGastosTable } from "@/components/engine/cartao-gastos";
import { EngineAuditCard } from "@/components/engine/engine-audit-card";
import { FreshnessStamp, SourceBadge } from "@/components/app/data-source";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { achievableGoalCount, ageFromDob, cashFlowTotals } from "@/lib/calc";
import { formatCompactCurrency, formatCurrency } from "@/lib/format";
import { kycExpenseComparison, kycFor, shareOfWalletInsight } from "@/lib/kyc";
import { projectPlan } from "@/lib/plan";
import { useVisionStore } from "@/lib/store/plan-store";
import type { KYCAlertaSeveridade, KYCSeguroExterno, ScenarioAssumptions } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Card de seção (bloco da página). */
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
        "flex flex-col rounded-2xl border bg-card p-4 sm:p-5",
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  if (children == null || children === "") return null;
  return (
    <div className="grid grid-cols-[5.5rem_1fr] gap-x-3 gap-y-0.5 sm:grid-cols-[7.5rem_1fr]">
      <span className="pt-0.5 text-[11px] leading-snug tracking-wide text-muted-foreground uppercase">
        {label}
      </span>
      <span className="min-w-0 text-foreground/90">{children}</span>
    </div>
  );
}

/** Régua 0–10 (conhecimento de investimentos/banking) — barra + valor. */
function Ruler({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(10, value)) * 10;
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
        <span className="block h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
      </span>
      <span className="font-medium tabular-nums text-foreground">{value}/10</span>
    </span>
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
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary/[0.08] px-2 py-0.5 text-[10px] font-medium text-primary">
      <Sparkles className="size-3" />
      {t("vision360.iaBadge")}
    </span>
  );
}

/** v10 A4 — chip de seguro com MODAL no hover (seguradora, cobertura, vigência). */
function SeguroChip({ s }: { s: KYCSeguroExterno }) {
  const t = useTranslations();
  const locale = useVisionStore((st) => st.locale);
  const linhas = [
    s.seguradora,
    s.cobertura,
    s.valorCobertura ? formatCurrency(s.valorCobertura, locale) : null,
    s.vigenciaFim
      ? `${t("vision360.expires")} ${new Date(s.vigenciaFim).toLocaleDateString(
          locale === "en" ? "en-US" : "pt-BR",
          { month: "short", year: "numeric" },
        )}`
      : null,
    s.obs,
  ].filter(Boolean) as string[];
  const chip = (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs",
        s.possui
          ? "border-positive/40 bg-positive/[0.05] text-foreground/80"
          : "border-negative/40 bg-negative/[0.05] text-foreground/80",
      )}
    >
      {s.possui ? "✓" : "✗"} {s.tipo}
      {s.bemCoberto ? ` · ${s.bemCoberto}` : ""}
    </span>
  );
  if (!linhas.length) return chip;
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button type="button" className="cursor-help">
            {chip}
          </button>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs text-left leading-snug">
          <span className="flex flex-col gap-0.5">
            <span className="font-medium">{s.tipo}</span>
            {linhas.map((l, i) => (
              <span key={i}>{l}</span>
            ))}
          </span>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

const SEV_TONE: Record<KYCAlertaSeveridade, string> = {
  alta: "border-negative/40 bg-negative/[0.06] text-negative",
  media: "border-warning/40 bg-warning/[0.06] text-warning",
  baixa: "border-border bg-muted/60 text-foreground/70",
};

export function Client360Page() {
  const t = useTranslations();
  const locale = useVisionStore((s) => s.locale);
  const plan = useVisionStore((s) => s.activePlan);
  const setPhase = useVisionStore((s) => s.setPhase);
  const setClientTab = useVisionStore((s) => s.setClientTab);

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

  // KPIs do MOTOR (mesma fonte do Life Planning), cenário selecionado.
  const selected =
    plan.scenarios.find((s) => s.id === plan.selectedScenarioId) ?? plan.scenarios[0];
  const a: ScenarioAssumptions | undefined = selected?.assumptions;
  const result = a ? projectPlan(plan, a) : null;
  const totals = cashFlowTotals(plan.cashFlow, plan.netWorth);
  const goalsAchievable = result ? achievableGoalCount(result.goalFunding) : 0;

  // Despesas declarado-KYC × plano: derivação em lib/kyc.ts (Regra Zero — sem
  // aritmética nova no componente). kyc presente (gate acima), logo não-nulo.
  const expenseCmp = kycExpenseComparison(plan)!;
  const ir = kyc.fluxoCaixa.irPreCarregado; // v10 A3 (mock "via IR", editável)
  const cartao = kyc.fluxoCaixa.cartao; // v10 A3
  // v10 A4 — bens/itens sem cobertura (seguros marcados como não-possui).
  const uncovered = [
    ...kyc.protecao.segurosExternos,
    ...(kyc.protecao.segurosInternos ?? []),
  ]
    .filter((s) => !s.possui)
    .map((s) => s.bemCoberto ?? s.tipo);

  const goLifePlanning = () => setClientTab("lifePlanning");
  const openFullPlan = () => {
    setPhase("simulate");
    setClientTab("lifePlanning");
  };
  const seeOpportunities = () => {
    setPhase("output");
    setClientTab("lifePlanning");
  };

  return (
    <div data-testid="client-360" className="mx-auto max-w-4xl space-y-4 pb-4">
      {/* 1 — Resumo da ficha (abertura: quem é o cliente em uma leitura) */}
      <Section icon={Sparkles} title={t("vision360.secSummary")} accent>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-[11px] tracking-wide text-muted-foreground uppercase">
            {t("vision360.iaSummary")}
          </span>
          <IABadge />
        </div>
        <p className="text-sm leading-relaxed text-foreground/90">
          {kyc.relacionamento.resumoIAFicha}
        </p>
      </Section>

      {/* 2 — Identificação do cliente */}
      <Section icon={UserRound} title={t("vision360.secIdentification")}>
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h2 className="font-heading text-xl font-semibold text-foreground">{name}</h2>
          <span className="text-sm text-muted-foreground">
            {age} {t("common.years")} · {t(`segment.${plan.clientProfile.segment}`)}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
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
        {insight?.captureOpportunity && (
          <p className="text-xs leading-snug text-positive/90">{t("vision360.shareCapture")}</p>
        )}

        {/* v10 A1 — perfil pessoal. TODO(Claude Design): versão visual do perfil pessoal */}
        <div className="grid gap-x-6 gap-y-1.5 border-t border-border/60 pt-2.5 sm:grid-cols-2">
          {kyc.perfilPessoal.comoSerChamado && (
            <Field label={t("vision360.howToCall")}>
              <span className="font-medium text-foreground">{kyc.perfilPessoal.comoSerChamado}</span>
            </Field>
          )}
          <Field label={t("vision360.dob")}>
            <span className="inline-flex items-center gap-1.5">
              <Cake className="size-3.5 text-primary" aria-hidden />
              {new Date(plan.clientProfile.dateOfBirth).toLocaleDateString(
                locale === "en" ? "en-US" : "pt-BR",
                { day: "2-digit", month: "short", year: "numeric" },
              )}
              <span className="text-muted-foreground">· {age} {t("common.years")}</span>
            </span>
          </Field>
          {kyc.perfilPessoal.assuntoQuente && (
            <Field label={t("vision360.hotTopic")}>
              <span className="inline-flex items-center gap-1 font-medium text-foreground">
                <Star className="size-3.5 fill-warning text-warning" aria-hidden />
                {kyc.perfilPessoal.assuntoQuente}
              </span>
            </Field>
          )}
          {kyc.perfilPessoal.pessoaQueMaisImporta && (
            <Field label={t("vision360.keyPerson")}>{kyc.perfilPessoal.pessoaQueMaisImporta}</Field>
          )}
          {kyc.perfilPessoal.reguaInvestimentos != null && (
            <Field label={t("vision360.knowInvest")}>
              <Ruler value={kyc.perfilPessoal.reguaInvestimentos} />
            </Field>
          )}
          {kyc.perfilPessoal.reguaBanking != null && (
            <Field label={t("vision360.knowBanking")}>
              <Ruler value={kyc.perfilPessoal.reguaBanking} />
            </Field>
          )}
          {kyc.perfilPessoal.nps != null && (
            <Field label={t("vision360.nps")}>
              <span className="font-medium text-foreground">{kyc.perfilPessoal.nps}/10</span>
              {kyc.perfilPessoal.npsNota ? (
                <span className="text-muted-foreground"> · {kyc.perfilPessoal.npsNota}</span>
              ) : null}
            </Field>
          )}
          {kyc.perfilPessoal.funcionarioBanco != null && (
            <Field label={t("vision360.bankEmployee")}>{yesNo(kyc.perfilPessoal.funcionarioBanco)}</Field>
          )}
        </div>
      </Section>

      {/* 3 — Relacionamento (temas sensíveis em destaque) */}
      <Section icon={HeartHandshake} title={t("vision360.secRelationship")} accent>
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
        <div className="grid gap-2.5 sm:grid-cols-2">
          <Field label={t("vision360.channels")}>
            <Chips items={kyc.relacionamento.canaisPreferidos} />
          </Field>
          <Field label={t("vision360.frequency")}>{kyc.relacionamento.frequencia}</Field>
          <Field label={t("vision360.style")}>{kyc.relacionamento.estiloComunicacao}</Field>
          <Field label={t("vision360.spouseClient")}>{yesNo(kyc.relacionamento.conjugeClienteBradesco)}</Field>
          <Field label={t("vision360.childrenClients")}>{yesNo(kyc.relacionamento.filhosClientesBradesco)}</Field>
        </div>
      </Section>

      {/* 4 — Perfil pessoal e familiar (combinados) */}
      <Section icon={Users} title={t("vision360.secProfileFamily")}>
        <div className="grid gap-x-6 gap-y-2.5 md:grid-cols-2">
          <div className="space-y-2.5">
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
          </div>
          <div className="space-y-2.5">
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
              <span className="flex flex-col gap-1">
                {kyc.perfilFamiliar.arvoreGenealogica.map((p, i) => (
                  <span key={i} className="inline-flex flex-wrap items-center gap-1.5">
                    <span
                      className={cn(
                        "size-2 shrink-0 rounded-full",
                        p.temContaBradesco ? "bg-negative" : "bg-muted-foreground/40",
                      )}
                      title={
                        p.temContaBradesco
                          ? t("vision360.bradescoAccount")
                          : t("vision360.noBradescoAccount")
                      }
                    />
                    <span className="text-muted-foreground">{p.parentesco}:</span>
                    <span className="text-foreground/90">{p.nome}</span>
                    {p.banco && p.banco !== "—" && !p.temContaBradesco ? (
                      <span className="text-muted-foreground">· {p.banco}</span>
                    ) : null}
                    {p.isDecisor && (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-warning/15 px-1.5 text-[10px] font-medium text-warning">
                        <Star className="size-2.5 fill-warning" aria-hidden />
                        {t("vision360.decisor")}
                      </span>
                    )}
                  </span>
                ))}
              </span>
            </Field>
          </div>
        </div>
      </Section>

      {/* 5 — Ativos, patrimônio e posição internacional (combinados) */}
      <Section icon={Landmark} title={t("vision360.secAssetsIntl")}>
        <div className="grid gap-x-6 gap-y-2.5 md:grid-cols-2">
          <div className="space-y-2.5">
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
          </div>
          <div className="space-y-2.5">
            <div className="mb-1 flex items-center gap-1.5 text-[11px] tracking-wide text-muted-foreground uppercase">
              <Globe2 className="size-3.5" />
              {t("vision360.secInternational")}
            </div>
            <Field label={t("vision360.internationalAccount")}>{yesNo(kyc.posicaoInternacional.contaInternacional)}</Field>
            <Field label={t("vision360.investsAbroad")}>{yesNo(kyc.posicaoInternacional.investeExterior)}</Field>
            {kyc.posicaoInternacional.valorExterior ? (
              <Field label={t("vision360.abroadValue")}>{cur(kyc.posicaoInternacional.valorExterior)}</Field>
            ) : null}
            {/* v10 A2 — detalhe: qual/onde/produtos */}
            {kyc.posicaoInternacional.detalhes?.map((d, i) => (
              <div key={i} className="rounded-lg border border-border bg-muted/30 p-2 text-xs">
                <div className="font-medium text-foreground">
                  {d.instituicao} · {d.pais}
                </div>
                <div className="text-muted-foreground">
                  {t("vision360.products")}: {d.tiposProduto.join(", ")}
                  {d.valor ? ` · ${cur(d.valor)}` : ""}
                </div>
                {d.observacoes ? <div className="text-muted-foreground">{d.observacoes}</div> : null}
              </div>
            ))}
          </div>
        </div>

        {/* v10 A2 — histórico patrimonial (timeline em modo histórico; v1 lista). */}
        {kyc.historicoPatrimonial?.length ? (
          <div className="mt-1 border-t border-border/60 pt-2.5">
            <div className="mb-1.5 flex items-center gap-1.5 text-[11px] tracking-wide text-muted-foreground uppercase">
              <History className="size-3.5" />
              {t("vision360.wealthHistory")}
            </div>
            <ul className="space-y-1 text-sm">
              {kyc.historicoPatrimonial.map((e, i) => (
                <li key={i} className="flex items-baseline gap-2">
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-1.5 text-[10px] font-medium",
                      e.tipo === "futuro" ? "bg-info/15 text-info" : "bg-muted text-muted-foreground",
                    )}
                  >
                    {e.ano} · {e.tipo === "futuro" ? t("vision360.future") : t("vision360.past")}
                  </span>
                  <span className="text-foreground/85">{e.descricao}</span>
                  {e.valor != null ? (
                    <span
                      className={cn(
                        "ml-auto shrink-0 tabular-nums",
                        e.kind === "entrada" ? "text-positive" : "text-foreground/70",
                      )}
                    >
                      {e.kind === "entrada" ? "+" : "−"}
                      {cur(e.valor)}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </Section>

      {/* 6 — Fluxo de caixa e alertas (despesas declarado-KYC × plano) */}
      <Section icon={Banknote} title={t("vision360.secCashflow")}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <div className="mb-1.5 flex items-center justify-between gap-2 text-[11px] tracking-wide text-muted-foreground uppercase">
              <span>{expenseCmp.hasPlanExpenses ? t("vision360.declaredKyc") : t("vision360.fixedExpenses")}</span>
              <span className="font-semibold text-foreground/70 normal-case">{cur(expenseCmp.kycDeclared)}</span>
            </div>
            <ul className="space-y-1">
              {kyc.fluxoCaixa.despesasFixas.map((d, i) => (
                <li key={i} className="flex items-baseline justify-between gap-3 border-b border-border/50 pb-1 text-sm">
                  <span className="text-foreground/80">{d.categoria}</span>
                  <span className="shrink-0 font-medium text-foreground">{cur(d.valor)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-1.5 text-xs text-muted-foreground">
              {t("vision360.donations")}:{" "}
              {kyc.fluxoCaixa.doacoes.realiza ? kyc.fluxoCaixa.doacoes.descricao ?? t("vision360.yes") : t("vision360.no")}
            </div>
          </div>
          <div>
            {expenseCmp.hasPlanExpenses ? (
              // Despesa do PLANO vem do motor (cashFlowTotals — origem única).
              <>
                <div className="mb-1.5 text-[11px] tracking-wide text-muted-foreground uppercase">
                  {t("vision360.inPlan")}
                </div>
                <div className="rounded-xl border border-border bg-muted/40 p-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-sm text-foreground/80">{t("vision360.totalMonthly")}</span>
                    <span className="font-heading text-base font-semibold text-foreground">{cur(expenseCmp.planTotal)}</span>
                  </div>
                  <div className="mt-1 flex items-baseline justify-between gap-3 text-xs">
                    <span className="text-muted-foreground">{t("vision360.declaredKyc")}</span>
                    <span className="tabular-nums text-foreground/70">{cur(expenseCmp.kycDeclared)}</span>
                  </div>
                  {Math.abs(expenseCmp.delta) >= 1 && (
                    <div className={cn("mt-1.5 text-xs", expenseCmp.delta > 0 ? "text-warning" : "text-positive")}>
                      {expenseCmp.delta > 0 ? "▲" : "▼"} {cur(Math.abs(expenseCmp.delta))} {t("vision360.vsDeclared")}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
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
                      <span className="mt-px shrink-0 rounded-full border border-current/30 px-1.5 text-[10px] font-semibold uppercase">
                        {sevLabel(al.severidade)}
                      </span>
                      <span className="text-foreground/85">{al.texto}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>

        {/* Alertas sempre visíveis (quando o bloco da direita mostrou o plano) */}
        {expenseCmp.hasPlanExpenses && (
          <div>
            <div className="mb-1.5 flex items-center gap-1.5 text-[11px] tracking-wide text-muted-foreground uppercase">
              <AlertTriangle className="size-3.5" />
              {t("vision360.alerts")}
            </div>
            <ul className="grid gap-1.5 sm:grid-cols-2">
              {kyc.fluxoCaixa.alertas.map((al, i) => (
                <li
                  key={i}
                  className={cn("flex items-start gap-2 rounded-lg border px-2.5 py-1.5 text-sm", SEV_TONE[al.severidade])}
                >
                  <span className="mt-px shrink-0 rounded-full border border-current/30 px-1.5 text-[10px] font-semibold uppercase">
                    {sevLabel(al.severidade)}
                  </span>
                  <span className="text-foreground/85">{al.texto}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="rounded-xl bg-muted/50 p-3">
          <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
            <span className="text-[11px] tracking-wide text-muted-foreground uppercase">
              {t("vision360.iaExpenses")}
            </span>
            <IABadge />
          </div>
          <p className="text-sm leading-relaxed text-foreground/85">{kyc.fluxoCaixa.resumoIAGastos}</p>
        </div>

        {/* v10 A3 — IR pré-carregado (mock "via IR", editável) */}
        {ir && (
          <div className="rounded-xl border border-border bg-card p-3">
            <div className="mb-1.5 flex flex-wrap items-center gap-2 text-[11px] tracking-wide text-muted-foreground uppercase">
              <FileText className="size-3.5" />
              {t("vision360.irPreloaded")} {ir.anoBase}
              <SourceBadge source="ir" />
              <span className="rounded-full bg-muted px-1.5 text-[10px] normal-case">
                {t("vision360.editable")}
              </span>
            </div>
            <div className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
              {ir.rendaTributavel != null && (
                <Field label={t("vision360.taxableIncome")}>{cur(ir.rendaTributavel)}</Field>
              )}
              {ir.impostoDevido != null && (
                <Field label={t("vision360.taxDue")}>{cur(ir.impostoDevido)}</Field>
              )}
              {ir.impostoRestituir != null && (
                <Field label={t("vision360.taxRefund")}>{cur(ir.impostoRestituir)}</Field>
              )}
              {ir.bensEDireitos != null && (
                <Field label={t("vision360.assetsRights")}>{cur(ir.bensEDireitos)}</Field>
              )}
            </div>
          </div>
        )}

        {/* v10 A3 — cartão de crédito + Open Finance (mock) */}
        {cartao && (
          <div className="rounded-xl border border-border bg-card p-3">
            <div className="mb-1.5 flex items-center gap-2 text-[11px] tracking-wide text-muted-foreground uppercase">
              <CreditCard className="size-3.5" />
              {t("vision360.card")}
            </div>
            <Field label={t("vision360.avgSpend")}>
              <span className="font-medium text-foreground">{cur(cartao.gastoMedioMensal)}</span>
              <span className="text-muted-foreground">/{t("vision360.monthlyIncome")}</span>
            </Field>
            <Field label={t("vision360.card")}>
              <Chips items={cartao.cartoes} />
            </Field>
            {cartao.gastosPorCategoria?.length ? (
              <div className="mt-2">
                <div className="mb-1.5 text-[11px] text-muted-foreground">{t("cartao.byCategory")}</div>
                <CartaoGastosTable cartao={cartao} />
              </div>
            ) : null}
            {cartao.openFinanceForaDoBanco?.length ? (
              <Field label={t("vision360.outsideBank")}>
                <span className="flex flex-wrap items-center gap-1.5">
                  <Chips items={cartao.openFinanceForaDoBanco} />
                  <SourceBadge source="open-finance" />
                </span>
              </Field>
            ) : null}
          </div>
        )}

        {/* v10 A3 — insights acionáveis (template determinístico) */}
        {kyc.fluxoCaixa.insights?.length ? (
          <div className="rounded-xl border border-info/30 bg-info/[0.03] p-3">
            <div className="mb-1 text-[11px] tracking-wide text-info uppercase">
              {t("vision360.insights")}
            </div>
            <ul className="space-y-1 text-sm text-foreground/85">
              {kyc.fluxoCaixa.insights.map((it, i) => (
                <li key={i} className="flex gap-1.5">
                  <span className="select-none text-info">›</span>
                  <span>{it}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {kyc.fluxoCaixa.atualizadoEm && (
          <FreshnessStamp date={kyc.fluxoCaixa.atualizadoEm} className="self-end" />
        )}
      </Section>

      {/* Proteção (sucessão + seguros) — dado KYC preservado do v8; ponte p/ Entrega */}
      <Section icon={ShieldCheck} title={t("vision360.secProtection")}>
        <Field label={t("vision360.succession")}>{kyc.protecao.planejamentoSucessorio}</Field>
        {kyc.protecao.segurosInternos?.length ? (
          <div>
            <div className="mb-1.5 text-[11px] tracking-wide text-muted-foreground uppercase">
              {t("vision360.internalInsurance")}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {kyc.protecao.segurosInternos.map((s, i) => (
                <SeguroChip key={i} s={s} />
              ))}
            </div>
          </div>
        ) : null}
        <div>
          <div className="mb-1.5 text-[11px] tracking-wide text-muted-foreground uppercase">
            {t("vision360.externalInsurance")}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {kyc.protecao.segurosExternos.map((s, i) => (
              <SeguroChip key={i} s={s} />
            ))}
          </div>
        </div>
        {uncovered.length > 0 && (
          <div className="rounded-lg border border-warning/30 bg-warning/[0.05] px-2.5 py-1.5 text-xs text-foreground/85">
            <span className="inline-flex items-center gap-1 font-medium text-warning">
              <AlertTriangle className="size-3" /> {t("vision360.uncovered")}:
            </span>{" "}
            {uncovered.join(" · ")}
          </div>
        )}
        <Button variant="ghost" size="sm" onClick={seeOpportunities} className="mt-1 self-start text-primary">
          {t("vision360.seeOpportunities")}
        </Button>
      </Section>

      {/* Motor auditável (Python) — cálculo sob demanda, líquido de impostos */}
      <EngineAuditCard plan={plan} />

      {/* Rodapé — 4 números do MOTOR (origem única) + ponte para o Life Planning */}
      <footer className="rounded-2xl border border-border bg-muted/40 px-4 py-3 sm:px-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-4">
            <FooterKpi label={t("vision360.kpiWealth")} value={result ? compact(result.wealthAtRetirement) : "—"} />
            <FooterKpi label={t("vision360.kpiSurplus")} value={cur(totals.surplus)} />
            <FooterKpi label={t("vision360.kpiGoals")} value={`${goalsAchievable}/${plan.goals.length}`} />
            <FooterKpi label={t("vision360.kpiProbability")} value={result ? `${Math.round(result.probabilityOfSuccess)}%` : "—"} />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:shrink-0">
            <Button variant="outline" size="sm" onClick={goLifePlanning} className="w-full sm:w-auto">
              {t("vision360.openLifePlanning")}
            </Button>
            <Button size="sm" onClick={openFullPlan} className="w-full sm:w-auto">
              {t("vision360.openFullPlan")}
            </Button>
          </div>
        </div>
      </footer>
    </div>
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
