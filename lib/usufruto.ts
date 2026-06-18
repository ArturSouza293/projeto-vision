/**
 * C8 — derivação BIDIRECIONAL renda↔capital do objetivo de usufruto, no nível
 * lib (reusa o mathcore do motor — Regra Zero, sem aritmética nova na UI).
 *  - capitalNecessario(renda): quanto o cliente deveria ter guardado;
 *  - rendaSustentavel(capital): quanto de renda esse capital paga.
 * Perpétuo = preserva o principal (renda = capital·i); finito = anuidade real
 * pelo horizonte (permite renda além da longevidade — "maior incapaz").
 */
import { annualToMonthly, pvAnnuity } from "@/engine/mathcore";

/** Capital necessário (R$) para sustentar uma renda mensal-alvo (líquida). */
export function capitalNecessario(
  rendaMensal: number,
  retornoRealAA: number,
  horizonteAnos: number,
  perpetuo: boolean,
): number {
  if (rendaMensal <= 0) return 0;
  const iM = annualToMonthly(retornoRealAA);
  if (perpetuo) return iM > 0 ? rendaMensal / iM : Number.POSITIVE_INFINITY;
  return pvAnnuity(rendaMensal, iM, Math.max(0, Math.round(horizonteAnos * 12)));
}

/** Renda mensal sustentável por um capital — inverso exato de capitalNecessario. */
export function rendaSustentavel(
  capital: number,
  retornoRealAA: number,
  horizonteAnos: number,
  perpetuo: boolean,
): number {
  if (capital <= 0) return 0;
  const iM = annualToMonthly(retornoRealAA);
  if (perpetuo) return capital * iM;
  const fator = pvAnnuity(1, iM, Math.max(0, Math.round(horizonteAnos * 12)));
  return fator > 0 ? capital / fator : 0;
}
