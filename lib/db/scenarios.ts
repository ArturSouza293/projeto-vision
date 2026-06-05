import "server-only";

import { z } from "zod";

import { sql } from "@/lib/db/client";
import type { Plan, SavedPersona, Segment } from "@/lib/types";

/**
 * Server-side data layer for scenario persistence (Neon). All DB I/O lives here;
 * route handlers call these and never touch SQL directly. The payload is the
 * full Plan, validated on the way in so we never store garbage.
 *
 * Swappable: to move back to Supabase (or anywhere), reimplement these five
 * functions against the new backend — the route handlers and app stay the same.
 */

/** Light validation of the saved Plan — enough to reject garbage + index it. */
const PlanSchema = z
  .object({
    clientId: z.string().min(1),
    clientProfile: z.object({ segment: z.string() }).passthrough(),
  })
  .passthrough();

function db() {
  if (!sql) throw new Error("db-not-configured");
  return sql;
}

/** Create the user if missing; return its UUID. */
export async function upsertUser(identifier: string): Promise<string> {
  const id = identifier.trim();
  if (!id) throw new Error("identifier-required");
  const rows = await db()`
    insert into users (identifier) values (${id})
    on conflict (identifier) do update set identifier = excluded.identifier
    returning id`;
  return String(rows[0].id);
}

export interface SaveScenarioInput {
  identifier: string;
  name: string;
  payload: unknown;
  isBase?: boolean;
}

/** Insert a new persona or update the existing one (idempotent per user+clientId). */
export async function saveScenario(
  input: SaveScenarioInput,
): Promise<{ clientId: string; updatedAt: string }> {
  const plan = PlanSchema.parse(input.payload);
  const userId = await upsertUser(input.identifier);
  const name = input.name?.trim() || "Sem nome";
  const isBase = Boolean(input.isBase);
  const rows = await db()`
    insert into scenarios (user_id, client_id, name, is_base, payload)
    values (${userId}, ${plan.clientId}, ${name}, ${isBase}, ${JSON.stringify(plan)}::jsonb)
    on conflict (user_id, client_id) do update
      set name = excluded.name,
          is_base = excluded.is_base,
          payload = excluded.payload,
          updated_at = now()
    returning client_id, updated_at`;
  return { clientId: String(rows[0].client_id), updatedAt: String(rows[0].updated_at) };
}

/** A user's saved personas — lightweight (no payload blob). */
export async function listScenarios(identifier: string): Promise<SavedPersona[]> {
  const id = identifier.trim();
  if (!id) return [];
  const rows = await db()`
    select s.client_id,
           s.name,
           u.identifier as author,
           s.payload->'clientProfile'->>'segment' as segment,
           s.updated_at
    from scenarios s
    join users u on u.id = s.user_id
    where u.identifier = ${id}
    order by s.updated_at desc`;
  return rows.map((r) => ({
    clientId: String(r.client_id),
    name: (r.name as string) || "—",
    author: (r.author as string | null) ?? null,
    segment: ((r.segment as Segment) || "retail") as Segment,
    updatedAt: String(r.updated_at),
  }));
}

/** Load a full Plan by user + persona handle. */
export async function getScenario(identifier: string, clientId: string): Promise<Plan> {
  const rows = await db()`
    select s.payload
    from scenarios s
    join users u on u.id = s.user_id
    where u.identifier = ${identifier.trim()} and s.client_id = ${clientId}
    limit 1`;
  if (rows.length === 0) throw new Error("not-found");
  return rows[0].payload as Plan;
}

export async function deleteScenario(identifier: string, clientId: string): Promise<void> {
  await db()`
    delete from scenarios s
    using users u
    where s.user_id = u.id
      and u.identifier = ${identifier.trim()}
      and s.client_id = ${clientId}`;
}
