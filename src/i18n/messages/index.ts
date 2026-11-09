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
import ruExt3 from "./ext3/ru";
import enExt3 from "./ext3/en";
import ptBRExt3 from "./ext3/pt-BR";
import esExt3 from "./ext3/es";
import ruExt4 from "./ext4/ru";
import enExt4 from "./ext4/en";
import ptBRExt4 from "./ext4/pt-BR";
import esExt4 from "./ext4/es";
import ruExt5 from "./ext5/ru";
import enExt5 from "./ext5/en";
import ptBRExt5 from "./ext5/pt-BR";
import esExt5 from "./ext5/es";

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
  ru: merge(merge(merge(merge(ru, ruExt), ruExt3), ruExt4), ruExt5) as never,
  en: merge(merge(merge(merge(en, enExt), enExt3), enExt4), enExt5) as never,
  "pt-BR": merge(merge(merge(merge(ptBR, ptBRExt), ptBRExt3), ptBRExt4), ptBRExt5) as never,
  es: merge(merge(merge(merge(es, esExt), esExt3), esExt4), esExt5) as never,
};
export type Messages = Dict;
