/**
 * Vision Engine — validador da Regra Zero.
 *
 * The LLM (BIA) may ONLY propose structure: goal priority order, candidate
 * target years, the reserve multiplier (6|12), the retirement method and
 * the known boolean flag(s). ANYTHING else — unknown keys, monetary values,
 * percentages, numbers smuggled inside strings — is rejected.
 *
 * Hardening:
 *  - The raw payload is JSON-roundtripped first: accessor properties (getters)
 *    are evaluated exactly ONCE, killing TOCTOU tricks, and non-data values
 *    (functions, undefined) disappear.
 *  - Every field is read into a local once and validated from that local.
 *  - `datasAlvo` is rebuilt on a null-prototype object so consumers can't be
 *    poisoned by inherited properties.
 */
import { DEFAULT_ASSUMPTIONS } from "./assumptions";
import type { BiaFlag, BiaProposal, MetodoAposentadoria, PlanningCase } from "./types";

const ALLOWED_KEYS = new Set([
  "ordemPrioridade",
  "datasAlvo",
  "multiplicadorReserva",
  "metodoAposentadoria",
  "flags",
]);

/** Only flags the engine actually honors (Regra Zero: nothing decorative). */
const ALLOWED_FLAGS: BiaFlag[] = ["considerarINSS"];
const METODOS: MetodoAposentadoria[] = ["depletion", "preservation", "perpetuity"];

export type ValidationResult =
  | { ok: true; proposal: BiaProposal }
  | { ok: false; errors: string[] };

export function validateBiaProposal(raw: unknown, c: PlanningCase): ValidationResult {
  const errors: string[] = [];

  // Neutralize getters/cycles/functions: a single JSON round-trip yields
  // plain data, with every accessor evaluated exactly once.
  let data: unknown;
  try {
    data = raw === undefined ? undefined : JSON.parse(JSON.stringify(raw));
  } catch {
    return { ok: false, errors: ["payload não serializável"] };
  }
  if (data === null || data === undefined || typeof data !== "object" || Array.isArray(data)) {
    return { ok: false, errors: ["payload não é um objeto"] };
  }
  const obj = data as Record<string, unknown>;

  // Whitelist: unknown keys are rejected outright (no monetary/percent fields).
  for (const key of Object.keys(obj)) {
    if (!ALLOWED_KEYS.has(key)) errors.push(`campo não permitido: "${key}"`);
  }

  const goalIds = new Set(c.goals.map((g) => g.id));
  const proposal: BiaProposal = {};

  /* ordemPrioridade: strings that must EXACTLY match a goal id of the case. */
  const rawOrdem = obj.ordemPrioridade;
  if (rawOrdem !== undefined) {
    if (!Array.isArray(rawOrdem)) {
      errors.push("ordemPrioridade deve ser uma lista de ids de objetivos");
    } else {
      const ordem: string[] = [];
      for (const item of rawOrdem) {
        if (typeof item !== "string" || !goalIds.has(item)) {
          // Exact-membership check also blocks numbers smuggled in strings.
          errors.push(`ordemPrioridade contém id desconhecido: ${JSON.stringify(item)}`);
        } else {
          ordem.push(item);
        }
      }
      proposal.ordemPrioridade = ordem;
    }
  }

  /* datasAlvo: goal-id → integer YEAR strictly AFTER the base year. */
  const rawDatas = obj.datasAlvo;
  if (rawDatas !== undefined) {
    if (rawDatas === null || typeof rawDatas !== "object" || Array.isArray(rawDatas)) {
      errors.push("datasAlvo deve ser um objeto { goalId: ano }");
    } else {
      const anoBase = c.assumptions?.anoBase ?? DEFAULT_ASSUMPTIONS.anoBase;
      const datas: Record<string, number> = Object.create(null);
      for (const [key, value] of Object.entries(rawDatas as Record<string, unknown>)) {
        if (!goalIds.has(key)) {
          errors.push(`datasAlvo refere objetivo desconhecido: "${key}"`);
          continue;
        }
        if (typeof value !== "number" || !Number.isInteger(value)) {
          errors.push(`datasAlvo["${key}"] deve ser um ano inteiro`);
          continue;
        }
        // anoBase itself is rejected: n = 0 meses transformaria o PMT mensal
        // em aporte único — janela sã é [anoBase+1, anoBase+80].
        if (value < anoBase + 1 || value > anoBase + 80) {
          errors.push(`datasAlvo["${key}"] fora da janela [${anoBase + 1}, ${anoBase + 80}]`);
          continue;
        }
        datas[key] = value;
      }
      proposal.datasAlvo = datas;
    }
  }

  /* multiplicadorReserva: 6 | 12 only (single read). */
  const rawMult = obj.multiplicadorReserva;
  if (rawMult !== undefined) {
    if (rawMult === 6 || rawMult === 12) {
      proposal.multiplicadorReserva = rawMult;
    } else {
      errors.push("multiplicadorReserva deve ser 6 ou 12");
    }
  }

  /* metodoAposentadoria: enum (single read). */
  const rawMetodo = obj.metodoAposentadoria;
  if (rawMetodo !== undefined) {
    if (typeof rawMetodo === "string" && (METODOS as string[]).includes(rawMetodo)) {
      proposal.metodoAposentadoria = rawMetodo as MetodoAposentadoria;
    } else {
      errors.push(`metodoAposentadoria deve ser um de: ${METODOS.join(", ")}`);
    }
  }

  /* flags: known keys, strictly boolean values. */
  const rawFlags = obj.flags;
  if (rawFlags !== undefined) {
    if (rawFlags === null || typeof rawFlags !== "object" || Array.isArray(rawFlags)) {
      errors.push("flags deve ser um objeto de booleanos");
    } else {
      const flags: Partial<Record<BiaFlag, boolean>> = {};
      for (const [key, value] of Object.entries(rawFlags as Record<string, unknown>)) {
        if (!(ALLOWED_FLAGS as string[]).includes(key)) {
          errors.push(`flag não permitida: "${key}"`);
          continue;
        }
        if (typeof value !== "boolean") {
          errors.push(`flags["${key}"] deve ser booleano`);
          continue;
        }
        flags[key as BiaFlag] = value;
      }
      proposal.flags = flags;
    }
  }

  // Defense in depth: NO string anywhere in the accepted proposal may carry
  // digits unless it is an exact goal id (already membership-checked above).
  scanForSmuggledNumbers(proposal, goalIds, errors);

  return errors.length ? { ok: false, errors } : { ok: true, proposal };
}

function scanForSmuggledNumbers(value: unknown, goalIds: Set<string>, errors: string[], path = "$"): void {
  if (typeof value === "string") {
    if (/\d/.test(value) && !goalIds.has(value)) {
      errors.push(`número embutido em string em ${path}: ${JSON.stringify(value)}`);
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((v, i) => scanForSmuggledNumbers(v, goalIds, errors, `${path}[${i}]`));
    return;
  }
  if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) scanForSmuggledNumbers(v, goalIds, errors, `${path}.${k}`);
  }
}
