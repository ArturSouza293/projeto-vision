import { describe, expect, it } from "vitest";

import { capitalNecessario, rendaSustentavel } from "@/lib/usufruto";

describe("C8 — usufruto bidirecional (lib)", () => {
  it("perpétuo: capital = renda/iM e round-trip identidade", () => {
    const cap = capitalNecessario(10000, 0.045, 40, true);
    expect(cap).toBeGreaterThan(0);
    expect(rendaSustentavel(cap, 0.045, 40, true)).toBeCloseTo(10000, 4);
  });

  it("finito: round-trip renda→capital→renda ≈ identidade", () => {
    const cap = capitalNecessario(10000, 0.045, 30, false);
    expect(rendaSustentavel(cap, 0.045, 30, false)).toBeCloseTo(10000, 4);
  });

  it("horizonte maior (pós-morte) exige mais capital", () => {
    const base = capitalNecessario(10000, 0.045, 30, false);
    const longo = capitalNecessario(10000, 0.045, 50, false);
    expect(longo).toBeGreaterThan(base);
  });

  it("guardas: renda/capital ≤ 0 → 0", () => {
    expect(capitalNecessario(0, 0.045, 30, false)).toBe(0);
    expect(rendaSustentavel(0, 0.045, 30, false)).toBe(0);
  });
});
