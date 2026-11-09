import type { SeedData } from "@/data/seed";
import type { CategoryId, CountryCode, CurrencyCode, Money, Post, Product, Project, Tutorial, User, Workshop } from "./types";
import { categorySearchTerms, techniqueSearchTerms } from "@/i18n/content";
import { likeCount } from "./selectors";
import { norm, DAY } from "./utils";
import { nextSession, seatsLeft, seatsTaken } from "./workshops";

/**
 * Global search: one index over posts, people, products, workshops, events, tutorials
 * and the viewer's own projects (projects are private — never other people's).
 * Every filter and sort here changes the result set; the page only renders it.
 */

export const SEARCH_TYPES = ["all", "post", "user", "product", "workshop", "tutorial", "project"] as const;
export type SearchType = (typeof SEARCH_TYPES)[number];
export type ItemType = Exclude<SearchType, "all">;

export const SORTS = ["relevance", "newest", "oldest", "popular", "saves", "priceAsc", "priceDesc", "eventDate"] as const;
export type SortKey = (typeof SORTS)[number];

export const SORTS_BY_TYPE: Record<SearchType, SortKey[]> = {
  all: ["relevance", "newest", "oldest", "popular", "saves"],
  post: ["relevance", "newest", "oldest", "popular", "saves"],
  user: ["relevance", "newest", "oldest", "popular"],
  product: ["relevance", "newest", "oldest", "popular", "saves", "priceAsc", "priceDesc"],
  workshop: ["relevance", "eventDate", "newest", "oldest", "popular", "saves", "priceAsc", "priceDesc"],
  tutorial: ["relevance", "newest", "oldest", "popular", "saves", "priceAsc", "priceDesc"],
  project: ["relevance", "newest", "oldest"],
};

/** Filters that are meaningful for each content type (general filters apply to all). */
export const GENERAL_FILTERS = ["cat", "date", "lang", "country"] as const;
export const FILTERS_BY_TYPE: Record<SearchType, string[]> = {
  all: [],
  post: ["kind", "tech", "author"],
  user: [],
  product: ["tech", "mat", "cur", "pmin", "pmax", "from", "ship", "stock", "mto"],
  workshop: ["tech", "fmt", "city", "when", "cost", "seats", "level"],
  tutorial: ["tech", "level", "lfmt", "cost"],
  project: ["pst"],
};
export const FILTER_KEYS = ["cat", "date", "lang", "country", "kind", "tech", "author", "mat", "cur", "pmin", "pmax", "from", "ship", "stock", "mto", "fmt", "city", "when", "cost", "seats", "level", "lfmt", "pst"] as const;
export type FilterKey = (typeof FILTER_KEYS)[number];
export type Filters = Partial<Record<FilterKey, string>> & { q: string; type: SearchType; sort: SortKey };

export function allowedFilters(type: SearchType): FilterKey[] {
  return [...GENERAL_FILTERS, ...FILTERS_BY_TYPE[type]] as FilterKey[];
}

export interface SearchItem {
  type: ItemType;
  id: string;
  title: string;
  createdAt: string;
  score: number;
  popularity: number;
  saves: number;
  price?: Money | null;
  eventAt?: string;
  cat?: CategoryId;
  lang?: string;
  country?: string;
  tech?: string;
  ref: Post | User | Product | Workshop | Tutorial | Project;
}

interface Ctx {
  d: SeedData;
  me: string | null;
  myCountry: CountryCode;
  myCurrency: CurrencyCode;
  now: number;
}

const favCount = (d: SeedData, type: string, id: string) => d.favorites.filter((f) => f.type === type && f.id === id).length;

/** Text relevance: every query word must match somewhere; title matches weigh more. */
function score(q: string, title: string, text: string, cat?: CategoryId, tech?: string): number {
  if (!q) return 0;
  const words = norm(q).split(/\s+/).filter((w) => w.length > 1 || q.trim().length === 1);
  if (!words.length) return 0;
  const nt = norm(title);
  const nx = norm(text);
  const catTerms = cat ? categorySearchTerms(cat).map(norm) : [];
  const techTerms = techniqueSearchTerms(tech).map(norm);
  let total = 0;
  for (const w of words) {
    let s = 0;
    if (nt.includes(w)) s += nt.split(/\s+/).some((x) => x.startsWith(w)) ? 6 : 4;
    if (nx.includes(w)) s += 2;
    if (catTerms.some((c) => c.includes(w) || w.includes(c))) s += 2;
    if (techTerms.some((c) => c.includes(w))) s += 2;
    if (!s) return 0; // all words must match
    total += s;
  }
  if (nt.includes(norm(q.trim()))) total += 5;
  return total;
}

