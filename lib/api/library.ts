/**
 * Client-side persona library. The browser NEVER touches the database — every
 * call goes through the server Route Handlers in `app/api/scenarios`, which own
 * all DB I/O. Errors carry the server's real message so the UI can show the
 * actual cause instead of a generic "could not save".
 */
import type { Plan, SavedPersona } from "@/lib/types";

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api/scenarios${path}`, init);
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) throw new Error(typeof body.error === "string" ? body.error : `http-${res.status}`);
  return body as T;
}

function personaName(plan: Plan): string {
  const p = plan.clientProfile;
  return (
    (p.partnerName ? `${p.firstName} & ${p.partnerName}` : `${p.firstName} ${p.lastName ?? ""}`).trim() ||
    "Sem nome"
  );
}

export const personaLibrary = {
  /** The advisor's own saved personas (scoped to their identifier). */
  async list(identifier: string): Promise<SavedPersona[]> {
    if (!identifier.trim()) return [];
    const { items } = await api<{ items: SavedPersona[] }>(
      `?identifier=${encodeURIComponent(identifier)}`,
    );
    return items ?? [];
  },

  /** Load a full plan by the advisor + persona handle. */
  async load(identifier: string, clientId: string): Promise<Plan> {
    const { plan } = await api<{ plan: Plan }>(
      `?identifier=${encodeURIComponent(identifier)}&clientId=${encodeURIComponent(clientId)}`,
    );
    return plan;
  },

  /** Upsert the plan under the advisor's identifier. */
  async save(plan: Plan, identifier: string): Promise<void> {
    await api("", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier, name: personaName(plan), payload: plan, isBase: false }),
    });
  },

  async remove(identifier: string, clientId: string): Promise<void> {
    await api(`?identifier=${encodeURIComponent(identifier)}&clientId=${encodeURIComponent(clientId)}`, {
      method: "DELETE",
    });
  },
};
