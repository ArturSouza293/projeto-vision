/**
 * Project Vision — planning premises (FPSB / Planejar methodology).
 *
 * Every structural assumption the engine relies on lives HERE, with an explicit
 * source + reference year, so nothing is silently hard-coded. The advisor can
 * review and override each value in the Premissas dialog; `plan.premises` stores
 * any per-plan overrides, falling back to `DEFAULT_PREMISES`.
 *
 * ⚠️ The official tables (INSS ceiling, IRRF brackets) change yearly. The values
 * below are the latest the prototype shipped with; the dialog shows the source +
 * year and a disclaimer asking the advisor to confirm the figures in force.
 */

import type { Plan } from "@/lib/types";

/** A bracket of the monthly progressive IRRF table. */
export interface IrrfBracket {
  /** Upper bound of the monthly base (BRL); `null` = top (no upper bound). */
  upTo: number | null;
  /** Marginal rate, 0..1. */
  rate: number;
  /** Parcela a deduzir (BRL). */
  deduct: number;
}

/** Citation shown next to a premise so the number is never unsourced. */
export interface PremiseSource {
  /** Human-readable source. */
  label: string;
  /** Reference year. */
  year: number;
}

export type PremiseKey =
  | "return"
  | "inflation"
  | "horizon"
  | "longevity"
  | "reserve"
  | "succession"
  | "inss"
  | "irrf";

export interface Premises {
  /** Expected annual REAL return reference (%, above inflation). */
  realReturnRef: number;
  /** Annual inflation reference / IPCA (%). */
  inflationRef: number;
  /** Projection horizon age — how far the charts/probability project. */
  planningHorizonAge: number;
  /** Longevity age — base for the retirement-capital annuity (viver até…). */
  longevityAge: number;
  /** Emergency reserve = months × essential monthly expenses. */
  emergencyReserveMonths: number;
  /** Succession liquidity target = % of gross assets. */
  successionPctOfGross: number;
  /** INSS — teto do benefício (R$/mês). */
  inssCeiling: number;
  /** INSS — taxa de reposição estimada sobre a renda recorrente (0..1, heurística). */
  inssReplacementRate: number;
  /** IRRF — desconto simplificado mensal (R$). */
  irrfSimplifiedDeduction: number;
  /** IRRF — tabela progressiva mensal (faixas ascendentes). */
  irrfTable: IrrfBracket[];
  /** Fonte + ano de cada grupo de premissa (exibição). */
  meta: Record<PremiseKey, PremiseSource>;
}

/** Latest-known defaults (BR). Editable per-plan; sources shown in the dialog. */
export const DEFAULT_PREMISES: Premises = {
  realReturnRef: 5,
  inflationRef: 4,
  planningHorizonAge: 95,
  longevityAge: 100,
  emergencyReserveMonths: 6,
  successionPctOfGross: 20,
  inssCeiling: 8157.41,
  inssReplacementRate: 0.6,
  irrfSimplifiedDeduction: 564.8,
  irrfTable: [
    { upTo: 2259.2, rate: 0, deduct: 0 },
    { upTo: 2826.65, rate: 0.075, deduct: 169.44 },
    { upTo: 3751.05, rate: 0.15, deduct: 381.44 },
    { upTo: 4664.68, rate: 0.225, deduct: 662.77 },
    { upTo: null, rate: 0.275, deduct: 896.0 },
  ],
  meta: {
    return: { label: "NTN-B / Tesouro IPCA+ — juro real de referência", year: 2025 },
    inflation: { label: "IPCA — Boletim Focus / BCB (referência)", year: 2025 },
    horizon: { label: "Horizonte de projeção do plano", year: 2025 },
    longevity: { label: "Convenção de planejamento (longevidade)", year: 2025 },
    reserve: { label: "Reserva de emergência (6–12 meses) — boa prática FPSB/Planejar", year: 2025 },
    succession: { label: "Liquidez sucessória estimada (ITCMD + custos do espólio)", year: 2025 },
    inss: { label: "Teto INSS — Portaria Interministerial MPS/MF", year: 2025 },
    irrf: { label: "Tabela progressiva mensal do IRRF — Receita Federal", year: 2025 },
  },
};

/** The premises in force for a plan (per-plan overrides over the defaults). */
export function getPremises(plan: Plan | null | undefined): Premises {
  return plan?.premises ? { ...DEFAULT_PREMISES, ...plan.premises } : DEFAULT_PREMISES;
}

/** Estimated monthly INSS retirement benefit (capped at the ceiling). Heuristic. */
export function inssRetirementBenefit(recurringMonthlyIncome: number, p: Premises): number {
  return Math.min(Math.round(recurringMonthlyIncome * p.inssReplacementRate), p.inssCeiling);
}

/** Monthly IRRF due on a taxable base, via the progressive table. */
export function irrfMonthly(taxableBase: number, p: Premises): number {
  if (taxableBase <= 0) return 0;
  const bracket =
    p.irrfTable.find((b) => b.upTo === null || taxableBase <= b.upTo) ??
    p.irrfTable[p.irrfTable.length - 1];
  return Math.max(0, taxableBase * bracket.rate - bracket.deduct);
}

/** Effective IRRF rate (0..1) on a taxable base — for the dialog preview. */
export function irrfEffectiveRate(taxableBase: number, p: Premises): number {
  if (taxableBase <= 0) return 0;
  return irrfMonthly(taxableBase, p) / taxableBase;
}
