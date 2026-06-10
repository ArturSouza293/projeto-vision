/** v5 — summarize/compare (KPIs do modal "Resumo dos Planos"). */
import { describe, expect, it } from "vitest";

import { compare, deltaKPIs, summarize } from "../summary";
import type { PlanningCase } from "../types";
import { ANO_BASE, baseCase } from "./helpers";

/** Aposentado confortável: carteira grande, alvo modesto, INSS cobre parte. */
function saudavel(): PlanningCase {
  return baseCase({
    profile: { idadeAtual: 55, idadeUsufruto: 65 },
    assets: { itens: [{ nome: "Carteira", valor: 3000000, classe: "liquidez", retornoRealAA: 0.04 }] },
    incomes: {
      recorrentes: [{ nome: "Salário", valorMensal: 20000 }],
      rendaAposentadoria: { modo: "valor", valor: 9000, flagINSS: true, valorINSSMensal: 4000 },
    },
    expenses: {
      itens: [
        { nome: "Essencial", valorMensal: 6000, classe: "essencial" },
        { nome: "Lazer", valorMensal: 3000, classe: "discricionaria" },
      ],
    },
    planParams: { aporteMensal: 5000, retornoRealAAOverride: 0.04 },
  });
}

/** Sem renda na aposentadoria e sem carteira: gap = −essenciais. */
function semRenda(): PlanningCase {
  return baseCase({
    profile: { idadeAtual: 64, idadeUsufruto: 65 },
    assets: { itens: [] },
    incomes: {
      recorrentes: [{ nome: "Salário", valorMensal: 8000 }],
      rendaAposentadoria: { modo: "valor", valor: 0, flagINSS: false },
    },
    expenses: { itens: [{ nome: "Essencial", valorMensal: 4000, classe: "essencial" }] },
    planParams: { aporteMensal: 0 },
  });
}

describe("summarize", () => {
  it("cenário saudável → anoEsgotamento null e gap ≥ 0", () => {
    const k = summarize(saudavel());
    expect(k.anoEsgotamento).toBeNull();
    expect(k.gapRendaEssencialAnual).toBeGreaterThanOrEqual(0);
    expect(k.anoAposentadoria).toBe(ANO_BASE + 10);
    expect(k.patrimonioNaAposentadoria).toBeGreaterThan(3000000);
    expect(k.herancaNaLongevidade).toBeGreaterThan(0);
    // renda média mensal ≈ alvo (9.000) — saque + INSS cobrem o alvo
    expect(k.rendaMediaAposentadoriaMensal).toBeGreaterThan(8000);
  });

  it("sem renda nem carteira → gap = −essenciais anuais (exato)", () => {
    const k = summarize(semRenda());
    expect(k.rendaMediaAposentadoriaMensal).toBeCloseTo(0, 6);
    expect(k.gapRendaEssencialAnual).toBeCloseTo(-4000 * 12, 6);
  });

  it("carteira pequena → anoEsgotamento informado e anterior à longevidade", () => {
    const c = saudavel();
    c.assets.itens[0].valor = 150000;
    c.planParams = { aporteMensal: 0, retornoRealAAOverride: 0.02 };
    const k = summarize(c);
    expect(k.anoEsgotamento).not.toBeNull();
    expect(k.anoEsgotamento!).toBeGreaterThanOrEqual(ANO_BASE + 10);
    expect(k.anoEsgotamento!).toBeLessThan(ANO_BASE + (100 - 55));
  });

  it("determinismo", () => {
    const c = saudavel();
    expect(JSON.stringify(summarize(c))).toBe(JSON.stringify(summarize(structuredClone(c))));
  });
});

describe("compare", () => {
  it("deltas(ref, ref) = 0 em todos os KPIs numéricos", () => {
    const c = saudavel();
    const { cenarios } = compare(c, [structuredClone(c)]);
    const d = cenarios[0].delta;
    expect(d.anoAposentadoria).toBe(0);
    expect(Math.abs(d.patrimonioNaAposentadoria)).toBeLessThan(1e-9);
    expect(Math.abs(d.rendaMediaAposentadoriaMensal)).toBeLessThan(1e-9);
    expect(Math.abs(d.gapRendaEssencialAnual)).toBeLessThan(1e-9);
    expect(Math.abs(d.herancaNaLongevidade)).toBeLessThan(1e-9);
    expect(d.anoEsgotamento).toBeNull(); // nenhum dos dois esgota
  });

  it("cenário pior tem deltas negativos vs referência", () => {
    const ref = saudavel();
    const pior = saudavel();
    pior.planParams = { aporteMensal: 0, retornoRealAAOverride: 0.02 };
    const { cenarios } = compare(ref, [pior]);
    const d = cenarios[0].delta;
    expect(d.patrimonioNaAposentadoria).toBeLessThan(0);
    expect(d.herancaNaLongevidade).toBeLessThan(0);
  });

  it("cenário que DEIXA de esgotar vs ref que esgota → delta null (melhora qualitativa)", () => {
    const esgota = saudavel();
    esgota.assets.itens[0].valor = 150000;
    esgota.planParams = { aporteMensal: 0, retornoRealAAOverride: 0.02 };
    const refKpis = summarize(esgota);
    expect(refKpis.anoEsgotamento).not.toBeNull();
    const melhor = summarize(saudavel());
    expect(deltaKPIs(refKpis, melhor).anoEsgotamento).toBeNull();
  });
});
