import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const MODEL = process.env.ADVISOR_MODEL || "claude-sonnet-4-6";

function systemPrompt(today: string, context?: string): string {
  return `You are **Bia**, the planning copilot inside Projeto Vision — an internal tool a Bradesco (Brazil) wealth advisor uses while building a client's financial plan. You are the advisor's advisor.

Today is ${today}.

Your role:
- Explain the plan's own numbers in plain language: why the success probability is what it is, what the "retirement income gap" means versus the present "free balance", how the emergency reserve and the succession liquidity target are built, what a contribution change does.
- Explain market and macro concepts clearly (Selic, CDI, IPCA, IPCA+ vs. prefixado, marcação a mercado, previdência PGBL/VGBL, FIIs, ITCMD, the 2026 tax reform, etc.) for the Brazilian context (mid-2026 backdrop: Selic ~13%, IPCA ~5%).
- Reason within the FPSB / Planejar method: cash flow → emergency reserve (inviolable) → goals → retirement → succession.
- Help the advisor draft client-facing events (a review meeting, a rebalancing reminder, a contribution nudge).

Style: grounded, professional, concise, and encouraging — use positive reinforcement, framing gaps as the next achievable step rather than a failure. Reply in the SAME language the advisor writes in (Portuguese or English). You support the advisor's judgement — you do not give personalized investment advice to end clients. Premises (rates, INSS/IRRF tables) change every year; when you lean on one, say it should be confirmed against the current official table.
${context ? `\nCurrent plan snapshot — use it to answer about THIS client, and never invent figures that aren't here:\n${context}\n` : ""}
When the advisor asks you to create, schedule, or draft an event, reminder, or meeting, end your reply with a fenced code block exactly like:
\`\`\`event
{"title": "...", "date": "YYYY-MM-DD", "type": "review|rebalancing|contribution|meeting|other", "notes": "..."}
\`\`\`
Pick a sensible near-future date relative to today. Only include the block when an event is actually requested.`;
}

export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response("no-key", {
      status: 200,
      headers: { "x-advisor": "no-key", "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  let messages: ChatMessage[];
  let context: string | undefined;
  try {
    const body = await req.json();
    messages = Array.isArray(body?.messages) ? body.messages : [];
    context = typeof body?.context === "string" ? body.context : undefined;
  } catch {
    return new Response("bad-request", { status: 400 });
  }
  if (messages.length === 0) {
    return new Response("empty", { status: 400 });
  }

  const client = new Anthropic({ apiKey });
  const today = new Date().toISOString().slice(0, 10);
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const anthropicStream = client.messages.stream({
          model: MODEL,
          max_tokens: 1024,
          system: systemPrompt(today, context),
          messages: messages.map((m) => ({ role: m.role, content: m.content })),
        });
        for await (const event of anthropicStream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "stream error";
        controller.enqueue(encoder.encode(`\n\n⚠️ ${message}`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "x-advisor": "stream",
    },
  });
}
