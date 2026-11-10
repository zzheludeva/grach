"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import { useStore } from "@/lib/store";
import { sameLang } from "@/i18n/content";
import { cachedTranslation, detectLang, translateTexts } from "@/lib/translate";
import type { Message } from "@/lib/types";

/**
 * Translation of incoming messages in a conversation into the reader's interface language.
 * All foreign incoming messages (old and new) are translated in one batched request; cached ones show
 * instantly. Each message can be switched back to its original. Messages in the database are never changed,
 * and the sender's own messages are never translated.
 */
export function useMessageTranslations(messages: Message[], meId: string | null) {
  const { locale } = useI18n();
  const { settings } = useStore();
  const auto = settings.autoTranslate !== false;
  const foreign = useMemo(
    () =>
      messages
        .filter((m) => m.fromId !== meId && m.text.trim())
        .map((m) => ({ id: m.id, text: m.text, lang: detectLang(m.text) }))
        .filter((m) => m.lang && !sameLang(m.lang, locale)),
    [messages, meId, locale],
  );
  const [map, setMap] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [original, setOriginal] = useState<Set<string>>(new Set());
  const [requested, setRequested] = useState(false);

  // Cached translations are available without a request.
  const cached = useMemo(() => {
    const out: Record<string, string> = {};
    for (const m of foreign) {
      const c = cachedTranslation(m.text, locale);
      if (c !== undefined) out[`${locale}:${m.text}`] = c;
    }
    return out;
  }, [foreign, locale]);
  const get = (text: string) => map[`${locale}:${text}`] ?? cached[`${locale}:${text}`];
  const missing = foreign.filter((m) => get(m.text) === undefined);
  const missingKey = missing.map((m) => m.id).join(",");

  const run = useCallback(async () => {
    const texts = [...new Set(missing.map((m) => m.text))];
    if (!texts.length) return;
    setStatus("loading");
    try {
      const out = await translateTexts(texts, locale);
      setMap((prev) => ({ ...prev, ...Object.fromEntries(texts.map((tx, i) => [`${locale}:${tx}`, out[i]])) }));
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  }, [missingKey, locale]); // eslint-disable-line react-hooks/exhaustive-deps

  // New messages are handled automatically (when auto-translate is on or the person asked once).
  useEffect(() => {
    if (missing.length && (auto || requested) && status !== "loading") void run();
  }, [missingKey, auto, requested]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    status,
    langOf: (id: string) => foreign.find((m) => m.id === id)?.lang ?? null,
    isForeign: (id: string) => foreign.some((m) => m.id === id),
    /** Text to show: the translation unless the person switched this message to its original. */
    display: (m: Message) => {
      const tr = foreign.some((f) => f.id === m.id) ? get(m.text) : undefined;
      return tr !== undefined && !original.has(m.id) ? { text: tr, translated: true } : { text: m.text, translated: false, available: tr !== undefined };
    },
    toggle: (id: string, text: string) => {
      if (get(text) === undefined) {
        setRequested(true);
        void run();
        setOriginal((s) => { const n = new Set(s); n.delete(id); return n; });
        return;
      }
      setOriginal((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
    },
    retry: () => void run(),
  };
}
