/** Regras Vision (reserva/sucessão/aposentadoria) + solveGoal. */
import { describe, expect, it } from "vitest";

import { resolveAssumptions } from "../assumptions";
import { alvoReserva, alvoSucessao, sobraMensal, servicoDividaMensal } from "../rules";
import { solveGoal } from "../solve";
import { ANO_BASE, baseCase, relDiff } from "./helpers";

describe("regras Vision", () => {
  it("reserva = multiplicador × despesas essenciais", () => {
    const c = baseCase(); // essencial 3.000
    const a = resolveAssumptions(c);
    expect(alvoReserva(c, a, 6)).toBeCloseTo(18000, 9);
    expect(alvoReserva(c, a, 12)).toBeCloseTo(36000, 9);
  });

  it("sucessão = max(0, 20%×bruto − previdência − seguros) e nunca negativa", () => {
    const c = baseCase({
      assets: {
        itens: [
          { nome: "Carteira", valor: 1000000, classe: "liquidez" },
          { nome: "PGBL", valor: 150000, classe: "previdencia" },
          { nome: "Seguro", valor: 30000, classe: "seguro" },
        ],
      },
    });
    const a = resolveAssumptions(c);
    // 0.20 × 1.180.000 − 150.000 − 30.000 = 56.000
    expect(alvoSucessao(c, a)).toBeCloseTo(56000, 6);

    const blindado = baseCase({
      assets: {
        itens: [
          { nome: "Carteira", valor: 100000, classe: "liquidez" },
          { nome: "PGBL", valor: 500000, classe: "previdencia" },
        ],
      },
    });
    expect(alvoSucessao(blindado, resolveAssumptions(blindado))).toBe(0);
  });

  it("sobra desconta o serviço de dívida (Price mensal efetivo)", () => {
    const c = baseCase({
      liabilities: {
        itens: [
          { nome: "Financiamento", sistema: "PRICE", taxaEfetivaAA: Math.pow(1.005, 12) - 1, prazoMeses: 360, saldoDevedor: 166791.61 },
        ],
      },
    });
    expect(relDiff(servicoDividaMensal(c), 1000)).toBeLessThan(1e-4);
    // renda 10.000 − despesas 5.000 − dívida 1.000
    expect(relDiff(sobraMensal(c), 4000)).toBeLessThan(1e-4);
  });
});

describe("solveGoal", () => {
  it("PMT bate com a âncora TVM (alvo 12.682,50 em 12m a 1% a.m. ≈ 1.000/m)", () => {
    const c = baseCase({
      planParams: { retornoRealAAOverride: Math.pow(1.01, 12) - 1 },
      goals: [
        { id: "g-reserva", tipo: "reserva" },
        { id: "g-apos", tipo: "aposentadoria" },
        { id: "g-sucessao", tipo: "sucessao" },
        { id: "g-meta", tipo: "outro", valorAlvo: 12682.5, anoAlvo: ANO_BASE + 1, valorAtual: 0 },
      ],
    });
    const s = solveGoal(c, "g-meta");
    expect(relDiff(s.aporteNecessarioMensal, 1000)).toBeLessThan(1e-6);
    expect(s.viavelComSobra).toBe(true); // sobra 5.000 ≥ 1.000
    expect(relDiff(s.valorProjetadoNoAlvo, 12682.5)).toBeLessThan(1e-6);
  });

  it("clampa à sobra e devolve ano viável por bisseção", () => {
    const c = baseCase({
      incomes: { recorrentes: [{ nome: "Salário", valorMensal: 5600 }] }, // sobra = 600
      goals: [
        { id: "g-reserva", tipo: "reserva" },
        { id: "g-apos", tipo: "aposentadoria" },
        { id: "g-sucessao", tipo: "sucessao" },
        { id: "g-casa", tipo: "outro", valorAlvo: 300000, anoAlvo: ANO_BASE + 3, valorAtual: 0 },
      ],
    });
    const s = solveGoal(c, "g-casa");
    expect(s.viavelComSobra).toBe(false);
    expect(s.aporteClampedMensal).toBeCloseTo(600, 6);
    expect(s.anoViavel).not.toBeNull();
    expect(s.anoViavel!).toBeGreaterThan(ANO_BASE + 3);
    // O ano viável de fato fecha com a sobra:
    const meses = (s.anoViavel! - ANO_BASE) * 12;
    const iM = Math.pow(1.04, 1 / 12) - 1;
    const fv = 600 * ((Math.pow(1 + iM, meses) - 1) / iM);
    expect(fv).toBeGreaterThanOrEqual(300000 * 0.999);
  });

  it("aporte já suficiente → PMT 0", () => {
    const c = baseCase({
      goals: [
        { id: "g-reserva", tipo: "reserva" },
        { id: "g-apos", tipo: "aposentadoria" },
        { id: "g-sucessao", tipo: "sucessao" },
        { id: "g-feito", tipo: "outro", valorAlvo: 10000, anoAlvo: ANO_BASE + 10, valorAtual: 10000 },
      ],
    });
    expect(solveGoal(c, "g-feito").aporteNecessarioMensal).toBe(0);
  });
});
