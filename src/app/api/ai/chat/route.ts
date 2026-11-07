import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

/**
 * Live "Creative ping-pong" endpoint. Runs only on the server; the API key is read
 * from the server environment (ANTHROPIC_API_KEY) and never reaches the browser.
 * Without a key the client falls back to the clearly-labelled scripted demo.
 */
export const runtime = "nodejs";

const LANG: Record<string, string> = { ru: "Russian", en: "English", "pt-BR": "Brazilian Portuguese", es: "Spanish" };

const SYSTEM = `You are the creative partner in "Remeslo AI Studio", a community for people who make things by hand.
Your method is "creative ping-pong": you do not hand over finished ideas. You ask one or two focused questions at a time,
help the person explore options, suggest unexpected combinations of techniques and materials, and build on THEIR initial idea.
When you do offer directions, give at most three short, concrete options and ask which one resonates.
Never pretend to know facts about a specific author's process; suggest asking the author in the comments instead.
Keep replies under 180 words. Plain text, no Markdown headings.`;

function client() {
  return process.env.ANTHROPIC_API_KEY ? new Anthropic() : null;
}

export async function GET() {
  return NextResponse.json({ live: !!client() });
}

interface Body {
  locale: string;
  scenario: string;
  history: { role: "user" | "assistant"; text: string }[];
  postContext?: { title: string; body: string; category?: string };
}

export async function POST(req: Request) {
  const anthropic = client();
  if (!anthropic) return NextResponse.json({ error: "not_configured" }, { status: 501 });

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const history = (body.history ?? []).filter((m) => m.text?.trim()).slice(-30);
  // The API requires the first message to be from the user.
  while (history.length && history[0].role !== "user") history.shift();
  if (!history.length) return NextResponse.json({ error: "empty" }, { status: 400 });

  const context = body.postContext
    ? `\nThe person wants to discuss a community post. Title: "${body.postContext.title}". Description: "${body.postContext.body}".`
    : "";

  try {
    const response = await anthropic.beta.messages.create({
      model: "claude-opus-5-5",
      max_tokens: 16000,
      output_config: { effort: "low" },
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: `${SYSTEM}\nAlways answer in ${LANG[body.locale] ?? "English"}. Scenario: ${body.scenario}.${context}`,
      messages: history.map((m) => ({ role: m.role, content: m.text })),
    });

    if (response.stop_reason === "refusal") {
      return NextResponse.json({ error: "refusal" }, { status: 422 });
    }
    const text = response.content
      .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();
    return NextResponse.json({ text });
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
    if (error instanceof Anthropic.AuthenticationError) return NextResponse.json({ error: "auth" }, { status: 502 });
    if (error instanceof Anthropic.APIError) return NextResponse.json({ error: "api", status: error.status }, { status: 502 });
    return NextResponse.json({ error: "network" }, { status: 502 });
  }
}
