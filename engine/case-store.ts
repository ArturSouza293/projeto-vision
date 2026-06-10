/**
 * Vision Engine — CaseStore em memória (estilo Bloxx: um case por ID).
 * Defensive copies in/out so callers can't mutate stored state.
 */
import type { PlanningCase } from "./types";

let seq = 0;

export interface CaseStore {
  createCase(c: Omit<PlanningCase, "id">): PlanningCase;
  getCase(id: string): PlanningCase | undefined;
  updateCase(id: string, patch: Partial<PlanningCase>): PlanningCase;
  deleteCase(id: string): boolean;
  listCases(): string[];
}

export function createCaseStore(): CaseStore {
  const cases = new Map<string, PlanningCase>();
  return {
    createCase(c) {
      const id = `case-${++seq}`;
      const stored = structuredClone({ ...c, id });
      cases.set(id, stored);
      return structuredClone(stored);
    },
    getCase(id) {
      const c = cases.get(id);
      return c ? structuredClone(c) : undefined;
    },
    updateCase(id, patch) {
      const cur = cases.get(id);
      if (!cur) throw new Error(`CaseStore: case "${id}" não existe`);
      const next = structuredClone({ ...cur, ...patch, id });
      cases.set(id, next);
      return structuredClone(next);
    },
    deleteCase(id) {
      return cases.delete(id);
    },
    listCases() {
      return [...cases.keys()];
    },
  };
}

/** App-wide singleton store. */
export const caseStore = createCaseStore();
