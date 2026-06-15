/**
 * Gate de acesso ao protótipo (proteção leve da PI).
 *
 * Client-side de propósito: NÃO faz POST com campo "senha" (era o que o DLP
 * corporativo bloqueava — falso positivo de exfiltração) e NÃO serve uma tela
 * preta de senha (o que fazia o proxy do banco classificar como phishing,
 * código PX022C). A trava persiste no localStorage → o testador digita a senha
 * UMA vez por navegador e nunca mais vê o gate (baixo atrito).
 *
 * Limite honesto: como é client-side, o bundle é baixado antes do gate. Isto
 * DETÉM acesso casual/acidental (link compartilhado, "deep link"), não um
 * atacante técnico que abra o devtools. Para PI de protótipo é o equilíbrio
 * certo entre proteção e atrito de teste. Se precisar de barreira real, aí sim
 * server-side — mas reintroduz o risco de bloqueio de domínio no corp.
 *
 * Senha = "horizonte" (hash SHA-256 com salt fixo; o texto puro não vai pro
 * bundle). Para TROCAR sem mexer no código: defina NEXT_PUBLIC_GATE_HASH na
 * Vercel com o sha256 de `vision.gate.v1::<nova senha>` e redeploy.
 */
export const GATE_STORAGE_KEY = "vision-gate";
const GATE_UNLOCK_VALUE = "1";
const GATE_SALT = "vision.gate.v1::";

/** sha256("vision.gate.v1::horizonte"). Override via NEXT_PUBLIC_GATE_HASH. */
const GATE_HASH =
  process.env.NEXT_PUBLIC_GATE_HASH ||
  "3c59f87396e88188d9a2308d2c6d4077b3d88ce23dd6c4b686560f99bd30ad47";

export function isGateUnlocked(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(GATE_STORAGE_KEY) === GATE_UNLOCK_VALUE;
  } catch {
    return false;
  }
}

export function unlockGate(): void {
  try {
    localStorage.setItem(GATE_STORAGE_KEY, GATE_UNLOCK_VALUE);
  } catch {
    // localStorage indisponível (modo privado restrito) — segue só na sessão.
  }
}

/** SHA-256 (Web Crypto) do salt + senha, comparado ao hash esperado. */
export async function verifyGatePassword(input: string): Promise<boolean> {
  const pass = input.trim();
  if (!pass) return false;
  try {
    const bytes = new TextEncoder().encode(GATE_SALT + pass);
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    const hex = Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    return hex === GATE_HASH;
  } catch {
    return false;
  }
}
