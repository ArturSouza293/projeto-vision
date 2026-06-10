/**
 * v6 — helper para os scripts de QA passarem o gate de demonstração.
 * A senha NUNCA é hardcoded: vem de process.env.GATE_PASSWORD ou do
 * .env.local (gitignored). Sem senha disponível, assume gate desarmado.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

export function gatePassword() {
  if (process.env.GATE_PASSWORD) return process.env.GATE_PASSWORD;
  try {
    const txt = fs.readFileSync(path.join(ROOT, ".env.local"), "utf8");
    const m = txt.match(/^GATE_PASSWORD=(.*)$/m);
    return m?.[1]?.trim() || undefined;
  } catch {
    return undefined;
  }
}

/** Autentica o contexto Playwright no gate (cookie compartilhado). */
export async function passGate(ctx, base) {
  const password = gatePassword();
  if (!password) return; // gate desarmado
  await ctx.request.post(`${base}/api/gate`, { data: { password } });
}
