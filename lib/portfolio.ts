/**
 * C3 — Visão Carteira: alocação ATUAL × RECOMENDADA (por perfil) + FIT/gaps.
 * Carteira = MOCK (confirmado): a atual é derivada (ILUSTRATIVA) das classes de
 * ativo do plano; o split renda fixa/variável dentro de "investments" é uma
 * aproximação marcada (não há essa granularidade no cadastro). Funções puras
 * (Regra Zero) — a BIA só lê/classifica; o motor (aqui) calcula o FIT.
 */
import type { AssetClass, RiskProfile } from "@/lib/types";

export type ClasseCarteira =
  | "liquidez"
  | "rendaFixa"
  | "rendaVariavel"
  | "previdencia"
  | "internacional";

export const CLASSES_CARTEIRA: ClasseCarteira[] = [
  "liquidez",
  "rendaFixa",
  "rendaVariavel",
  "previdencia",
  "internacional",
];

/** Alocação-alvo (fração) por perfil de suitability — ilustrativa. */
export const CARTEIRA_RECOMENDADA: Record<RiskProfile, Record<ClasseCarteira, number>> = {
  conservative: { liquidez: 0.1, rendaFixa: 0.65, rendaVariavel: 0.05, previdencia: 0.15, internacional: 0.05 },
  moderate: { liquidez: 0.08, rendaFixa: 0.45, rendaVariavel: 0.22, previdencia: 0.15, internacional: 0.1 },
  aggressive: { liquidez: 0.05, rendaFixa: 0.3, rendaVariavel: 0.4, previdencia: 0.1, internacional: 0.15 },
};

const ZERO = (): Record<ClasseCarteira, number> => ({
  liquidez: 0,
  rendaFixa: 0,
  rendaVariavel: 0,
  previdencia: 0,
  internacional: 0,
});

/**
 * Carteira ATUAL (fração por classe) a partir dos ativos FINANCEIROS do plano.
 * Mapeamento ilustrativo: cash→liquidez, pension→previdência, foreign→internacional,
 * investments→70% renda fixa / 30% renda variável (aproximação marcada como mock).
 */
export function carteiraAtual(
  assets: { assetClass: AssetClass; value: number }[],
): Record<ClasseCarteira, number> {
  const acc = ZERO();
  let total = 0;
  for (const a of assets) {
    if (a.assetClass === "cash") acc.liquidez += a.value;
    else if (a.assetClass === "pension") acc.previdencia += a.value;
    else if (a.assetClass === "foreign") acc.internacional += a.value;
    else if (a.assetClass === "investments") {
      acc.rendaFixa += a.value * 0.7;
      acc.rendaVariavel += a.value * 0.3;
    } else continue; // imóvel/veículo/negócio não entram na carteira financeira
    total += a.value;
  }
  if (total <= 0) return acc;
  for (const c of CLASSES_CARTEIRA) acc[c] = acc[c] / total;
  return acc;
}

export interface CarteiraGap {
  classe: ClasseCarteira;
  atual: number;
  recomendada: number;
  /** atual − recomendada (>0 = sobreponderado; <0 = subponderado). */
  delta: number;
}

/** FIT (0..100, sobreposição) entre a carteira atual e a recomendada + gaps por classe. */
export function fitCarteira(
  atual: Record<ClasseCarteira, number>,
  recomendada: Record<ClasseCarteira, number>,
): { fitPct: number; gaps: CarteiraGap[] } {
  let overlap = 0;
  const gaps = CLASSES_CARTEIRA.map((c) => {
    overlap += Math.min(atual[c], recomendada[c]);
    return { classe: c, atual: atual[c], recomendada: recomendada[c], delta: atual[c] - recomendada[c] };
  });
  return { fitPct: Math.round(overlap * 100), gaps };
}
