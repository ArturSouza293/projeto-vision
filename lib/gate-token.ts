/**
 * v6 — token do gate de demonstração (Parte B).
 *
 * O cookie carrega um valor NÃO-reversível: SHA-256(senha + salt fixo de
 * versão), nunca a senha. Web Crypto puro — funciona no runtime edge (proxy)
 * e no nodejs (route handler). A senha vive SÓ em process.env.GATE_PASSWORD.
 *
 * Honestidade técnica: gate de demonstração (barra acesso casual ao link),
 * não autenticação de produção — o Vision real usará autenticação corporativa.
 */
export const GATE_COOKIE = "vision-gate";

const SALT = "projeto-vision-gate-v1";

export async function gateToken(password: string): Promise<string> {
  const data = new TextEncoder().encode(`${password}::${SALT}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