function index(c: Ctx, q: string): SearchItem[] {
  const { d, me } = c;
  const out: SearchItem[] = [];
  const user = (id: string) => d.users.find((u) => u.id === id);

  for (const p of d.posts) {
    const tr = Object.values(p.translations ?? {}).map((x) => `${x?.title} ${x?.body}`).join(" ");
    const titles = `${p.title} ${Object.values(p.translations ?? {}).map((x) => x?.title).join(" ")}`;
    const s = score(q, titles, `${p.body} ${tr} ${user(p.authorId)?.name ?? ""}`, p.category, p.technique);
    if (q && !s) continue;
    const comments = d.comments.filter((x) => x.postId === p.id).length;
    out.push({ type: "post", id: p.id, title: p.title, createdAt: p.createdAt, score: s, popularity: likeCount(d, p.id) + comments * 3, saves: favCount(d, "post", p.id), cat: p.category, lang: p.lang, country: user(p.authorId)?.country, tech: p.technique, ref: p });
  }
  for (const u of d.users) {
    const byText = score(q, `${u.name} ${u.username}`, `${u.bio} ${u.skills.join(" ")} ${u.city}`);
    const byInterest = q && !byText ? Math.max(0, ...u.interests.map((i) => score(q, "", "", i))) : 0;
    const s = byText || byInterest;
    if (q && !s) continue;
    out.push({ type: "user", id: u.id, title: u.name, createdAt: u.joinedAt, score: s, popularity: d.follows.filter((f) => f.followingId === u.id).length, saves: 0, lang: u.contentLang, country: u.country, ref: u });
  }
  for (const p of d.products) {
    if (p.status !== "published") continue;
    const s = score(q, p.title, `${p.summary} ${p.description} ${p.materials.join(" ")} ${user(p.sellerId)?.name ?? ""}`, p.category, p.technique);
    if (q && !s) continue;
    out.push({ type: "product", id: p.id, title: p.title, createdAt: p.createdAt, score: s, popularity: p.views, saves: favCount(d, "product", p.id), price: p.price, cat: p.category, lang: p.lang, country: p.shipsFrom, tech: p.technique, ref: p });
  }
  for (const w of d.workshops) {
    if (w.status !== "published") continue; // drafts and archived templates are not discoverable
    const s = score(q, w.title, `${w.description} ${w.program.join(" ")} ${w.city ?? ""} ${w.venue ?? ""} ${user(w.hostId)?.name ?? ""}`, w.category, w.technique);
    if (q && !s) continue;
    const next = nextSession(d, w.id, c.now);
    const booked = d.sessions.filter((x) => x.workshopId === w.id).reduce((n, x) => n + seatsTaken(d, x), 0);
    out.push({ type: "workshop", id: w.id, title: w.title, createdAt: w.createdAt, score: s, popularity: booked, saves: favCount(d, "workshop", w.id), price: next?.price ?? w.price, eventAt: next?.startsAt, cat: w.category, lang: w.lang, country: w.country, tech: w.technique, ref: w });
  }
  for (const tu of d.tutorials) {
    if (tu.status !== "published") continue;
    const s = score(q, tu.title, `${tu.summary} ${tu.steps.map((x) => `${x.title} ${x.text}`).join(" ")} ${user(tu.authorId)?.name ?? ""}`, tu.category, tu.technique);
    if (q && !s) continue;
    const buys = d.tutorialPurchases.filter((x) => x.tutorialId === tu.id).length;
    out.push({ type: "tutorial", id: tu.id, title: tu.title, createdAt: tu.createdAt, score: s, popularity: tu.reviews.length * 5 + buys * 3, saves: favCount(d, "tutorial", tu.id), price: tu.price, cat: tu.category, lang: tu.lang, country: user(tu.authorId)?.country, tech: tu.technique, ref: tu });
  }
  // Access rule: projects are private — only the viewer's own projects are searchable.
  for (const p of d.projects.filter((x) => x.userId === me)) {
    const s = score(q, p.title, `${p.description} ${p.idea} ${p.notes.map((n) => n.text).join(" ")} ${p.materials.join(" ")}`, p.category, p.technique);
    if (q && !s) continue;
    out.push({ type: "project", id: p.id, title: p.title, createdAt: p.createdAt, score: s, popularity: 0, saves: 0, cat: p.category, tech: p.technique, lang: undefined, country: undefined, ref: p });
  }
  return out;
}

