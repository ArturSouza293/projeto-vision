import { ZodError } from "zod";

import { isDbConfigured } from "@/lib/db/client";
import {
  deleteScenario,
  getScenario,
  listScenarios,
  saveScenario,
} from "@/lib/db/scenarios";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function fail(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

/** GET ?identifier=…            → list the user's personas (no payload)
 *  GET ?identifier=…&clientId=… → load one full plan */
export async function GET(req: Request) {
  if (!isDbConfigured) return fail("db-not-configured", 503);
  const params = new URL(req.url).searchParams;
  const identifier = params.get("identifier")?.trim();
  const clientId = params.get("clientId")?.trim();
  if (!identifier) return fail("identifier-required", 400);
  try {
    if (clientId) {
      const plan = await getScenario(identifier, clientId);
      return Response.json({ plan });
    }
    return Response.json({ items: await listScenarios(identifier) });
  } catch (e) {
    const message = e instanceof Error ? e.message : "error";
    return fail(message, message === "not-found" ? 404 : 500);
  }
}

/** POST { identifier, name, payload, isBase? } → upsert (save). */
export async function POST(req: Request) {
  if (!isDbConfigured) return fail("db-not-configured", 503);
  let body: { identifier?: unknown; name?: unknown; payload?: unknown; isBase?: unknown };
  try {
    body = await req.json();
  } catch {
    return fail("invalid-json", 400);
  }
  const identifier = typeof body.identifier === "string" ? body.identifier.trim() : "";
  if (!identifier) return fail("identifier-required", 400);
  try {
    const result = await saveScenario({
      identifier,
      name: typeof body.name === "string" ? body.name : "",
      payload: body.payload,
      isBase: Boolean(body.isBase),
    });
    return Response.json(result);
  } catch (e) {
    if (e instanceof ZodError) {
      const detail = e.issues.map((i) => `${i.path.join(".") || "payload"}: ${i.message}`).join("; ");
      return fail(`invalid-payload (${detail})`, 400);
    }
    return fail(e instanceof Error ? e.message : "error", 500);
  }
}

/** DELETE ?identifier=…&clientId=… → remove a persona. */
export async function DELETE(req: Request) {
  if (!isDbConfigured) return fail("db-not-configured", 503);
  const params = new URL(req.url).searchParams;
  const identifier = params.get("identifier")?.trim();
  const clientId = params.get("clientId")?.trim();
  if (!identifier || !clientId) return fail("identifier-and-clientId-required", 400);
  try {
    await deleteScenario(identifier, clientId);
    return Response.json({ ok: true });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "error", 500);
  }
}
