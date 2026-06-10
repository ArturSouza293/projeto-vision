/**
 * Parity gate (Fase B): displayed numbers must match the pre-integration
 * golden capture within ±R$ 1,00 or ±0,1% (whichever is larger).
 *
 * First run (no golden/values.json): CAPTURES the golden values and passes.
 * Subsequent runs: COMPARES and fails listing every violation (path, old,
 * new, delta). Legitimate monthly-compounding deltas go to PARITY_NOTES.md.
 *
 * Re-capture: npm run golden:capture (deletes the file and re-runs).
 */
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { computeAll } from "./compute";

const GOLDEN_FILE = path.join(__dirname, "values.json");
const ACCEPTED_FILE = path.join(__dirname, "accepted-deltas.json");

interface Violation {
  path: string;
  golden: unknown;
  atual: unknown;
  delta?: number;
}

/**
 * Documented legitimate deltas (PARITY_NOTES.md), e.g. annual→monthly
 * compounding. Each entry pins the NEW expected value, so the path stays
 * guarded against future regressions:
 *   [{ "path": "$.simples.kpis.wealthAtRetirement", "novo": 1280000, "causa": "capitalização mensal" }]
 */
function loadAccepted(): Map<string, { novo: unknown; causa: string }> {
  if (!fs.existsSync(ACCEPTED_FILE)) return new Map();
  const list = JSON.parse(fs.readFileSync(ACCEPTED_FILE, "utf8")) as {
    path: string;
    novo: unknown;
    causa: string;
  }[];
  return new Map(list.map((e) => [e.path, e]));
}

function withinTolerance(golden: number, atual: number): boolean {
  const tol = Math.max(1, Math.abs(golden) * 0.001); // ±R$1 ou ±0,1%, o maior
  return Math.abs(atual - golden) <= tol;
}

function diff(golden: unknown, atual: unknown, p: string, out: Violation[]): void {
  if (typeof golden === "number" && typeof atual === "number") {
    if (!withinTolerance(golden, atual)) out.push({ path: p, golden, atual, delta: atual - golden });
    return;
  }
  if (golden === null || atual === null || typeof golden !== "object" || typeof atual !== "object") {
    if (JSON.stringify(golden) !== JSON.stringify(atual)) out.push({ path: p, golden, atual });
    return;
  }
  const keys = new Set([...Object.keys(golden as object), ...Object.keys(atual as object)]);
  for (const k of keys) {
    diff((golden as Record<string, unknown>)[k], (atual as Record<string, unknown>)[k], `${p}.${k}`, out);
  }
}

describe("golden parity (3 cases de referência)", () => {
  it("números exibidos batem com o golden (±R$1 / ±0,1%)", () => {
    const atual = computeAll();

    if (!fs.existsSync(GOLDEN_FILE)) {
      fs.writeFileSync(GOLDEN_FILE, JSON.stringify(atual, null, 2));
      // eslint-disable-next-line no-console
      console.log(`golden: capturado → ${GOLDEN_FILE}`);
      return;
    }

    const golden = JSON.parse(fs.readFileSync(GOLDEN_FILE, "utf8"));
    const accepted = loadAccepted();
    const raw: Violation[] = [];
    diff(golden, atual, "$", raw);

    // A violation is OK only when documented AND still matching its pinned
    // new value — accepted deltas don't become a blank cheque.
    const violations = raw.filter((v) => {
      const acc = accepted.get(v.path);
      if (!acc) return true;
      if (typeof acc.novo === "number" && typeof v.atual === "number") {
        return !withinTolerance(acc.novo, v.atual);
      }
      return JSON.stringify(acc.novo) !== JSON.stringify(v.atual);
    });

    if (violations.length) {
      const lines = violations
        .slice(0, 40)
        .map((v) => `  ${v.path}: golden=${JSON.stringify(v.golden)} atual=${JSON.stringify(v.atual)}${v.delta !== undefined ? ` (Δ ${v.delta.toFixed(2)})` : ""}`)
        .join("\n");
      expect.fail(`${violations.length} divergência(s) acima da tolerância:\n${lines}\n→ deltas legítimos (capitalização mensal) devem ir para PARITY_NOTES.md; o resto é regressão.`);
    }
  });
});
