"use client";
import { useEffect, useState } from "react";
import { Languages, X } from "lucide-react";
import { useStore } from "@/lib/store";
import { useI18n } from "@/i18n/I18nProvider";
import { detectLocale, LOCALE_NAMES } from "@/i18n/config";
import { messages } from "@/i18n/messages";
import type { Locale } from "@/lib/types";

/** Suggests the browser language if it differs from the current UI language. Never auto-switches. */
export function LangSuggestion() {
  const { state, actions } = useStore();
  const { locale } = useI18n();
  const [suggest, setSuggest] = useState<Locale | null>(null);
  useEffect(() => {
    if (!state?.langSuggested) return;
    const l = detectLocale(navigator.languages);
    setSuggest(l !== locale ? l : null);
  }, [state?.langSuggested, locale]);
  if (!suggest || !state?.langSuggested) return null;
  const m = messages[suggest].langSuggest;
  return (
    <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-teal/40 bg-teal-soft/70 px-4 py-2.5 text-sm text-ink" lang={suggest}>
      <Languages className="size-4 shrink-0" />
      <span className="min-w-0 flex-1">{m?.text?.replace("{lang}", LOCALE_NAMES[suggest])}</span>
      <button
        className="font-bold underline-offset-2 hover:underline"
        onClick={() => {
          actions.updateSettings({ lang: suggest });
          actions.setDeviceLang(suggest);
        }}
      >
        {m?.switch}
      </button>
      <button onClick={() => actions.dismissLangSuggestion()} aria-label="×" className="opacity-60 hover:opacity-100">
        <X className="size-4" />
      </button>
    </div>
  );
}
