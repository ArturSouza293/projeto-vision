/**
 * v6 — gate de senha (tela preta) na frente de TODO o protótipo (Parte B).
 *
 * Next 16: a convenção `middleware.ts` foi renomeada para `proxy.ts`.
 * Sem o cookie válido: páginas → rewrite para /gate (nenhum conteúdo do
 * protótipo no HTML servido); APIs → 401. Exceções: /gate, /api/gate e
 * assets estáticos. Com GATE_PASSWORD ausente no ambiente o gate fica
 * DESARMADO (fail-open documentado — um env faltando não pode trancar a
 * demonstração inteira).
 *
 * Link mágico (`/?k=<senha>`): redes corporativas com DLP bloqueiam o POST
 * JSON com campo "password" (assinatura de exfiltração de credencial) — o
 * formulário falhava como "senha incorreta" só no corp. Uma navegação GET
 * com a chave na query passa pelos filtros; o proxy valida, seta o MESMO
 * cookie e redireciona limpando a chave da URL (não fica no histórico nem
 * em logs do app — note: proxies corporativos ainda podem logar a URL de
 * entrada; tradeoff aceito para gate de demonstração interna).
 */
import { NextResponse, type NextRequest } from "next/server";

import { GATE_COOKIE, gateToken } from "@/lib/gate-token";

export async function proxy(req: NextRequest) {
  const password = process.env.GATE_PASSWORD;
  if (!password) return NextResponse.next(); // gate desarmado sem env (doc no README)

  // Link mágico: valida, seta cookie e SEMPRE tira a chave da URL.
  const k = req.nextUrl.searchParams.get("k");
  if (k !== null) {
    const clean = req.nextUrl.clone();
    clean.searchParams.delete("k");
    const res = NextResponse.redirect(clean);
    if (k === password) {
      const secure =
        req.headers.get("x-forwarded-proto") === "https" || req.nextUrl.protocol === "https:";
      res.cookies.set(GATE_COOKIE, await gateToken(password), {
        httpOnly: true,
        sameSite: "lax",
        secure,
        path: "/",
        maxAge: 60 * 60 * 24, // 24h — mesmos atributos do POST /api/gate
      });
    }
    return res; // chave errada → volta sem cookie e cai no gate normal
  }

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
