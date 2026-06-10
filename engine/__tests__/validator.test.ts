/** Validador da Regra Zero — positivo, negativo e payloads maliciosos. */
import { describe, expect, it } from "vitest";

import { validateBiaProposal } from "../validator";
import { baseCase } from "./helpers";

const c = baseCase();

describe("Regra Zero — propostas válidas (whitelist)", () => {
  it("aceita proposta estrutural completa", () => {
    const r = validateBiaProposal(
      {
        ordemPrioridade: ["g-reserva", "g-apos", "g-sucessao"],
        datasAlvo: { "g-apos": 2046 },
        multiplicadorReserva: 12,
        metodoAposentadoria: "preservation",
        flags: { considerarINSS: true },
      },
      c,
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.proposal.multiplicadorReserva).toBe(12);
      expect(r.proposal.datasAlvo!["g-apos"]).toBe(2046);
    }
  });

  it("aceita proposta vazia e parcial", () => {
    expect(validateBiaProposal({}, c).ok).toBe(true);
    expect(validateBiaProposal({ multiplicadorReserva: 6 }, c).ok).toBe(true);
  });
});

describe("Regra Zero — payloads rejeitados", () => {
  it("rejeita campos monetários (a LLM tentando mandar números)", () => {
    const r = validateBiaProposal({ aporteMensal: 3500, multiplicadorReserva: 6 }, c);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join()).toContain("aporteMensal");
  });

  it("rejeita percentuais calculados", () => {
    expect(validateBiaProposal({ retornoEsperado: 0.07 }, c).ok).toBe(false);
    expect(validateBiaProposal({ parametros: { inflacao: 0.05 } }, c).ok).toBe(false);
  });

  it("rejeita números embutidos em strings", () => {
    const r = validateBiaProposal({ ordemPrioridade: ["aporte de R$ 5.000"] }, c);
    expect(r.ok).toBe(false);
  });

  it("rejeita id de objetivo inexistente (sem contrabando via ids)", () => {
    expect(validateBiaProposal({ ordemPrioridade: ["g-fake-99"] }, c).ok).toBe(false);
    expect(validateBiaProposal({ datasAlvo: { "g-fake": 2040 } }, c).ok).toBe(false);
  });

  it("rejeita multiplicador fora de {6,12} e método fora do enum", () => {
    expect(validateBiaProposal({ multiplicadorReserva: 9 }, c).ok).toBe(false);
    expect(validateBiaProposal({ metodoAposentadoria: "yolo" }, c).ok).toBe(false);
  });

  it("rejeita datas fora da janela sã e não-inteiras", () => {
    expect(validateBiaProposal({ datasAlvo: { "g-apos": 1990 } }, c).ok).toBe(false);
    expect(validateBiaProposal({ datasAlvo: { "g-apos": 2040.7 } }, c).ok).toBe(false);
    expect(validateBiaProposal({ datasAlvo: { "g-apos": 2200 } }, c).ok).toBe(false);
  });

  it("rejeita flags desconhecidas e valores não-booleanos", () => {
    expect(validateBiaProposal({ flags: { hackTheBank: true } }, c).ok).toBe(false);
    expect(validateBiaProposal({ flags: { considerarINSS: "sim" } }, c).ok).toBe(false);
  });

  it("rejeita payload malicioso completo da BIA (simulação)", () => {
    const malicioso = {
      ordemPrioridade: ["g-reserva"],
      aporteMensal: 99999,
      racional: "Invista R$ 99.999 por mês",
      parametros: { monthlyContribution: 99999, expectedRealReturn: 0.25 },
      flags: { considerarINSS: true, __proto__: true },
    };
    const r = validateBiaProposal(malicioso, c);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.length).toBeGreaterThanOrEqual(2);
  });

  it("rejeita não-objetos", () => {
    expect(validateBiaProposal(null, c).ok).toBe(false);
    expect(validateBiaProposal([1, 2], c).ok).toBe(false);
    expect(validateBiaProposal("multiplicadorReserva: 6", c).ok).toBe(false);
  });
});
