/**
 * v8 — derivações do KYC. Âncora do spec: share of wallet do Ricardo ≈ 23%
 * (saldo R$ 280k ÷ patrimônio financeiro R$ 1,2M). Também: seeds sem KYC e
 * a leitura comercial de "oportunidade de captura".
 */
import { describe, expect, it } from "vitest";

import { shareOfWallet, shareOfWalletInsight } from "@/lib/kyc";
import { SEED_PLANS } from "@/lib/mock/clients";
import { blankPlan } from "@/lib/plan";

const seed = (id: string) => {
  const p = SEED_PLANS.find((s) => s.clientId === id);
  if (!p) throw new Error(`seed ${id} não encontrado`);
  return p;
};

describe("share of wallet", () => {
  it("Ricardo ≈ 23% (R$ 280k de R$ 1,2M)", () => {
    const share = shareOfWallet(seed("ricardo"));
    expect(share).not.toBeNull();
    expect(share!).toBeGreaterThan(0.21);
    expect(share!).toBeLessThan(0.25);
  });

  it("leitura comercial: share baixo + patrimônio relevante = oportunidade de captura", () => {
    const insight = shareOfWalletInsight(seed("ricardo"));
    expect(insight).not.toBeNull();
    expect(insight!.pct).toBe(23);
    expect(insight!.captureOpportunity).toBe(true);
  });

  it("caso criado do zero não tem KYC → share nulo", () => {
    expect(shareOfWallet(blankPlan("novo"))).toBeNull();
    expect(shareOfWalletInsight(blankPlan("novo"))).toBeNull();
  });
});

describe("KYC nos seeds", () => {
  it("todas as 14 personas seed têm dossiê KYC", () => {
    const semKyc = SEED_PLANS.filter((p) => !p.clientProfile.kyc).map((p) => p.clientId);
    expect(semKyc).toEqual([]);
    expect(SEED_PLANS).toHaveLength(14);
  });

  it("cada KYC traz as 9 categorias e ao menos um tema sensível", () => {
    for (const p of SEED_PLANS) {
      const k = p.clientProfile.kyc!;
      expect(k.perfilPessoal).toBeTruthy();
      expect(k.perfilFamiliar).toBeTruthy();
      expect(k.relacionamento.temasSensiveis.length).toBeGreaterThan(0);
      expect(k.ativosFinanceiros.saldoConsolidadoBanco).toBeGreaterThanOrEqual(0);
      expect(k.ativosNaoFinanceiros).toBeTruthy();
      expect(k.fluxoCaixa.despesasFixas.length).toBeGreaterThan(0);
      expect(k.posicaoInternacional).toBeTruthy();
      expect(k.planejamentos.momentoDeVida).toBeTruthy();
      expect(k.protecao).toBeTruthy();
    }
  });
});