function passGeneral(it: SearchItem, f: Filters, c: Ctx) {
  if (f.cat) {
    if (it.type === "user") {
      if (!(it.ref as User).interests.includes(f.cat as CategoryId)) return false;
    } else if (it.cat !== f.cat) return false;
  }
  if (f.date) {
    const days = f.date === "d7" ? 7 : f.date === "d30" ? 30 : 365;
    if (new Date(it.createdAt).getTime() < c.now - days * DAY) return false;
  }
  if (f.lang && it.lang !== f.lang) return false;
  if (f.country && it.country !== f.country) return false;
  return true;
}

function passSpecific(it: SearchItem, f: Filters, c: Ctx) {
  switch (it.type) {
    case "post": {
      const p = it.ref as Post;
      if (f.kind && p.kind !== f.kind) return false;
      if (f.tech && p.technique !== f.tech) return false;
      if (f.author && p.authorId !== f.author) return false;
      return true;
    }
    case "product": {
      const p = it.ref as Product;
      if (f.tech && p.technique !== f.tech) return false;
      if (f.mat) {
        const want = f.mat.split(",").filter(Boolean);
        if (!want.every((m) => p.materials.some((x) => norm(x) === norm(m)))) return false;
      }
      if (f.cur) {
        if (p.price.currency !== f.cur) return false;
        if (f.pmin && p.price.amount < Number(f.pmin)) return false;
        if (f.pmax && p.price.amount > Number(f.pmax)) return false;
      }
      if (f.from && p.shipsFrom !== f.from) return false;
      if (f.ship && !p.shipsTo.includes(c.myCountry)) return false;
      if (f.stock && p.availability !== "in_stock") return false;
      if (f.mto && p.saleType === "ready") return false;
      return true;
    }
    case "workshop": {
      // Date, city, price and seat filters are matched against the template's concrete sessions.
      const w = it.ref as Workshop;
      if (f.tech && w.technique !== f.tech) return false;
      if (f.fmt && w.format !== f.fmt) return false;
      if (f.level && w.level !== f.level) return false;
      const ss = c.d.sessions.filter((s) => s.workshopId === w.id && s.status === "scheduled");
      const ok = ss.filter((s) => {
        const start = new Date(s.startsAt).getTime();
        if (f.when === "past") return start < c.now;
        if (start < c.now) return false;
        if (f.when === "week" && start > c.now + 7 * DAY) return false;
        if (f.when === "month" && start > c.now + 30 * DAY) return false;
        if (f.city && s.city !== f.city) return false;
        if (f.cost === "free" && s.price) return false;
        if (f.cost === "paid" && !s.price) return false;
        if (f.seats && seatsLeft(c.d, s) <= 0) return false;
        return true;
      });
      const anySessionFilter = f.when || f.city || f.cost || f.seats;
      if (anySessionFilter && !ok.length) return false;
      if (ok.length && f.when !== "past") it.eventAt = ok[0].startsAt;
      return true;
    }
    case "tutorial": {
      const tu = it.ref as Tutorial;
      if (f.tech && tu.technique !== f.tech) return false;
      if (f.level && tu.level !== f.level) return false;
      if (f.lfmt && (tu.format ?? "steps") !== f.lfmt) return false;
      if (f.cost === "free" && tu.price) return false;
      if (f.cost === "paid" && !tu.price) return false;
      return true;
    }
    case "project":
      return !f.pst || (it.ref as Project).status === f.pst;
    default:
      return true;
  }
}

