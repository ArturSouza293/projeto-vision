/** Performance gate: project() de 65 anos (780 meses), 20 eventos, 10 despesas < 5 ms. */
import { describe, expect, it } from "vitest";

import { project } from "../projection";
import type { Despesa, EventoDeVida, PlanningCase } from "../types";
import { ANO_BASE, baseCase } from "./helpers";

function heavyCase(): PlanningCase {
  const despesas: Despesa[] = Array.from({ length: 10 }, (_, i) => ({
    nome: `Despesa ${i}`,
    valorMensal: 300 + i * 137,
    classe: i % 2 ? "discricionaria" : "essencial",
    crescimentoRealAA: i % 3 === 0 ? 0.01 : 0,
  }));
  const eventos: EventoDeVida[] = Array.from({ length: 20 }, (_, i) => ({
    id: `ev-${i}`,
    tipo: i % 3 === 0 ? "entrada" : "saida",
    valor: 5000 + i * 2500,
    ano: ANO_BASE + 1 + ((i * 3) % 60),
    mes: (i % 12) + 1,
    recorrente: i % 5 === 0,
    anoFim: i % 5 === 0 ? ANO_BASE + 5 + i : undefined,
  }));
  return baseCase({
    profile: { idadeAtual: 35, idadeUsufruto: 65 }, // 100−35 = 65 anos = 780 meses
    expenses: { itens: despesas },
    lifeEvents: eventos,
    liabilities: {
      itens: [
        { nome: "Imob", sistema: "SAC", taxaEfetivaAA: 0.105, prazoMeses: 300, saldoDevedor: 350000 },
        { nome: "Auto", sistema: "PRICE", taxaEfetivaAA: 0.22, prazoMeses: 48, saldoDevedor: 45000 },
      ],
    },
  });
}

describe("bench — project() (gate: < 5 ms)", () => {
  it("780 meses, 20 eventos, 10 despesas, 2 passivos", () => {
    const c = heavyCase();
    // sanity: full horizon
    const p = project(c);
    expect(p.anos.length).toBe(65);

    // warmup (JIT)
    for (let k = 0; k < 20; k++) project(c);

    const N = 100;
    const t0 = performance.now();
    for (let k = 0; k < N; k++) project(c);
    const avgMs = (performance.now() - t0) / N;

    // eslint-disable-next-line no-console
    console.log(`bench project(): ${avgMs.toFixed(3)} ms/run (média de ${N})`);
    expect(avgMs).toBeLessThan(5);
  });
});
