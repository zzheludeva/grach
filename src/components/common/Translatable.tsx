"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Languages, Loader2, RotateCcw } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";
import { useStore } from "@/lib/store";
import { sameLang } from "@/i18n/content";
import { baseLang, cachedTranslation, detectLang, translateTexts } from "@/lib/translate";
import { cn } from "@/lib/utils";

/**
 * Machine translation of a piece of user content into the interface language.
 *  - The source language is detected from the text (falls back to the author's declared language).
 *  - Same language → nothing is shown. Different → "Translate" / "Show original".
 *  - With "translate automatically" on (Settings, default), the translation runs on first open;
 *    cached results are shown instantly and never re-requested.
 *  - The original is never replaced: `text(i)` returns the translation only while it is switched on.
 *  - Errors keep the original visible and offer a retry.
 */
export type TranslationState = ReturnType<typeof useContentTranslation>;

export function useContentTranslation(texts: string[], declaredLang?: string, opts: { auto?: boolean } = {}) {
  const { locale } = useI18n();
  const { settings } = useStore();
  const joined = texts.join("\n\u0001\n");
  const source = useMemo(() => detectLang(texts.join("\n")) ?? (declaredLang ? baseLang(declaredLang) : null), [joined, declaredLang]); // eslint-disable-line react-hooks/exhaustive-deps
  const foreign = !!source && !sameLang(source, locale);
  const auto = (opts.auto ?? true) && settings.autoTranslate !== false;
  // Results are bound to the exact texts + target: edited content gets a fresh translation.
  const sig = `${locale}\u0002${joined}`;
  const fromCache = useMemo(() => {
    if (!foreign) return null;
    const arr = texts.map((x) => (x.trim() ? cachedTranslation(x, locale) : x));
    return arr.every((x) => x !== undefined) ? (arr as string[]) : null;
  }, [sig, foreign]); // eslint-disable-line react-hooks/exhaustive-deps
  const [result, setResult] = useState<{ sig: string; texts: string[] } | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [on, setOn] = useState(false);
  const started = useRef<string | null>(null);

  const translations = result?.sig === sig ? result.texts : fromCache;

  const run = useCallback(async () => {
    setStatus("loading");
    try {
      const out = await translateTexts(texts, locale);
      setResult({ sig, texts: out });
      setStatus("idle");
      setOn(true);
    } catch {
      setStatus("error");
      setOn(false);
    }
  }, [sig]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!foreign) return;
    if (fromCache) {
      if (auto) setOn(true);
      return;
    }
    if (auto && started.current !== sig) {
      started.current = sig;
      void run();
    }
  }, [sig, foreign, auto, fromCache, run]);

  return {
    foreign,
    source,
    on: on && !!translations,
    status,
    text: (i: number) => (on && translations ? translations[i] ?? texts[i] : texts[i]),
    toggle: () => {
      if (on && translations) return setOn(false);
      if (translations) return setOn(true);
      void run();
    },
    retry: () => void run(),
  };
}

/** "Translated from X · Show original" / "Original: X · Translate" / loading / error with retry. */
export function TranslateBar({ state, className }: { state: TranslationState; className?: string }) {
  const { t, langName } = useI18n();
  if (!state.foreign || !state.source) return null;
  const lang = langName(state.source);
  return (
    <div className={cn("flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted", className)} aria-live="polite">
      <span className="inline-flex items-center gap-1">
        {state.status === "loading" ? <Loader2 className="size-3.5 animate-spin" /> : <Languages className="size-3.5" />}
        {state.status === "loading" ? t("trx.translating") : state.on ? t("trx.translatedFrom", { lang }) : t("translate.original", { lang })}
      </span>
      {state.status === "error" ? (
        <>
          <span className="text-rose-deep">{t("trx.error")}</span>
          <button className="inline-flex min-h-8 items-center gap-1 font-semibold text-ink underline-offset-2 hover:underline" onClick={state.retry}>
            <RotateCcw className="size-3" /> {t("trx.retry")}
          </button>
        </>
      ) : state.status !== "loading" ? (
        <button className="min-h-8 font-semibold text-ink underline-offset-2 hover:underline" onClick={state.toggle}>
          {state.on ? t("translate.showOriginal") : t("trx.translate")}
        </button>
      ) : null}
    </div>
  );
}

/** A short user text (comment, review, bio) with its own translation toggle. */
export function TranslatableText({ text, lang, className, as: Tag = "p", auto = true }: { text: string; lang?: string; className?: string; as?: "p" | "span" | "div"; auto?: boolean }) {
  const tr = useContentTranslation([text], lang, { auto });
  return (
    <>
      <Tag className={cn("whitespace-pre-line", className)} lang={tr.on ? undefined : tr.source ?? undefined}>{tr.text(0)}</Tag>
      <TranslateBar state={tr} className="mt-0.5" />
    </>
  );
}
