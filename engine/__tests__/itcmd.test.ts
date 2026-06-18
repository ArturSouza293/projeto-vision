import { describe, expect, it } from "vitest";

import { ITCMD_ILUSTRATIVO, aliquotaITCMD, itcmdEstimado } from "../itcmd";

describe("C5 — ITCMD (ilustrativo, por UF)", () => {
  it("alíquota por UF (case-insensitive) + padrão p/ desconhecida", () => {
    expect(aliquotaITCMD("SP")).toBe(0.04);
    expect(aliquotaITCMD("sp")).toBe(0.04);
    expect(aliquotaITCMD("SC")).toBe(0.07);
    expect(aliquotaITCMD("ZZ")).toBe(ITCMD_ILUSTRATIVO.padrao);
    expect(aliquotaITCMD(undefined)).toBe(ITCMD_ILUSTRATIVO.padrao);
  });

  it("ITCMD estimado = base × alíquota (≥ 0)", () => {
    expect(itcmdEstimado(1_000_000, "SP")).toBe(40_000);
    expect(itcmdEstimado(1_000_000, "SC")).toBe(70_000);
    expect(itcmdEstimado(-50, "SP")).toBe(0);
  });

  it("aceita params customizados (parametrizável)", () => {
    const custom = { ...ITCMD_ILUSTRATIVO, aliquotaPorUF: { SP: 0.06 } };
    expect(aliquotaITCMD("SP", custom)).toBe(0.06);
    expect(aliquotaITCMD("RJ", custom)).toBe(custom.padrao);
  });
});
