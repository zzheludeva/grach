import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

/**
 * Machine translation of user content and messages (posts, products, tutorials, workshops, comments, DMs).
 * Runs only on the server with ANTHROPIC_API_KEY; the key never reaches the browser.
 *
 * - Input: up to 60 strings and a target UI locale. Output: translations in the same order + detected source languages.
 * - Structure is preserved (line breaks, lists, markdown); names, @usernames, brands, URLs, e-mails, #tags and
 *   numbers are kept as is. Text already in the target language comes back unchanged.
 * - Server-side cache keyed by (target, exact source text): an edited source text is a new key, so an
 *   outdated translation is never returned. The browser keeps its own cache with the same key.
 * - Without a key → 501 not_configured; the UI keeps the original visible and says translation is unavailable.
 */
export const runtime = "nodejs";

const LANG: Record<string, string> = { ru: "Russian", en: "English", "pt-BR": "Brazilian Portuguese", es: "Spanish" };
const MAX_TEXTS = 60;
const MAX_CHARS = 24_000;

const cache = new Map<string, { text: string; lang: string }>();
const CACHE_LIMIT = 5000;
const remember = (k: string, v: { text: string; lang: string }) => {
  if (cache.size >= CACHE_LIMIT) cache.delete(cache.keys().next().value as string);
  cache.set(k, v);
};

const SYSTEM = `You translate user-generated content on GRACH, a community and marketplace for handmade crafts.
Translate each input string into the target language. Rules:
- Translate meaning naturally, in the same tone (friendly, informal), as a native speaker would write it.
- Keep the structure exactly: line breaks, blank lines, list markers ("-", "•", "1."), markdown (#, **bold**), emoji.
- Do NOT translate or change: people's names, @usernames, brand and shop names, product or series names in quotes when they are proper names, URLs, e-mail addresses, #hashtags, numbers, measurements, prices, currency codes.
- If a string is already in the target language, return it unchanged.
- Never add explanations, notes or quotes around the result. Never drop or merge strings.
Return JSON: "translations" — the translated strings in the same order and count as the input; "source_languages" — the detected ISO 639-1 language code of each input string (e.g. "ru", "en", "pt", "es").`;

const schema = {
  type: "object",
  properties: {
    translations: { type: "array", items: { type: "string" } },
    source_languages: { type: "array", items: { type: "string" } },
  },
  required: ["translations", "source_languages"],
  additionalProperties: false,
} as const;

function client() {
  return process.env.ANTHROPIC_API_KEY ? new Anthropic() : null;
}

/** Lets the client know whether live translation is configured. */
export async function GET() {
  return NextResponse.json({ live: !!client() });
}

export async function POST(req: Request) {
  let body: { target?: string; texts?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const target = typeof body.target === "string" && LANG[body.target] ? body.target : null;
  const texts = Array.isArray(body.texts) ? body.texts.filter((x): x is string => typeof x === "string") : [];
  if (!target || !texts.length || texts.length > MAX_TEXTS || texts.reduce((n, x) => n + x.length, 0) > MAX_CHARS) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const out: (string | null)[] = texts.map((x) => cache.get(`${target}\u0000${x}`)?.text ?? null);
  const langs: (string | null)[] = texts.map((x) => cache.get(`${target}\u0000${x}`)?.lang ?? null);
  const todo = texts.map((x, i) => ({ x, i })).filter(({ i }) => out[i] === null);
  if (!todo.length) return NextResponse.json({ translations: out, sourceLanguages: langs, cached: true });

  const anthropic = client();
  if (!anthropic) return NextResponse.json({ error: "not_configured" }, { status: 501 });

  try {
    const response = await anthropic.beta.messages.create({
      model: "claude-opus-5-5",
      max_tokens: 16000,
      output_config: { effort: "low", format: { type: "json_schema", schema } },
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: `Target language: ${LANG[target]}.\nInput strings (JSON array):\n${JSON.stringify(todo.map(({ x }) => x))}`,
        },
      ],
    });
    if (response.stop_reason === "refusal") return NextResponse.json({ error: "refusal" }, { status: 422 });
    if (response.stop_reason === "max_tokens") return NextResponse.json({ error: "too_long" }, { status: 413 });
    const raw = response.content
      .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");
    const parsed = JSON.parse(raw) as { translations: string[]; source_languages: string[] };
    // All or nothing: a partial answer is never passed off as a full translation.
    if (!Array.isArray(parsed.translations) || parsed.translations.length !== todo.length) {
      return NextResponse.json({ error: "mismatch" }, { status: 502 });
    }
    todo.forEach(({ x, i }, k) => {
      const text = String(parsed.translations[k] ?? "");
      const lang = String(parsed.source_languages?.[k] ?? "").toLowerCase().slice(0, 5);
      out[i] = text;
      langs[i] = lang || null;
      remember(`${target}\u0000${x}`, { text, lang });
    });
    return NextResponse.json({ translations: out, sourceLanguages: langs });
  } catch (error) {
    if (error instanceof SyntaxError) return NextResponse.json({ error: "bad_output" }, { status: 502 });
    if (error instanceof Anthropic.RateLimitError) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
    if (error instanceof Anthropic.AuthenticationError) return NextResponse.json({ error: "auth" }, { status: 502 });
    if (error instanceof Anthropic.APIError) return NextResponse.json({ error: "api", status: error.status }, { status: 502 });
    return NextResponse.json({ error: "network" }, { status: 502 });
  }
}
