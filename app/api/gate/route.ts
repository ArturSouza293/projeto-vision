/**
 * v6 — POST /api/gate: valida o acesso ao gate de demonstração.
 *
 * Aceita TRÊS formatos (todos chegam ao MESMO cookie httpOnly de 24h):
 *  1. JSON `{ h }`            — navegador (fetch): a senha é hasheada NO CLIENTE
 *     (SHA-256 = gateToken), então o corpo carrega só um token opaco — sem
 *     campo "password", sem texto puro. Redes corporativas com DLP bloqueiam
 *     POST com credencial em claro (parecia "senha incorreta" só no corp);
 *     o hash é indistinguível de um token de sessão e passa pelos filtros.
 *  2. urlencoded `h=<hash>`  — fallback de FORMULÁRIO NATIVO (sem fetch/XHR,
 *     que alguns proxies corporativos atrapalham). Responde com REDIRECT 303:
 *     sucesso → "/", falha → "/?e=1" (a tela do gate mostra o erro). Mantém o
 *     mesmo link, sem nada na URL.
 *  3. JSON `{ password }`    — scripts de QA/demo (rodam local, sem DLP).
 *
 * A senha em claro NUNCA aparece no código de cliente nem no repositório.
 */
import { NextResponse } from "next/server";

import { GATE_COOKIE, gateToken } from "@/lib/gate-token";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isSecure(req: Request): boolean {
  return req.headers.get("x-forwarded-proto") === "https" || new URL(req.url).protocol === "https:";
}

function setGateCookie(res: NextResponse, token: string, secure: boolean) {
  res.cookies.set(GATE_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: 60 * 60 * 24, // 24h
  });
}

export async function POST(req: Request) {
  const password = process.env.GATE_PASSWORD;
  if (!password) {
    return NextResponse.json({ error: "gate-not-configured" }, { status: 503 });
  }
  const expected = await gateToken(password);
  const secure = isSecure(req);
  const ctype = req.headers.get("content-type") ?? "";

  // ---- 2. Formulário nativo (urlencoded) → resposta por REDIRECT 303 -------
  if (ctype.includes("application/x-www-form-urlencoded")) {
    const form = await req.formData();
    const h = String(form.get("h") ?? "");
    const origin = new URL(req.url).origin;
    if (h && h === expected) {
      const res = NextResponse.redirect(`${origin}/`, { status: 303 });
      setGateCookie(res, expected, secure);
      return res;
    }
    return NextResponse.redirect(`${origin}/?e=1`, { status: 303 }); // mesmo link, erro sinalizado
  }

  // ---- 1 e 3. JSON ({ h } do navegador ou { password } dos scripts) -------
  let body: { h?: unknown; password?: unknown };
  try {
    body = (await req.json()) as { h?: unknown; password?: unknown };
  } catch {
    return NextResponse.json({ error: "invalid-json" }, { status: 400 });
  }

  const ok =
    (typeof body.h === "string" && body.h === expected) ||
    (typeof body.password === "string" && (await gateToken(body.password)) === expected);

  if (!ok) {
    return NextResponse.json({ error: "wrong-password" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  setGateCookie(res, expected, secure);
  return res;
}
