import { describe, expect, it } from "vitest";

import {
  CARTEIRA_RECOMENDADA,
  CLASSES_CARTEIRA,
  carteiraAtual,
  fitCarteira,
} from "@/lib/portfolio";

describe("C3 — visão carteira", () => {
  it("carteira atual soma 1 e mapeia as classes", () => {
    const a = carteiraAtual([
      { assetClass: "cash", value: 100 },
      { assetClass: "pension", value: 100 },
      { assetClass: "foreign", value: 100 },
      { assetClass: "investments", value: 100 }, // 70 RF / 30 RV
      { assetClass: "real_estate", value: 999 }, // não entra na carteira financeira
    ]);
    const soma = CLASSES_CARTEIRA.reduce((s, c) => s + a[c], 0);
    expect(soma).toBeCloseTo(1, 6);
    expect(a.liquidez).toBeCloseTo(0.25, 6);
    expect(a.previdencia).toBeCloseTo(0.25, 6);
    expect(a.internacional).toBeCloseTo(0.25, 6);
    expect(a.rendaFixa).toBeCloseTo(0.175, 6);
    expect(a.rendaVariavel).toBeCloseTo(0.075, 6);
  });

  it("carteira vazia → tudo 0", () => {
    const a = carteiraAtual([]);
    expect(CLASSES_CARTEIRA.every((c) => a[c] === 0)).toBe(true);
  });

  it("FIT = 100 quando atual == recomendada", () => {
    const rec = CARTEIRA_RECOMENDADA.moderate;
    const { fitPct, gaps } = fitCarteira(rec, rec);
    expect(fitPct).toBe(100);
    expect(gaps.every((g) => g.delta === 0)).toBe(true);
  });

  it("FIT < 100 e gaps assinalados quando difere", () => {
    const { fitPct, gaps } = fitCarteira(
      { liquidez: 0.5, rendaFixa: 0.5, rendaVariavel: 0, previdencia: 0, internacional: 0 },
      CARTEIRA_RECOMENDADA.aggressive,
    );
    expect(fitPct).toBeLessThan(100);
    expect(gaps.find((g) => g.classe === "rendaVariavel")!.delta).toBeLessThan(0); // subponderado
  });
});
