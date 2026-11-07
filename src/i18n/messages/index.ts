import type { Locale } from "@/lib/types";
import type { Dict } from "./types";
import ru from "./ru";
import en from "./en";
import ptBR from "./pt-BR";
import es from "./es";

/** Add a language: create a dictionary file and register it here (+ in i18n/config LOCALES). */
export const messages: Record<Locale, Dict & { langSuggest?: { text?: string; switch?: string } }> = {
  ru: ru as never,
  en: en as never,
  "pt-BR": ptBR as never,
  es: es as never,
};
export type Messages = Dict;
