import Anthropic from "@anthropic-ai/sdk";
import { anthropicTools, runTool } from "@/lib/tools";
import { checkRateLimit, clientIp } from "@/lib/ratelimit";

export const maxDuration = 60;

const MODEL = process.env.ALTAVIZ_MODEL ?? "claude-sonnet-5";
const MAX_AGENT_TURNS = 6;
const MAX_TOKENS_PER_TURN = 2000;
const MAX_HISTORY_MESSAGES = 24;

const SYSTEM = `You are Altaviz, an AI media-buying copilot embedded in a performance-marketing dashboard. The user is a media buyer at an affiliate marketing company that buys ads on Meta, Google, Taboola, and TikTok to generate leads (email/SMS signups) paid out per lead. ROI is the only metric that matters: profit = revenue (leads x payout) - spend.

You have tools over their live account data. Rules:
- Ground every claim in tool output. Call detect_anomalies for "what's wrong / what should I kill or scale" questions; get_account_overview for "how are we doing"; get_campaign_detail before discussing a specific campaign.
- Money talk: always quantify. Lead with the $/day impact. Media buyers act on dollars, not percentages.
- You NEVER execute changes. When change is warranted, call propose_actions and present the returned actions so the user can approve them in the queue. Say clearly that actions await human approval.
- When asked for new ad copy, call get_creative_context first, then write 3-5 variants grounded in what's working, respecting the compliance note. Label each variant's angle.
- Be concise and direct, like a sharp senior buyer in Slack: short paragraphs, occasional markdown tables for numbers, no filler, no restating the question.
- This is a demo account with seeded data; if asked, be transparent about that, but otherwise treat it as production.`;

interface ChatMessage {
  role: "user" | "assistant";
  text: string;
}

function sseLine(obj: Record<string, unknown>): string {
  return JSON.stringify(obj) + "\n";
}

export async function POST(req: Request) {
  const limit = checkRateLimit(clientIp(req));
  if (!limit.ok) {
    return Response.json(
      { error: `Rate limited. Try again in ~${limit.retryAfterSec}s.` },
      { status: 429, headers: { "retry-after": String(limit.retryAfterSec) } },
    );
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json(
      { error: "Server is missing ANTHROPIC_API_KEY." },
      { status: 500 },
    );
  }

  let history: ChatMessage[];
  try {
    const body = await req.json();
    const raw = (body.messages as Array<ChatMessage & { content?: string }>) ?? [];
    if (!Array.isArray(raw) || raw.length === 0) throw new Error("empty");
    history = raw.map((m) => {
      // accept `content` as an alias for `text` for hand-rolled API callers
      const text = typeof m.text === "string" ? m.text : m.content;
      if ((m.role !== "user" && m.role !== "assistant") || typeof text !== "string")
        throw new Error("bad message");
      return { role: m.role, text };
    });
  } catch {
    return Response.json(
      {
        error:
          "Invalid request body. Expected { messages: [{ role: 'user' | 'assistant', text: string }] }.",
      },
      { status: 400 },
    );
  }

  // Cap history so a long session can't run up token costs; tool-use blocks
  // are not replayed across user turns — the agent re-queries tools as needed.
  const messages: Anthropic.MessageParam[] = history
    .slice(-MAX_HISTORY_MESSAGES)
    .map((m) => ({ role: m.role, content: m.text.slice(0, 4000) }));

  const client = new Anthropic();
  const tools = anthropicTools();
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit = (obj: Record<string, unknown>) =>
        controller.enqueue(encoder.encode(sseLine(obj)));
      try {
        for (let turn = 0; turn < MAX_AGENT_TURNS; turn++) {
          const s = client.messages.stream({
            model: MODEL,
            max_tokens: MAX_TOKENS_PER_TURN,
            system: SYSTEM,
            thinking: { type: "disabled" },
            tools,
            messages,
          });
          s.on("text", (t) => emit({ t: "text", v: t }));
          const final = await s.finalMessage();

          if (final.stop_reason !== "tool_use") {
            if (final.stop_reason === "max_tokens") {
              emit({
                t: "text",
                v: "\n\n_(Cut off at the demo's per-response length cap — say “continue” for the rest.)_",
              });
            }
            emit({ t: "done" });
            break;
          }

          messages.push({ role: "assistant", content: final.content });
          const results: Anthropic.ToolResultBlockParam[] = [];
          for (const block of final.content) {
            if (block.type !== "tool_use") continue;
            emit({ t: "tool_start", name: block.name });
            const res = runTool(block.name, block.input);
            if (block.name === "propose_actions" && !res.isError) {
              emit({ t: "actions", v: JSON.parse(res.content) });
            }
            results.push({
              type: "tool_result",
              tool_use_id: block.id,
              content: res.content,
              ...(res.isError ? { is_error: true } : {}),
            });
            emit({ t: "tool_end", name: block.name });
          }
          messages.push({ role: "user", content: results });

          if (turn === MAX_AGENT_TURNS - 1) {
            emit({
              t: "text",
              v: "\n\n_(Stopped after the maximum number of tool rounds for this demo.)_",
            });
            emit({ t: "done" });
          }
        }
      } catch (err) {
        const msg =
          err instanceof Anthropic.RateLimitError
            ? "The model is rate-limited right now — try again in a minute."
            : err instanceof Anthropic.APIConnectionError
              ? "Connection issue reaching the model — try again."
              : err instanceof Anthropic.APIError
                ? `Model error (${err.status}): ${err.message}`
                : "Something went wrong generating the response.";
        emit({ t: "error", v: msg });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "application/x-ndjson; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
