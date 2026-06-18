import { describe, expect, it } from "vitest";

import {
  alavancaBinding,
  nextStepFromVitalSign,
  type MagnitudesMotor,
  type SinaisVitais,
} from "@/lib/vital-signs";

const M: MagnitudesMotor = {
  deltaAporteParaZerar: 6246.46, // Disciplina Mensal do exemplo Prime Top Tier
  anosParaAdiar: 4,
  reducaoRendaAlvoMensal: 8000,
  aporteUnicoDisponivel: 3_500_000,
};

function sinais(p: Partial<SinaisVitais> = {}): SinaisVitais {
  return {
    lacunaMensal: 6246.46,
    probabilidade: 60,
    horizonteAnos: 20,
    perfilConservadorLongoPrazo: false,
    espolioDescoberto: false,
    objetivosAtingiveis: 2,
    objetivosTotais: 4,
    ...p,
  };
}

describe("C11 — nextStepFromVitalSign (Prime Top Tier)", () => {
  it("sem lacuna ⇒ nenhuma recomendação", () => {
    expect(nextStepFromVitalSign(sinais({ lacunaMensal: 0 }), M)).toEqual([]);
    expect(nextStepFromVitalSign(sinais({ lacunaMensal: -10 }), M)).toEqual([]);
  });

  it("caso geral ⇒ aporte é a alavanca binding (1ª)", () => {
    const r = nextStepFromVitalSign(sinais(), M);
    expect(r[0].alavanca).toBe("aporte");
    expect(r[0].binding).toBe(true);
    expect(r[0].magnitude).toBe(6246.46); // magnitude do motor
  });

  it("horizonte curto ⇒ adiar usufruto binding", () => {
    expect(alavancaBinding(sinais({ horizonteAnos: 3 }))).toBe("adiar_usufruto");
    expect(nextStepFromVitalSign(sinais({ horizonteAnos: 3 }), M)[0].alavanca).toBe("adiar_usufruto");
  });

  it("conservador demais em horizonte longo + prob baixa ⇒ revisar perfil", () => {
    expect(
      alavancaBinding(sinais({ perfilConservadorLongoPrazo: true, probabilidade: 55 })),
    ).toBe("perfil_retorno");
  });

  it("espólio descoberto ⇒ proteção/sucessão binding e presente na lista", () => {
    const r = nextStepFromVitalSign(sinais({ espolioDescoberto: true }), M);
    expect(r[0].alavanca).toBe("protecao_sucessao");
    expect(r.some((x) => x.alavanca === "protecao_sucessao")).toBe(true);
  });

  it("ordena: binding primeiro, depois as com magnitude do motor", () => {
    const r = nextStepFromVitalSign(sinais(), M);
    // depois do binding (aporte), as com magnitude vêm antes das sem
    const idxComMag = r.findIndex((x) => !x.binding && x.magnitude != null);
    const idxSemMag = r.findIndex((x) => x.magnitude == null);
    expect(idxComMag).toBeLessThan(idxSemMag);
  });
});