function sortItems(items: SearchItem[], sort: SortKey, c: Ctx, hasQuery: boolean) {
  const byNew = (a: SearchItem, b: SearchItem) => b.createdAt.localeCompare(a.createdAt);
  // Prices are never converted: the viewer's currency comes first, other currencies grouped after it.
  const priceCmp = (a: SearchItem, b: SearchItem, dir: 1 | -1) => {
    const ca = a.price?.currency ?? c.myCurrency;
    const cb = b.price?.currency ?? c.myCurrency;
    if (ca !== cb) return ca === c.myCurrency ? -1 : cb === c.myCurrency ? 1 : ca.localeCompare(cb);
    return ((a.price?.amount ?? 0) - (b.price?.amount ?? 0)) * dir;
  };
  const cmp: Record<SortKey, (a: SearchItem, b: SearchItem) => number> = {
    relevance: (a, b) => (hasQuery ? b.score - a.score : 0) || b.popularity - a.popularity || byNew(a, b),
    newest: byNew,
    oldest: (a, b) => a.createdAt.localeCompare(b.createdAt),
    popular: (a, b) => b.popularity - a.popularity || byNew(a, b),
    saves: (a, b) => b.saves - a.saves || b.popularity - a.popularity,
    priceAsc: (a, b) => priceCmp(a, b, 1),
    priceDesc: (a, b) => priceCmp(a, b, -1),
    // Upcoming first (soonest), past events after them.
    eventDate: (a, b) => {
      const ta = new Date(a.eventAt ?? 0).getTime();
      const tb = new Date(b.eventAt ?? 0).getTime();
      const pa = ta < c.now;
      const pb = tb < c.now;
      if (pa !== pb) return pa ? 1 : -1;
      return pa ? tb - ta : ta - tb;
    },
  };
  return items.slice().sort(cmp[sort] ?? cmp.relevance);
}

export interface SearchResult {
  items: SearchItem[];
  counts: Record<SearchType, number>;
  /** Candidates of the current type before type-specific filters — for building filter options. */
  pool: SearchItem[];
}

export function runSearch(d: SeedData, f: Filters, opts: { me: string | null; country: CountryCode; currency: CurrencyCode }): SearchResult {
  const c: Ctx = { d, me: opts.me, myCountry: opts.country, myCurrency: opts.currency, now: Date.now() };
  const q = f.q.trim();
  const general = index(c, q).filter((it) => passGeneral(it, f, c));
  const counts = Object.fromEntries(SEARCH_TYPES.map((t) => [t, 0])) as Record<SearchType, number>;
  general.forEach((it) => {
    counts[it.type] += 1;
    counts.all += 1;
  });
  const pool = f.type === "all" ? general : general.filter((it) => it.type === f.type);
  const filtered = f.type === "all" ? pool : pool.filter((it) => passSpecific(it, f, c));
  const sort = SORTS_BY_TYPE[f.type].includes(f.sort) ? f.sort : "relevance";
  return { items: sortItems(filtered, sort, c, !!q), counts, pool };
}

/** Reads filters from URL params, dropping ones that don't apply to the chosen type. */
export function parseFilters(sp: URLSearchParams): Filters {
  const type = (SEARCH_TYPES as readonly string[]).includes(sp.get("type") ?? "") ? (sp.get("type") as SearchType) : "all";
  const sortRaw = sp.get("sort") as SortKey;
  const f: Filters = { q: sp.get("q") ?? "", type, sort: SORTS_BY_TYPE[type].includes(sortRaw) ? sortRaw : "relevance" };
  for (const k of allowedFilters(type)) {
    const v = sp.get(k);
    if (v) f[k] = v;
  }
  if (!f.cur) {
    delete f.pmin;
    delete f.pmax;
  }
  return f;
}

export function filtersToQuery(f: Filters): string {
  const sp = new URLSearchParams();
  if (f.q) sp.set("q", f.q);
  if (f.type !== "all") sp.set("type", f.type);
  if (f.sort !== "relevance") sp.set("sort", f.sort);
  for (const k of allowedFilters(f.type)) if (f[k]) sp.set(k, f[k]!);
  return sp.toString();
}
