"use client";
import { useState } from "react";
import { Languages } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";
import { sameLang } from "@/i18n/content";
import type { Locale } from "@/lib/types";

/**
 * User content is always shown in the author's language. A translation is only
 * shown after an explicit click, and only if a stored translation exists (demo) —
 * we never machine-translate silently.
 */
export function useTranslation(contentLang: string, translations?: Partial<Record<Locale, { title: string; body: string }>>) {
  const { locale } = useI18n();
  const [on, setOn] = useState(false);
  const foreign = !sameLang(contentLang, locale);
  const tr = translations?.[locale];
  return { foreign, available: !!tr, on: on && !!tr, toggle: () => setOn((v) => !v), tr };
}

export function TranslateBar({ contentLang, state }: { contentLang: string; state: ReturnType<typeof useTranslation> }) {
  const { t, langName } = useI18n();
  if (!state.foreign) return null;
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
      <span className="inline-flex items-center gap-1">
        <Languages className="size-3.5" />
        {state.on ? t("translate.shownTranslation", { lang: langName(contentLang) }) : t("translate.original", { lang: langName(contentLang) })}
      </span>
      {state.available ? (
        <button className="font-semibold text-ink underline-offset-2 hover:underline" onClick={state.toggle}>
          {state.on ? t("translate.showOriginal") : t("translate.show")}
        </button>
      ) : (
        <span className="text-faint">{t("translate.unavailable")}</span>
      )}
    </div>
  );
}
