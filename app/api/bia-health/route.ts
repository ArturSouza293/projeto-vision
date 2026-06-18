import Anthropic from "@anthropic-ai/sdk";

import { MACRO_FACTS } from "@/lib/macro-facts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Mesmo modelo da BIA (plano-ideal). "claude-fable-5" é só alias LOCAL do Claude
// Code — a API não aceita; nunca enviar essa string.
const MODEL = process.env.PLANO_IDEAL_MODEL || "claude-opus-4-8";

/**
 * D1 — Health check da BIA. Verifica (a) CONECTIVIDADE (chave + API respondendo)
 * e (b) se a BIA tem ACESSO A DADOS AO VIVO — teste objetivo: pede a Selic e
 * compara com a premissa de `macro-facts` (fonte+data). Um LLM sem ferramenta de
 * dados responde de memória → valor desatualizado. CONCLUSÃO DE DESIGN (Regra
 * Zero): número macro NUNCA vem da BIA; vem de `assumptions`/`macro-facts`.
 */
export async function GET() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const selicPremissaPct = Math.round((MACRO_FACTS.selic.value ?? 0) * 1000) / 10; // 14.5
  const fontePremissa = `${MACRO_FACTS.selic.fonte} (${MACRO_FACTS.selic.data})`;

  if (!apiKey) {
    return Response.json({
      conectado: false,
      motivo: "no-key",
      modelo: MODEL,
      selicPremissaPct,
      fontePremissa,
      nota: "Sem ANTHROPIC_API_KEY no ambiente — BIA em modo offline (fallback determinístico).",
    });
  }

  const client = new Anthropic({ apiKey });
  try {
    const msg = await client.messages.create({
      model: MODEL,
      max_tokens: 16,
      system:
        "Responda APENAS com o número da taxa Selic meta atual do Brasil em % ao ano (ex.: 13.75). Sem texto, sem %, sem unidades.",
      messages: [{ role: "user", content: "Qual é a taxa Selic meta atual?" }],
    });
    const text = msg.content
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("")
      .trim();
    const num = parseFloat(text.replace("%", "").replace(",", "."));
    const selicBiaPct = Number.isFinite(num) ? num : null;
    // "dado ao vivo" se a BIA bate (±0,5 p.p.) com a premissa sourced.
    const temDadosAoVivo =
      selicBiaPct != null && Math.abs(selicBiaPct - selicPremissaPct) <= 0.5;

    return Response.json({
      conectado: true,
      modelo: MODEL,
      temDadosAoVivo,
      selicBiaPct,
      selicPremissaPct,
      fontePremissa,
      nota: temDadosAoVivo
        ? "BIA conectada e coerente com a premissa."
        : "BIA conectada, mas respondeu de MEMÓRIA (sem dado ao vivo). Números macro vêm de assumptions/macro-facts, NUNCA da BIA (Regra Zero).",
    });
  } catch (e) {
    return Response.json({
      conectado: false,
      motivo: e instanceof Error ? e.message : "error",
      modelo: MODEL,
      selicPremissaPct,
      fontePremissa,
      nota: "Falha ao conectar — BIA em modo offline (fallback determinístico).",
    });
  }
}
