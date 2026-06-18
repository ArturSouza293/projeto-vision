import { describe, expect, it } from "vitest";

import { MACRO_FACTS, containsMacroClaim, stripMacroClaims } from "@/lib/macro-facts";

describe("macro guard — Regra Zero (número macro nunca vem de texto da BIA)", () => {
  it("detecta afirmação macro em texto livre da BIA", () => {
    expect(containsMacroClaim("A Selic hoje está em 15% ao ano.")).toBe(true);
    expect(containsMacroClaim("O IPCA acumulado é 4,2%.")).toBe(true);
    expect(containsMacroClaim("O teto do INSS é R$ 8.157,41.")).toBe(true);
    expect(containsMacroClaim("CDI rodando a 14,4%.")).toBe(true);
  });

  it("não acusa proposta ESTRUTURAL sem número macro", () => {
    expect(
      containsMacroClaim("Priorize a reserva de emergência antes do usufruto."),
    ).toBe(false);
    expect(containsMacroClaim("Considere o objetivo de sucessão do cliente.")).toBe(false);
    // menciona o termo mas sem afirmar número — não é uma "claim" macro
    expect(containsMacroClaim("Vale revisar a sensibilidade à Selic no cenário.")).toBe(false);
  });

  it("higieniza a frase macro, preservando o resto", () => {
    const out = stripMacroClaims("A Selic está em 15%. Priorize a reserva.");
    expect(out).not.toContain("15%");
    expect(out).toContain("reserva");
  });

  it("toda fonte macro tem fonte + data (exibição auditável)", () => {
    for (const f of Object.values(MACRO_FACTS)) {
      expect(f.fonte.length).toBeGreaterThan(0);
      expect(f.data).toMatch(/^\d{4}/);
    }
  });
});
