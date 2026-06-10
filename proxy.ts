/**
 * v6 — gate de senha (tela preta) na frente de TODO o protótipo (Parte B).
 *
 * Next 16: a convenção `middleware.ts` foi renomeada para `proxy.ts`.
 * Sem o cookie válido: páginas → rewrite para /gate (nenhum conteúdo do
 * protótipo no HTML servido); APIs → 401. Exceções: /gate, /api/gate e
 * assets estáticos. Com GATE_PASSWORD ausente no ambiente o gate fica
 * DESARMADO (fail-open documentado — um env faltando não pode trancar a
 * demonstração inteira).
 */
import { NextResponse, type NextRequest } from "next/server";

import { GATE_COOKIE, gateToken } from "@/lib/gate-token";

export async function proxy(req: NextRequest) {
  const password = process.env.GATE_PASSWORD;
  if (!password) return NextResponse.next(); // gate desarmado sem env (doc no README)

  const token = req.cookies.get(GATE_COOKIE)?.value;
  if (token && token === (await gateToken(password))) return NextResponse.next();

  const { pathname } = req.nextUrl;
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "gate" }, { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = "/gate";
  return NextResponse.rewrite(url);
}

export const config = {
  // Tudo passa pelo gate, EXCETO: a própria tela/rota do gate, estáticos do
  // Next e assets públicos (imagens/fontes). /api/scenarios e /api/advisor
  // ficam ATRÁS do gate de propósito.
  matcher: [
    "/((?!gate|api/gate|_next/static|_next/image|favicon\\.ico|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|woff2?|ttf)$).*)",
  ],
};
