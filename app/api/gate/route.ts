/**
 * v6 — POST /api/gate: valida a senha do gate de demonstração.
 * Senha correta → cookie httpOnly com token não-reversível, 24h.
 * A senha NUNCA aparece em código de cliente nem no repositório (só env).
 */
import { NextResponse } from "next/server";

import { GATE_COOKIE, gateToken } from "@/lib/gate-token";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const password = process.env.GATE_PASSWORD;
  if (!password) {
    return NextResponse.json({ error: "gate-not-configured" }, { status: 503 });
  }

  let body: { password?: unknown };
  try {
    body = (await req.json()) as { password?: unknown };
  } catch {
    return NextResponse.json({ error: "invalid-json" }, { status: 400 });
  }

  if (typeof body.password !== "string" || body.password !== password) {
    return NextResponse.json({ error: "wrong-password" }, { status: 401 });
  }

  // `Secure` pelo protocolo REAL da requisição: ligado na Vercel (https),
  // desligado em http://localhost — senão o cookie é rejeitado no teste local
  // do build de produção.
  const secure =
    req.headers.get("x-forwarded-proto") === "https" || new URL(req.url).protocol === "https:";

  const res = NextResponse.json({ ok: true });
  res.cookies.set(GATE_COOKIE, await gateToken(password), {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: 60 * 60 * 24, // 24h (ponto a confirmar nº 2 do spec)
  });
  return res;
}
