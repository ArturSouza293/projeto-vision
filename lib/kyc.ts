/**
 * v8 — derivações sobre o dossiê KYC. Lógica fica AQUI (com teste), nunca
 * inline em componente. Os números financeiros vêm do mesmo motor que o resto
 * do app (`investableWealth`); só o saldo declarado é dado estático do KYC.
 */
import { cashFlowTotals, investableWealth } from "@/lib/calc";
import { KYC_DOSSIERS } from "@/lib/mock/kyc";
import type { ClientKYC, Plan } from "@/lib/types";

/**
 * Resolve o dossiê KYC de um plano de forma ROBUSTA: primeiro o snapshot
 * (`clientProfile.kyc`), com fallback no dossiê da persona pelo `clientId`.
 * O fallback é o que faz a Visão 360 funcionar mesmo quando o plano foi
 * persistido no localStorage ANTES do campo `kyc` existir (snapshot velho) —
 * e mantém o gate correto: casos criados do zero têm `clientId` aleatório,
 * fora de KYC_DOSSIERS, então não ganham 360.
 */
export function kycFor(plan: Plan): ClientKYC | undefined {
  return plan.clientProfile.kyc ?? KYC_DOSSIERS[plan.clientId];
}

/**
 * Share of wallet = saldo consolidado no banco (KYC) ÷ patrimônio financeiro
 * total do caso (motor: caixa + investimentos + previdência). Retorna fração
 * 0..1, ou `null` quando não há KYC ou patrimônio financeiro.
 */
export function shareOfWallet(plan: Plan): number | null {
  const saldo = kycFor(plan)?.ativosFinanceiros.saldoConsolidadoBanco;
  if (saldo == null) return null;
  const financial = investableWealth(plan.netWorth);
  if (financial <= 0) return null;
  return saldo / financial;
}

export interface ShareOfWalletInsight {
  /** Fração 0..1. */
  share: number;
  /** Percentual arredondado para exibição. */
  pct: number;
  /**
   * Leitura comercial: share baixo num cliente com patrimônio relevante é
   * sinal de OPORTUNIDADE de captura (o dinheiro está em outro lugar), não de
   * desinteresse. Ex.: Ricardo — share ~23% com R$ 1,2M é alvo de consolidação.
   */
  captureOpportunity: boolean;
}

/** Patrimônio "relevante" para a leitura de captura (cliente capaz). */
const CAPABLE_INVESTABLE = 300_000;

export function shareOfWalletInsight(plan: Plan): ShareOfWalletInsight | null {
  const share = shareOfWallet(plan);
  if (share == null) return null;
  const capable =
    investableWealth(plan.netWorth) >= CAPABLE_INVESTABLE ||
    plan.suitability.profile === "aggressive";
  return {
    share,
    pct: Math.round(share * 100),
    captureOpportunity: share < 0.5 && capable,
  };
}

export interface ExpenseComparison {
  /** Total mensal das despesas fixas DECLARADAS no dossiê KYC. */
  kycDeclared: number;
  /** Total mensal de despesas do PLANO (motor: cashFlowTotals.expense). */
  planTotal: number;
  /** planTotal − kycDeclared (positivo = plano gasta mais que o declarado). */
  delta: number;
  /** Há despesas cadastradas no plano? (senão, mostrar só o lado do KYC.) */
  hasPlanExpenses: boolean;
}

/**
 * Despesas declaradas no KYC × despesas do plano (motor). Mantém a aritmética
 * FORA do componente (Regra Zero): o número do plano vem de `cashFlowTotals`
 * (origem única), o do KYC soma as despesas fixas estáticas do dossiê.
 */
export function kycExpenseComparison(plan: Plan): ExpenseComparison | null {
  const kyc = kycFor(plan);
  if (!kyc) return null;
  const kycDeclared = kyc.fluxoCaixa.despesasFixas.reduce((s, d) => s + d.valor, 0);
  const planTotal = cashFlowTotals(plan.cashFlow, plan.netWorth).expense;
  return {
    kycDeclared,
    planTotal,
    delta: planTotal - kycDeclared,
    hasPlanExpenses: plan.cashFlow.expenses.length > 0,
  };
}
