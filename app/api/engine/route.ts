import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Proxy SERVER-SIDE para o motor Python (vision_engine/api.py, hospedado à
 * parte). O navegador fala só com o app (Vercel) — nunca com o host do motor,
 * então a URL/chave do motor ficam server-side e o corp não vê domínio novo.
 *
 * Degrada com elegância: sem `ENGINE_API_URL`, devolve `not-configured` (a UI
 * mostra um aviso discreto em vez de quebrar). O motor é a única fonte de
 * número (Regra Zero) — aqui é só transporte; nada é recalculado.
 *
 * Env (no Vercel): ENGINE_API_URL (ex.: https://vision-engine.up.railway.app),
 * ENGINE_API_KEY (opcional, casa com a do servidor do motor).
 */
export async function POST(req: Request) {
  const raw = process.env.ENGINE_API_URL;
  if (!raw) {
    return NextResponse.json({ error: "not-configured" }, { headers: { "x-engine": "off" } });
  }
  // Tolera URL colada sem esquema (ex.: "host.up.railway.app" sem https://): o
  // fetch do Node exige URL absoluta, então prefixamos https:// quando faltar.
  const base = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;

  let body: { tool?: unknown; payload?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid-json" }, { status: 400 });
  }
  const tool = typeof body.tool === "string" ? body.tool : "";
  if (!tool) return NextResponse.json({ error: "no-tool" }, { status: 400 });

  const key = process.env.ENGINE_API_KEY;
  try {
    const res = await fetch(`${base.replace(/\/+$/, "")}/call/${encodeURIComponent(tool)}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(key ? { "x-engine-key": key } : {}),
      },
      body: JSON.stringify({ payload: body.payload ?? {} }),
      cache: "no-store",
    });
    const data: unknown = await res.json().catch(() => null);
    if (!res.ok) {
      // erro ESTRUTURADO do motor (422 → {detail:{erro,detalhe}}) — surface it.
      const detail = (data as { detail?: unknown } | null)?.detail ?? data;
      return NextResponse.json({ error: "engine-error", detail });
    }
    return NextResponse.json(data); // { ok: true, envelope: {...} }
  } catch (e) {
    return NextResponse.json({
      error: "unreachable",
      message: e instanceof Error ? e.message : "error",
    });
  }
}
