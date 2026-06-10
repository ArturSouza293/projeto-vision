/** Mathcore anchors — canonical HP-12C/Excel values, relative tolerance 1e-6. */
import { describe, expect, it } from "vitest";

import {
  annualToMonthly,
  fisherNominal,
  fisherReal,
  fvAnnuity,
  fvGrowingAnnuity,
  monthlyToAnnual,
  pvAnnuity,
  pvGrowingAnnuity,
  solveTVM,
} from "../mathcore";
import { relDiff } from "./helpers";

const TOL = 1e-6;

describe("conversões de taxa (C2 — efetiva composta, convenção BR)", () => {
  it("12% a.a. → 0,948879% a.m. (âncora)", () => {
    expect(relDiff(annualToMonthly(0.12), 0.00948879)).toBeLessThan(1e-5);
    // exact geometric value
    expect(annualToMonthly(0.12)).toBeCloseTo(Math.pow(1.12, 1 / 12) - 1, 12);
  });

  it("roundtrip anual ↔ mensal", () => {
    for (const i of [0.005, 0.04, 0.1, 0.25]) {
      expect(relDiff(monthlyToAnnual(annualToMonthly(i)), i)).toBeLessThan(1e-12);
    }
  });

  it("NÃO é APR americano (nominal/12)", () => {
    expect(annualToMonthly(0.12)).not.toBeCloseTo(0.01, 5);
  });
});

describe("Fisher exato (C3)", () => {
  it("nominal 10% / inflação 4% → real 5,76923% (âncora)", () => {
    expect(relDiff(fisherReal(0.1, 0.04), 0.0576923)).toBeLessThan(1e-5);
    expect(fisherReal(0.1, 0.04)).toBeCloseTo(1.1 / 1.04 - 1, 12);
  });

  it("NÃO é a aproximação por subtração", () => {
    expect(fisherReal(0.1, 0.04)).not.toBeCloseTo(0.06, 4);
  });

  it("roundtrip real ↔ nominal", () => {
    expect(relDiff(fisherNominal(fisherReal(0.1, 0.04), 0.04), 0.1)).toBeLessThan(1e-12);
  });
});

describe("anuidades (C5 — BEG/END)", () => {
  it("FV (1.000; 1% a.m.; 12m) ordinária = 12.682,50 (âncora)", () => {
    expect(relDiff(fvAnnuity(1000, 0.01, 12, "end"), 12682.5)).toBeLessThan(TOL);
  });

  it("FV antecipada = 12.809,33 (âncora) e FV_begin = FV_end × (1+i)", () => {
    const fvEnd = fvAnnuity(1000, 0.01, 12, "end");
    const fvBegin = fvAnnuity(1000, 0.01, 12, "begin");
    expect(relDiff(fvBegin, 12809.33)).toBeLessThan(TOL);
    expect(relDiff(fvBegin, fvEnd * 1.01)).toBeLessThan(1e-12);
  });

  it("PV Price (1.000; 0,5% a.m.; 360m) = 166.791,61 (tol. 0,01%)", () => {
    expect(relDiff(pvAnnuity(1000, 0.005, 360), 166791.61)).toBeLessThan(1e-4);
  });

  it("taxa zero degrada para soma simples", () => {
    expect(fvAnnuity(500, 0, 24)).toBeCloseTo(12000, 10);
    expect(pvAnnuity(500, 0, 24)).toBeCloseTo(12000, 10);
  });
});

describe("growing annuity (C6)", () => {
  it("caso g = r (C=100; 5%; n=10) → PV = 952,38 (âncora)", () => {
    expect(relDiff(pvGrowingAnnuity(100, 0.05, 0.05, 10), 952.380952)).toBeLessThan(TOL);
  });

  it("g = 0 reduz à anuidade level", () => {
    expect(relDiff(pvGrowingAnnuity(1000, 0.01, 0, 12), pvAnnuity(1000, 0.01, 12))).toBeLessThan(1e-12);
  });

  it("FV = PV × (1+r)^n", () => {
    const pv = pvGrowingAnnuity(100, 0.04, 0.02, 20);
    expect(relDiff(fvGrowingAnnuity(100, 0.04, 0.02, 20), pv * Math.pow(1.04, 20))).toBeLessThan(1e-12);
  });
});

describe("solveTVM (5 variáveis + timing, bisseção robusta)", () => {
  it("resolve FV (convenção de sinais HP-12C)", () => {
    // deposit 1.000/month (outflow) → FV positive
    expect(relDiff(solveTVM({ n: 12, i: 0.01, pv: 0, pmt: -1000 }), 12682.5)).toBeLessThan(TOL);
  });

  it("roundtrips: cada variável recuperada das outras quatro", () => {
    const base = { n: 240, i: 0.007, pv: -50000, pmt: -800 };
    const fv = solveTVM(base);
    expect(relDiff(solveTVM({ i: base.i, pv: base.pv, pmt: base.pmt, fv, n: undefined }), base.n)).toBeLessThan(1e-6);
    expect(relDiff(solveTVM({ n: base.n, pv: base.pv, pmt: base.pmt, fv, i: undefined }), base.i)).toBeLessThan(1e-6);
    expect(relDiff(solveTVM({ n: base.n, i: base.i, pmt: base.pmt, fv, pv: undefined }), base.pv)).toBeLessThan(1e-9);
    expect(relDiff(solveTVM({ n: base.n, i: base.i, pv: base.pv, fv, pmt: undefined }), base.pmt)).toBeLessThan(1e-9);
  });

  it("timing begin desloca a anuidade (HP-12C BEG)", () => {
    const fvEnd = solveTVM({ n: 12, i: 0.01, pv: 0, pmt: -1000, timing: "end" });
    const fvBeg = solveTVM({ n: 12, i: 0.01, pv: 0, pmt: -1000, timing: "begin" });
    expect(relDiff(fvBeg, fvEnd * 1.01)).toBeLessThan(1e-12);
  });

  it("resolve i de um financiamento Price conhecido", () => {
    // pv 166.791,61 / pmt −1.000 / 360m → i = 0,5% a.m.
    const i = solveTVM({ n: 360, pv: 166791.61, pmt: -1000, fv: 0 });
    expect(relDiff(i, 0.005)).toBeLessThan(1e-4);
  });

  it("rejeita queries com nº errado de incógnitas", () => {
    expect(() => solveTVM({ n: 12, i: 0.01 })).toThrow();
    expect(() => solveTVM({ n: 12, i: 0.01, pv: 0, pmt: -1, fv: 0 })).toThrow();
  });
});
