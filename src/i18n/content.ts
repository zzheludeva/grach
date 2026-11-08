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

/**
 * Techniques — a shared vocabulary used by products, posts, tutorials and search filters.
 * In production this maps to a `techniques` table with translations.
 */
type N = Record<Locale, string>;
export const TECHNIQUES: { id: string; cats: CategoryId[]; name: N }[] = [
  { id: "wheel", cats: ["pottery", "ceramics"], name: { ru: "Гончарный круг", en: "Wheel throwing", "pt-BR": "Torno", es: "Torno" } },
  { id: "handbuilding", cats: ["ceramics", "pottery"], name: { ru: "Ручная лепка", en: "Hand-building", "pt-BR": "Modelagem manual", es: "Modelado a mano" } },
  { id: "sgraffito", cats: ["ceramics"], name: { ru: "Сграффито", en: "Sgraffito", "pt-BR": "Sgraffito", es: "Esgrafiado" } },
  { id: "glazing", cats: ["ceramics", "pottery"], name: { ru: "Глазурование", en: "Glazing", "pt-BR": "Esmaltação", es: "Esmaltado" } },
  { id: "knitting", cats: ["knitting"], name: { ru: "Вязание спицами", en: "Needle knitting", "pt-BR": "Tricô", es: "Punto con agujas" } },
  { id: "crochet", cats: ["knitting"], name: { ru: "Вязание крючком", en: "Crochet", "pt-BR": "Crochê", es: "Ganchillo" } },
  { id: "dyeing", cats: ["knitting", "sewing"], name: { ru: "Окрашивание", en: "Dyeing", "pt-BR": "Tingimento", es: "Teñido" } },
  { id: "sewing", cats: ["sewing", "upcycling"], name: { ru: "Шитьё", en: "Sewing", "pt-BR": "Costura", es: "Costura" } },
  { id: "patchwork", cats: ["sewing"], name: { ru: "Пэчворк", en: "Patchwork", "pt-BR": "Patchwork", es: "Patchwork" } },
  { id: "reworking", cats: ["upcycling"], name: { ru: "Переделка вещей", en: "Reworking", "pt-BR": "Reaproveitamento", es: "Reutilización" } },
  { id: "satin", cats: ["embroidery"], name: { ru: "Гладь", en: "Satin stitch", "pt-BR": "Ponto cheio", es: "Punto relleno" } },
  { id: "freeEmbroidery", cats: ["embroidery"], name: { ru: "Свободная вышивка", en: "Free embroidery", "pt-BR": "Bordado livre", es: "Bordado libre" } },
  { id: "chainmaille", cats: ["jewelry"], name: { ru: "Кольчужное плетение", en: "Chainmaille", "pt-BR": "Chainmaille", es: "Cota de malla" } },
  { id: "metalsmithing", cats: ["jewelry"], name: { ru: "Ювелирная обработка металла", en: "Metalsmithing", "pt-BR": "Ourivesaria", es: "Orfebrería" } },
  { id: "beading", cats: ["jewelry"], name: { ru: "Бисероплетение", en: "Beading", "pt-BR": "Miçangas", es: "Abalorios" } },
  { id: "polymerClay", cats: ["jewelry"], name: { ru: "Полимерная глина", en: "Polymer clay", "pt-BR": "Argila polimérica", es: "Arcilla polimérica" } },
  { id: "watercolor", cats: ["painting"], name: { ru: "Акварель", en: "Watercolour", "pt-BR": "Aquarela", es: "Acuarela" } },
  { id: "acrylic", cats: ["painting"], name: { ru: "Акрил", en: "Acrylic", "pt-BR": "Acrílica", es: "Acrílico" } },
  { id: "oil", cats: ["painting"], name: { ru: "Масло", en: "Oil", "pt-BR": "Óleo", es: "Óleo" } },
  { id: "mosaic", cats: ["painting", "other"], name: { ru: "Мозаика", en: "Mosaic", "pt-BR": "Mosaico", es: "Mosaico" } },
  { id: "carving", cats: ["woodwork"], name: { ru: "Резьба", en: "Carving", "pt-BR": "Entalhe", es: "Talla" } },
  { id: "turning", cats: ["woodwork"], name: { ru: "Токарная работа", en: "Woodturning", "pt-BR": "Torneamento", es: "Torneado" } },
  { id: "origami", cats: ["paper"], name: { ru: "Оригами", en: "Origami", "pt-BR": "Origami", es: "Origami" } },
  { id: "bookbinding", cats: ["paper"], name: { ru: "Переплёт", en: "Bookbinding", "pt-BR": "Encadernação", es: "Encuadernación" } },
  { id: "papercut", cats: ["paper"], name: { ru: "Вырезание из бумаги", en: "Paper cutting", "pt-BR": "Recorte em papel", es: "Papel recortado" } },
  { id: "felting", cats: ["other"], name: { ru: "Валяние", en: "Felting", "pt-BR": "Feltragem", es: "Fieltro" } },
  { id: "macrame", cats: ["other"], name: { ru: "Макраме", en: "Macramé", "pt-BR": "Macramê", es: "Macramé" } },
  { id: "weaving", cats: ["other"], name: { ru: "Ткачество", en: "Weaving", "pt-BR": "Tecelagem", es: "Tejido en telar" } },
];

/** Known technique ids get a translated name; free-text techniques are shown as written. */
export function techniqueName(id: string | undefined, locale: Locale): string {
  if (!id) return "";
  const tq = TECHNIQUES.find((x) => x.id === id);
  return tq ? tq.name[locale] ?? tq.name.en : id;
}

export function techniquesFor(cat?: CategoryId | "") {
  return cat ? TECHNIQUES.filter((x) => x.cats.includes(cat)) : TECHNIQUES;
}

export function techniqueSearchTerms(id?: string): string[] {
  const tq = TECHNIQUES.find((x) => x.id === id);
  return tq ? Object.values(tq.name) : id ? [id] : [];
}
