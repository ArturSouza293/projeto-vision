/**
 * Vision Engine — amortização BR (C9).
 *
 * Price and SAC over the EFFECTIVE monthly rate derived geometrically from the
 * effective annual rate (C2). CET (fees, insurance, taxes) is OUT of scope —
 * results are labelled "juros efetivos, sem CET".
 */
import { annualToMonthly } from "./mathcore";
import type { Passivo } from "./types";

export interface ParcelaMes {
  mes: number; // 1-based
  parcela: number;
  juros: number;
  amortizacao: number;
  saldo: number;
}

/** Level-payment (Price) installment for a principal/rate/term. */
export function pricePayment(principal: number, iMensal: number, prazoMeses: number): number {
  if (prazoMeses <= 0) return 0;
  if (Math.abs(iMensal) < 1e-12) return principal / prazoMeses;
  return (principal * iMensal) / (1 - Math.pow(1 + iMensal, -prazoMeses));
}

/** Full Price schedule (monthly). */
export function priceSchedule(principal: number, iMensal: number, prazoMeses: number): ParcelaMes[] {
  const pmt = pricePayment(principal, iMensal, prazoMeses);
  const rows: ParcelaMes[] = [];
  let saldo = principal;
  for (let m = 1; m <= prazoMeses; m++) {
    const juros = saldo * iMensal;
    const amort = pmt - juros;
    saldo = Math.max(0, saldo - amort);
    rows.push({ mes: m, parcela: pmt, juros, amortizacao: amort, saldo });
  }
  return rows;
}

/** Full SAC schedule (constant amortization, monthly). */
export function sacSchedule(principal: number, iMensal: number, prazoMeses: number): ParcelaMes[] {
  if (prazoMeses <= 0) return [];
  const amort = principal / prazoMeses;
  const rows: ParcelaMes[] = [];
  let saldo = principal;
  for (let m = 1; m <= prazoMeses; m++) {
    const juros = saldo * iMensal;
    const parcela = amort + juros;
    saldo = Math.max(0, saldo - amort);
    rows.push({ mes: m, parcela, juros, amortizacao: amort, saldo });
  }
  return rows;
}

/** Installment of a liability at month k (1-based) of its remaining term. */
export function liabilityPaymentAt(l: Passivo, k: number): number {
  if (k < 1 || k > l.prazoMeses || l.saldoDevedor <= 0) return 0;
  const iM = annualToMonthly(l.taxaEfetivaAA);
  if (l.sistema === "PRICE") return pricePayment(l.saldoDevedor, iM, l.prazoMeses);
  // SAC: parcela_k = amort + saldo_{k-1}·i, saldo_{k-1} = S·(1 − (k−1)/n)
  const amort = l.saldoDevedor / l.prazoMeses;
  const saldoAntes = l.saldoDevedor * (1 - (k - 1) / l.prazoMeses);
  return amort + saldoAntes * iM;
}
