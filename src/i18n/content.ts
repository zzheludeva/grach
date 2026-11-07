import type { CategoryId, Locale } from "@/lib/types";

/**
 * Localised system content (category names, search synonyms) is kept apart from
 * UI messages. In production this maps to the `category_translations` table.
 */
export const CATEGORIES: { id: CategoryId; color: string }[] = [
  { id: "ceramics", color: "#BE6334" },
  { id: "knitting", color: "#F66483" },
  { id: "sewing", color: "#30B8B2" },
  { id: "jewelry", color: "#FF9F00" },
  { id: "painting", color: "#F66483" },
  { id: "woodwork", color: "#BE6334" },
  { id: "embroidery", color: "#30B8B2" },
  { id: "pottery", color: "#FF9F00" },
  { id: "upcycling", color: "#15484C" },
  { id: "paper", color: "#30B8B2" },
  { id: "other", color: "#15484C" },
];

const NAMES: Record<CategoryId, Record<Locale, string>> = {
  ceramics: { ru: "Керамика", en: "Ceramics", "pt-BR": "Cerâmica", es: "Cerámica" },
  knitting: { ru: "Вязание", en: "Knitting", "pt-BR": "Tricô e crochê", es: "Tejido" },
  sewing: { ru: "Шитьё", en: "Sewing", "pt-BR": "Costura", es: "Costura" },
  jewelry: { ru: "Украшения", en: "Jewelry", "pt-BR": "Joias e bijuterias", es: "Joyería" },
  painting: { ru: "Живопись", en: "Painting", "pt-BR": "Pintura", es: "Pintura" },
  woodwork: { ru: "Работа с деревом", en: "Woodwork", "pt-BR": "Marcenaria", es: "Carpintería" },
  embroidery: { ru: "Вышивка", en: "Embroidery", "pt-BR": "Bordado", es: "Bordado" },
  pottery: { ru: "Гончарное дело", en: "Pottery", "pt-BR": "Olaria", es: "Alfarería" },
  upcycling: { ru: "Апсайклинг", en: "Upcycling", "pt-BR": "Upcycling", es: "Upcycling" },
  paper: { ru: "Бумажное искусство", en: "Paper art", "pt-BR": "Arte em papel", es: "Arte en papel" },
  other: { ru: "Другое", en: "Other", "pt-BR": "Outros", es: "Otros" },
};

/** Extra search synonyms in several languages and spellings. */
const SYNONYMS: Partial<Record<CategoryId, string[]>> = {
  ceramics: ["керамика", "ceramic", "ceramica", "фарфор", "глина", "clay", "argila", "arcilla", "porcelain"],
  knitting: ["вязание", "knit", "tricot", "trico", "croche", "crochet", "крючок", "спицы", "ganchillo", "punto"],
  sewing: ["шитье", "шить", "sew", "costura", "patchwork", "лоскут", "quilt"],
  jewelry: ["украшения", "бижутерия", "jewellery", "joia", "bijuteria", "joya", "кольцо", "ring", "anel"],
  painting: ["живопись", "акварель", "watercolor", "watercolour", "aquarela", "acuarela", "pintura", "painting"],
  woodwork: ["дерево", "резьба", "wood", "madeira", "madera", "carving", "токарка"],
  embroidery: ["вышивка", "embroider", "bordado", "stitch"],
  pottery: ["гончар", "pottery", "olaria", "alfareria", "круг", "wheel", "torno"],
  upcycling: ["апсайклинг", "переработка", "upcycle", "reciclagem", "reciclaje", "denim", "джинс"],
  paper: ["бумага", "оригами", "origami", "paper", "papel", "переплет", "bookbinding"],
};

export function categoryName(id: CategoryId, locale: Locale): string {
  return NAMES[id]?.[locale] ?? NAMES[id]?.en ?? id;
}

export function categorySearchTerms(id: CategoryId): string[] {
  return [...Object.values(NAMES[id] ?? {}), ...(SYNONYMS[id] ?? [])];
}

export function categoryColor(id?: CategoryId) {
  return CATEGORIES.find((c) => c.id === id)?.color ?? "#15484C";
}

const LANG_NAMES: Record<string, Record<Locale, string>> = {
  ru: { ru: "русский", en: "Russian", "pt-BR": "russo", es: "ruso" },
  en: { ru: "английский", en: "English", "pt-BR": "inglês", es: "inglés" },
  pt: { ru: "португальский", en: "Portuguese", "pt-BR": "português", es: "portugués" },
  es: { ru: "испанский", en: "Spanish", "pt-BR": "espanhol", es: "español" },
};

export function contentLangName(code: string, locale: Locale) {
  const base = code.split("-")[0];
  return LANG_NAMES[base]?.[locale] ?? code;
}

export function sameLang(contentLang: string, locale: Locale) {
  return contentLang.split("-")[0] === locale.split("-")[0];
}
