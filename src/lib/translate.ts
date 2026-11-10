"use client";
import type { Locale } from "./types";

/**
 * Client side of machine translation (server: /api/translate, Claude).
 * - detectLang: fast local detection of the source language (script + common words), so we only offer or
 *   run a translation when the text really is in another language than the interface.
 * - translateTexts: batches strings, reuses cached results (browser cache keyed by target + hash of the exact
 *   text, so a changed source never shows an old translation), de-duplicates parallel requests and fails as a
 *   whole — callers never get a half-translated set.
 * Originals are never modified; translations live only in the cache.
 */

export type DetectedLang = "ru" | "en" | "pt" | "es";

const WORDS: Record<Exclude<DetectedLang, "ru">, string[]> = {
  en: ["the", "and", "is", "of", "to", "with", "for", "this", "that", "you", "it", "my", "on", "in", "are", "was", "i"],
  pt: ["não", "você", "com", "uma", "para", "que", "de", "do", "da", "é", "em", "os", "as", "mais", "muito", "meu", "minha", "isso"],
  es: ["el", "los", "las", "del", "una", "para", "que", "de", "es", "en", "con", "por", "muy", "mi", "pero", "y", "lo"],
};
const MARKS: Record<Exclude<DetectedLang, "ru">, RegExp> = {
  en: /\b(the|and|with)\b/gi,
  pt: /(ção|ções|ã|õ|ê|nh|lh)/gi,
  es: /(ñ|ción|¿|¡|ll)/gi,
};

/** Language of a text, or null when there's too little signal (short strings, only emoji, URLs, numbers). */
export function detectLang(text: string): DetectedLang | null {
  const clean = text.replace(/https?:\/\/\S+|@\w+|#\w+|\d+/g, " ");
  const letters = clean.match(/\p{L}/gu)?.length ?? 0;
  if (letters < 3) return null;
  const cyr = clean.match(/[Ѐ-ӿ]/g)?.length ?? 0;
  if (cyr / letters > 0.3) return "ru";
  const words = clean.toLowerCase().split(/[^\p{L}]+/u).filter(Boolean);
  const score = (l: Exclude<DetectedLang, "ru">) => words.filter((w) => WORDS[l].includes(w)).length * 2 + (clean.match(MARKS[l])?.length ?? 0);
  const ranked = (["en", "pt", "es"] as const).map((l) => [l, score(l)] as const).sort((a, b) => b[1] - a[1]);
  if (ranked[0][1] === 0) return words.length <= 2 ? null : "en";
  return ranked[0][0];
}

export const baseLang = (code: string) => code.split("-")[0].toLowerCase();

/** cyrb53: fast 53-bit string hash for cache keys. */
function hash(str: string, seed = 0) {
  let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

const KEY = "grach:tr:v1";
const LIMIT = 2000;
type Store = Record<string, [string, number]>; // key → [translation, lastUsed]
let mem: Store | null = null;
function load(): Store {
  if (mem) return mem;
  try {
    mem = JSON.parse(localStorage.getItem(KEY) ?? "{}") as Store;
  } catch {
    mem = {};
  }
  return mem!;
}
function save() {
  if (!mem) return;
  const entries = Object.entries(mem);
  if (entries.length > LIMIT) mem = Object.fromEntries(entries.sort((a, b) => b[1][1] - a[1][1]).slice(0, LIMIT));
  try {
    localStorage.setItem(KEY, JSON.stringify(mem));
  } catch {
    // storage full: keep in memory only
  }
}
const cacheKey = (target: Locale, text: string) => `${target}:${hash(text)}:${hash(text, 7)}:${text.length}`;

/** Cached translation of exactly this text, if any (no network). */
export function cachedTranslation(text: string, target: Locale): string | undefined {
  return load()[cacheKey(target, text)]?.[0];
}

export class TranslateError extends Error {
  constructor(public code: string) {
    super(code);
  }
}

const inflight = new Map<string, Promise<string>>();
/** Strings with nothing to translate (empty, only URLs / numbers / emoji) are returned as they are. */
const needsTranslation = (s: string) => (s.replace(/https?:\/\/\S+|[\d\s\p{P}\p{S}]/gu, "").length > 0);

async function request(target: Locale, texts: string[]): Promise<string[]> {
  let res: Response;
  try {
    res = await fetch("/api/translate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ target, texts }) });
  } catch {
    throw new TranslateError("network");
  }
  const json = (await res.json().catch(() => ({}))) as { translations?: (string | null)[]; error?: string };
  if (!res.ok || !Array.isArray(json.translations) || json.translations.length !== texts.length || json.translations.some((x) => typeof x !== "string")) {
    throw new TranslateError(json.error ?? `http_${res.status}`);
  }
  return json.translations as string[];
}

/**
 * Translates all strings or throws. Uses the cache first; the rest goes to the server in batches
 * (≤ 40 strings / ≤ 12 000 characters per request).
 */
export async function translateTexts(texts: string[], target: Locale): Promise<string[]> {
  const store = load();
  const result: (string | Promise<string>)[] = texts.map((text) => {
    if (!needsTranslation(text)) return text;
    const k = cacheKey(target, text);
    const hit = store[k];
    if (hit) {
      hit[1] = Date.now();
      return hit[0];
    }
    return inflight.get(k) ?? k;
  });
  // Group uncached, not-in-flight strings into batches.
  const pending: { i: number; text: string; k: string }[] = [];
  result.forEach((r, i) => {
    if (typeof r === "string" && r === cacheKey(target, texts[i]) && needsTranslation(texts[i])) pending.push({ i, text: texts[i], k: r });
  });
  const batches: (typeof pending)[] = [];
  let cur: typeof pending = [];
  let chars = 0;
  for (const p of pending) {
    if (cur.length && (cur.length >= 40 || chars + p.text.length > 12_000)) {
      batches.push(cur);
      cur = [];
      chars = 0;
    }
    cur.push(p);
    chars += p.text.length;
  }
  if (cur.length) batches.push(cur);
  for (const batch of batches) {
    const promise = request(target, batch.map((p) => p.text));
    batch.forEach((p, j) => {
      const one = promise.then((arr) => {
        store[p.k] = [arr[j], Date.now()];
        return arr[j];
      });
      inflight.set(p.k, one);
      one.finally(() => inflight.delete(p.k)).catch(() => {});
      result[p.i] = one;
    });
  }
  const out = await Promise.all(result.map((r) => (typeof r === "string" ? Promise.resolve(r) : r)));
  save();
  return out;
}
