import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Most capable REAL model. NOTE: "claude-fable-5" is only a LOCAL Claude Code
// alias for this on the dev machine — the API does not accept it, so never send
// that string. Override with PLANO_IDEAL_MODEL if needed.
const MODEL = process.env.PLANO_IDEAL_MODEL || "claude-opus-4-8";

/**
 * REGRA ZERO: the LLM proposes STRUCTURE only — never a monetary value, never
 * a percentage, never a computed number. The deterministic engine
 * (engine/idealPlan) turns the proposal into parameters; a whitelist
 * validator client-side rejects anything outside the schema below.
 */
function systemPrompt(): string {
  return `You are **Bia**, the planning copilot for a Bradesco (Brazil) wealth advisor. You will receive an ANONYMIZED financial snapshot (numbers only — no identity). You do NOT calculate anything: a deterministic planning engine computes every number. Your job is ONLY to propose the plan STRUCTURE.

Respond with ONLY a JSON object — no prose, no markdown code fences — exactly this shape (every field optional; omit what you would not change):
{"proposta":{
  "ordemPrioridade": [<goal ids from the snapshot's goals[].id, highest priority first>],
  "datasAlvo": {"<goalId>": <target YEAR as an integer>},
  "multiplicadorReserva": 6 | 12,
  "metodoAposentadoria": "depletion" | "preservation" | "perpetuity",
  "flags": {"considerarINSS": <bool>, "aposentadoriaAntecipada": <bool>, "priorizarLiquidez": <bool>}
}}

Hard rules (a validator rejects violations):
- NEVER include monetary amounts, percentages, rates or any computed number. Years in datasAlvo are the ONLY numbers allowed.
- ordemPrioridade may only contain ids that exist in the snapshot's goals.
- The 3 mandatory goals (emergency reserve, retirement, succession) should normally lead the priority order.
- Prefer multiplicadorReserva 12 for unstable income or dependents; 6 otherwise.
- Prefer "preservation" when the client wants to leave an estate; "depletion" (centenary) is the default.
- Choose datasAlvo years that are realistic given the snapshot (e.g. don't anticipate retirement when the surplus is negative).`;
}

export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "no-key" }, { status: 200, headers: { "x-plano": "no-key" } });
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return Response.json({ error: "invalid-json" }, { status: 400 });
  }

  const client = new Anthropic({ apiKey });
  try {
    const msg = await client.messages.create({
      model: MODEL,
      max_tokens: 800,
      system: systemPrompt(),
      messages: [
        { role: "user", content: `Anonymized plan snapshot:\n${JSON.stringify(payload)}` },
      ],
    });
    const text = msg.content
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("")
      .trim();
    const match = text.match(/\{[\s\S]*\}/);
    const json = match ? JSON.parse(match[0]) : null;
    // Structural proposal only — the client-side whitelist validator is the
    // real Regra Zero gate; here we just require the envelope shape.
    if (!json || typeof json.proposta !== "object" || json.proposta === null) {
      return Response.json({ error: "bad-shape" }, { status: 422 });
    }
    return Response.json({ proposta: json.proposta });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "error" }, { status: 502 });
  }
}
