import type { Locale } from "@/lib/types";
import type { Dict } from "./types";
import ru from "./ru";
import en from "./en";
import ptBR from "./pt-BR";
import es from "./es";
import ruExt from "./ext/ru";
import enExt from "./ext/en";
import ptBRExt from "./ext/pt-BR";
import esExt from "./ext/es";

/** Deep-merges feature dictionaries into the base one (same keys, same `t()`; no parallel mechanism). */
function merge(base: Dict, ext: Dict): Dict {
  const out: Dict = { ...base };
  for (const [k, v] of Object.entries(ext)) {
    const cur = out[k];
    const isObj = (x: unknown) => !!x && typeof x === "object" && !("other" in (x as object));
    out[k] = isObj(cur) && isObj(v) ? merge(cur as Dict, v as Dict) : v;
  }
  return out;
}

/** Add a language: create a dictionary file and register it here (+ in i18n/config LOCALES). */
export const messages: Record<Locale, Dict & { langSuggest?: { text?: string; switch?: string } }> = {
  ru: merge(ru, ruExt) as never,
  en: merge(en, enExt) as never,
  "pt-BR": merge(ptBR, ptBRExt) as never,
  es: merge(es, esExt) as never,
};
export type Messages = Dict;
