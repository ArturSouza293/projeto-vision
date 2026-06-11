/**
 * v8 — REGRA ZERO / privacidade: o payload da BIA (buildPlanoIdealPayload) é
 * uma whitelist POR INCLUSÃO — nada de KYC pode vazar. Carregamos uma persona
 * seed (que TEM dossiê KYC cheio de PII fictícia) e garantimos que nenhum
 * fragmento identificável do KYC aparece no JSON enviado à API.
 */
import { describe, expect, it } from "vitest";

import { buildPlanoIdealPayload } from "@/lib/plano-ideal";
import { SEED_PLANS } from "@/lib/mock/clients";
import type { Plan, ScenarioAssumptions } from "@/lib/types";

const DEFAULT_A: ScenarioAssumptions = {
  monthlyContribution: 0,
  retirementAge: 60,
  expectedRealReturn: 4,
  inflation: 5,
  growthScenario: "base",
};
// Alguns seeds brutos não trazem cenário (o ensureBaseScenario só roda no
// loadClient); para o teste de privacidade basta um conjunto válido qualquer.
const assumptionsOf = (p: Plan): ScenarioAssumptions =>
  (p.scenarios.find((s) => s.id === p.selectedScenarioId) ?? p.scenarios[0])?.assumptions ?? DEFAULT_A;

describe("buildPlanoIdealPayload — KYC nunca vaza", () => {
  it("nenhum campo/valor do KYC aparece no payload (Ricardo)", () => {
    const ricardo = SEED_PLANS.find((p) => p.clientId === "ricardo")!;
    expect(ricardo.clientProfile.kyc).toBeTruthy(); // pré-condição: tem KYC

    const payload = buildPlanoIdealPayload(ricardo, assumptionsOf(ricardo));
    const json = JSON.stringify(payload);

    // chave estrutural
    expect(json).not.toContain("kyc");
    expect(json.toLowerCase()).not.toContain("temassensiveis");
    expect(json.toLowerCase()).not.toContain("resumoia");
    // fragmentos de PII fictícia do dossiê do Ricardo
    for (const leak of ["Beatriz", "Lucas", "golfe", "XP", "Allianz", "São Paulo FC", "RSUs"]) {
      expect(json).not.toContain(leak);
    }
    // o payload tampouco carrega o nome do cliente
    expect(json).not.toContain("Ricardo");
    expect(json).not.toContain("Barros");
  });

  it("varre TODAS as personas seed: zero vazamento de tema sensível", () => {
    for (const plan of SEED_PLANS) {
      const json = JSON.stringify(buildPlanoIdealPayload(plan, assumptionsOf(plan)));
      expect(json).not.toContain("kyc");
      // o primeiro tema sensível de cada persona não pode aparecer no payload
      const tema = plan.clientProfile.kyc?.relacionamento.temasSensiveis[0];
      if (tema) expect(json).not.toContain(tema.slice(0, 18));
      // saldo consolidado do banco (KYC) não é um campo do payload
      const saldo = plan.clientProfile.kyc?.ativosFinanceiros.saldoConsolidadoBanco;
      if (saldo) expect(json).not.toContain(`"saldoConsolidadoBanco"`);
    }
  });
});
