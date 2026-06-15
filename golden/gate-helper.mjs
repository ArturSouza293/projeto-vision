/**
 * Helper para a automação (Playwright) passar pelo gate de acesso (client-side).
 *
 * O gate v9 é uma trava client-side persistida no localStorage (lib/gate.ts).
 * Aqui gravamos a flag ANTES de qualquer script da página rodar (addInitScript),
 * como se o testador já tivesse digitado a senha — sem isso os scripts de demo
 * e de QA parariam na tela de senha. Espelha a chave GATE_STORAGE_KEY.
 *
 * (Versões antigas faziam POST /api/gate por cookie; o endpoint não existe mais.)
 */
const GATE_STORAGE_KEY = "vision-gate";
const GATE_UNLOCK_VALUE = "1";

/** Pré-libera o gate no contexto Playwright (chame antes de newPage/goto). */
export async function passGate(ctx) {
  await ctx.addInitScript(
    ({ k, v }) => {
      try {
        localStorage.setItem(k, v);
      } catch {}
    },
    { k: GATE_STORAGE_KEY, v: GATE_UNLOCK_VALUE },
  );
}

/** Senha do gate (legado — referência da cena de gate, hoje fora do storyboard). */
export function gatePassword() {
  return process.env.GATE_PASSWORD || "horizonte";
}
