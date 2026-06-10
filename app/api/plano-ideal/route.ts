import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Most capable REAL model. NOTE: "claude-fable-5" is only a LOCAL Claude Code
// alias for this on the dev machine — the API does not accept it, so never send
// that string. Override with PLANO_IDEAL_MODEL if needed.
const MODEL = process.env.PLANO_IDEAL_MODEL || "claude-opus-4-8";

function systemPrompt(): string {
  return `You are **Bia**, the planning copilot for a Bradesco (Brazil) wealth advisor. Given an ANONYMIZED financial snapshot (numbers only — no identity), set the four plan parameters that best fund the client's goals, then explain why.

Hard rules (never violate):
- monthlyContribution must NEVER exceed the monthly surplus (bounds.contribMax). Never propose more than the client can save.
- Always cover the 3 mandatory goals — emergency reserve, retirement, succession. Default priority: reserve → retirement → succession → others.
- Emergency reserve target = premises.emergencyReserveMonths × cashFlow.essentialExpenses.
- Succession liquidity target ≈ premises.successionPctOfGross% of netWorth.totalAssets − netWorth.pension − netWorth.lifeInsurance.
- Retirement uses a centenary horizon (premises.longevityAge); target income coherent with cashFlow.retirementMonthlyNeed; INSS/rent continue when cashFlow.considersInss is true.
- expectedRealReturn is a REAL return (IPCA+x%), realistic for the horizon, within [0, bounds.returnMax]. No guarantees. retirementAge within [bounds.retMin, bounds.retMax]. inflation within [0, 12].
- If the goals are infeasible within the surplus, return the BEST feasible parameters and explain the shortfall in racional (never emit impossible values).

Respond with ONLY a JSON object — no prose, no markdown code fences — exactly:
{"parametros":{"monthlyContribution":<number BRL/month>,"retirementAge":<integer>,"expectedRealReturn":<number percent>,"inflation":<number percent>},"racional":"<3 to 6 sentences in Brazilian Portuguese, Bia's encouraging tone, why this is the ideal plan for THIS client; frame any gap as the next step>"}`;
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
      max_tokens: 1500,
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
    if (!json || typeof json.parametros !== "object") {
      return Response.json({ error: "bad-shape" }, { status: 422 });
    }
    return Response.json(json);
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "error" }, { status: 502 });
  }
}
