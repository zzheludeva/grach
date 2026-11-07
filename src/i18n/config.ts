import type { Locale } from "@/lib/types";

export const LOCALES: Locale[] = ["ru", "en", "pt-BR", "es"];
export const DEFAULT_LOCALE: Locale = "en";
/** Languages written right-to-left. Empty for v1, but layout uses logical CSS properties. */
export const RTL_LOCALES: string[] = ["ar", "he", "fa", "ur"];

export const LOCALE_NAMES: Record<Locale, string> = {
  ru: "Русский",
  en: "English",
  "pt-BR": "Português (Brasil)",
  es: "Español",
};

/** Suggest a UI language from the browser — never from geography. */
export function detectLocale(langs: readonly string[] | undefined): Locale {
  for (const l of langs ?? []) {
    const low = l.toLowerCase();
    if (low.startsWith("ru")) return "ru";
    if (low.startsWith("pt")) return "pt-BR";
    if (low.startsWith("es")) return "es";
    if (low.startsWith("en")) return "en";
  }
  return DEFAULT_LOCALE;
}

export function dirFor(locale: string): "ltr" | "rtl" {
  return RTL_LOCALES.includes(locale.split("-")[0]) ? "rtl" : "ltr";
}
