/** Test helpers — deterministic case factory + seeded PRNG (property tests). */
import type { Goal, PlanningCase } from "../types";

export const ANO_BASE = 2026;

/** Relative-tolerance assertion helper (spec: 1e-6 unless stated). */
export function relDiff(actual: number, expected: number): number {
  if (expected === 0) return Math.abs(actual);
  return Math.abs(actual - expected) / Math.abs(expected);
}

export function mandatoryGoals(): Goal[] {
  return [
    { id: "g-reserva", tipo: "reserva" },
    { id: "g-apos", tipo: "aposentadoria" },
    { id: "g-sucessao", tipo: "sucessao" },
  ];
}

/** A complete, internally consistent base case (all defaults overridable). */
export function baseCase(overrides: Partial<PlanningCase> = {}): PlanningCase {
  return {
    profile: { idadeAtual: 35, idadeUsufruto: 65 },
    incomes: {
      recorrentes: [{ nome: "Salário", valorMensal: 10000 }],
      eventosUnicos: [],
      rendaAposentadoria: { modo: "percentual", valor: 70, flagINSS: false },
    },
    expenses: {
      itens: [
        { nome: "Moradia", valorMensal: 3000, classe: "essencial" },
        { nome: "Lazer", valorMensal: 2000, classe: "discricionaria" },
      ],
    },
    assets: { itens: [{ nome: "CDB", valor: 100000, classe: "liquidez", retornoRealAA: 0.04 }] },
    liabilities: { itens: [] },
    goals: mandatoryGoals(),
    lifeEvents: [],
    planParams: { aporteMensal: 3000, retornoRealAAOverride: 0.04 },
    assumptions: { anoBase: ANO_BASE },
    ...overrides,
  };
}

/** mulberry32 — small deterministic PRNG for property-based tests. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Random-but-valid case for property tests. */
export function randomCase(rnd: () => number): PlanningCase {
  const idadeAtual = 25 + Math.floor(rnd() * 35); // 25..59
  const idadeUsufruto = idadeAtual + 1 + Math.floor(rnd() * (75 - idadeAtual)); // > atual
  const nGoalsExtra = Math.floor(rnd() * 3);
  const goals = mandatoryGoals();
  for (let i = 0; i < nGoalsExtra; i++) {
    goals.push({
      id: `g-extra-${i}`,
      tipo: "outro",
      valorAlvo: 10000 + Math.floor(rnd() * 500000),
      anoAlvo: ANO_BASE + 2 + Math.floor(rnd() * 20),
      valorAtual: Math.floor(rnd() * 50000),
    });
  }
  return baseCase({
    profile: { idadeAtual, idadeUsufruto },
    incomes: {
      recorrentes: [{ nome: "Salário", valorMensal: 3000 + rnd() * 40000, mesesPorAno: rnd() < 0.3 ? 13 : 12 }],
      rendaAposentadoria: {
        modo: "percentual",
        valor: 50 + rnd() * 50,
        flagINSS: rnd() < 0.5,
        valorINSSMensal: 2000 + rnd() * 4000,
      },
    },
    expenses: {
      itens: [
        { nome: "Essencial", valorMensal: 1000 + rnd() * 15000, classe: "essencial" },
        { nome: "Discricionária", valorMensal: rnd() * 8000, classe: "discricionaria" },
      ],
    },
    assets: {
      itens: [
        { nome: "Liquidez", valor: rnd() * 300000, classe: "liquidez" },
        { nome: "Previdência", valor: rnd() * 200000, classe: "previdencia" },
        { nome: "Imóvel", valor: rnd() * 800000, classe: "imovel" },
      ],
    },
    liabilities: {
      itens:
        rnd() < 0.4
          ? [
              {
                nome: "Financiamento",
                sistema: rnd() < 0.5 ? "PRICE" : "SAC",
                taxaEfetivaAA: 0.08 + rnd() * 0.15,
                prazoMeses: 12 + Math.floor(rnd() * 240),
                saldoDevedor: 20000 + rnd() * 400000,
              },
            ]
          : [],
    },
    goals,
    planParams: {},
  });
}
