/** Amortização BR (C9) — âncoras SAC/Price, taxa efetiva mensal. */
import { describe, expect, it } from "vitest";

import { liabilityPaymentAt, pricePayment, priceSchedule, sacSchedule } from "../amortization";
import { relDiff } from "./helpers";

describe("SAC (120.000; 120m; 1% a.m.) — âncoras", () => {
  const rows = sacSchedule(120000, 0.01, 120);

  it("amortização constante = 1.000", () => {
    expect(rows[0].amortizacao).toBeCloseTo(1000, 9);
    expect(rows[60].amortizacao).toBeCloseTo(1000, 9);
  });

  it("1ª parcela = 2.200", () => {
    expect(relDiff(rows[0].parcela, 2200)).toBeLessThan(1e-6);
  });

  it("última parcela = 1.010", () => {
    expect(relDiff(rows[119].parcela, 1010)).toBeLessThan(1e-6);
  });

  it("saldo final = 0", () => {
    expect(rows[119].saldo).toBeCloseTo(0, 6);
  });

  it("parcelas decrescem monotonicamente", () => {
    for (let k = 1; k < rows.length; k++) expect(rows[k].parcela).toBeLessThan(rows[k - 1].parcela);
  });
});

describe("Price", () => {
  it("PMT (166.791,61; 0,5%; 360m) ≈ 1.000", () => {
    expect(relDiff(pricePayment(166791.61, 0.005, 360), 1000)).toBeLessThan(1e-4);
  });

  it("parcela constante e saldo final 0", () => {
    const rows = priceSchedule(300000, 0.008, 240);
    expect(rows[0].parcela).toBeCloseTo(rows[239].parcela, 9);
    expect(rows[239].saldo).toBeCloseTo(0, 5);
  });

  it("Σ amortizações = principal", () => {
    const rows = priceSchedule(50000, 0.012, 48);
    const totalAmort = rows.reduce((s, r) => s + r.amortizacao, 0);
    expect(relDiff(totalAmort, 50000)).toBeLessThan(1e-9);
  });

  it("taxa zero → parcelas lineares", () => {
    const rows = priceSchedule(12000, 0, 12);
    expect(rows[0].parcela).toBeCloseTo(1000, 9);
    expect(rows[11].saldo).toBeCloseTo(0, 9);
  });
});

describe("liabilityPaymentAt (parcela do mês k do prazo remanescente)", () => {
  const passivoSac = {
    nome: "x",
    sistema: "SAC" as const,
    taxaEfetivaAA: Math.pow(1.01, 12) - 1, // 1% a.m. efetivo
    prazoMeses: 120,
    saldoDevedor: 120000,
  };

  it("bate com o schedule SAC", () => {
    const rows = sacSchedule(120000, 0.01, 120);
    expect(relDiff(liabilityPaymentAt(passivoSac, 1), rows[0].parcela)).toBeLessThan(1e-9);
    expect(relDiff(liabilityPaymentAt(passivoSac, 120), rows[119].parcela)).toBeLessThan(1e-9);
  });

  it("zero fora do prazo", () => {
    expect(liabilityPaymentAt(passivoSac, 121)).toBe(0);
    expect(liabilityPaymentAt(passivoSac, 0)).toBe(0);
  });
});
