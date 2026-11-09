"use client";
import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock, Search, SlidersHorizontal, X } from "lucide-react";
import { useStore } from "@/lib/store";
import { useI18n } from "@/i18n/I18nProvider";
import { CATEGORIES, TECHNIQUES, techniqueName } from "@/i18n/content";
import { Avatar, Badge, Chip, EmptyState, Input, Select } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { PostCard } from "@/components/feed/PostCard";
import { ProductCard, TutorialCard, WorkshopCard, Price } from "@/components/common/cards";
import { FollowButton } from "@/components/common/actions";
import { CURRENCIES } from "@/components/seller/ProductForm";
import { PROJECT_STATUSES, PROJECT_TONE } from "@/lib/projects";
import {
  FILTERS_BY_TYPE, SEARCH_TYPES, SORTS_BY_TYPE, allowedFilters, filtersToQuery, parseFilters, runSearch,
  type FilterKey, type Filters, type SearchItem, type SearchType, type SortKey,
} from "@/lib/search";
import type { Post, Product, Project, Tutorial, User, Workshop, CategoryId, PostKind } from "@/lib/types";
import { cn } from "@/lib/utils";

const POST_KINDS: PostKind[] = ["finished", "process", "tools", "video", "tip", "experiment"];
const LABEL_KEY: Partial<Record<FilterKey, string>> = { pst: "projectStatus", lfmt: "learnFormat", fmt: "format", kind: "postKind", tech: "technique", cat: "category", from: "shipsFrom", cur: "currency" };

export default function SearchPage() {
  const sp = useSearchParams();
  const router = useRouter();
  const { state, meId, settings } = useStore();
  const i18n = useI18n();
  const { t, cat, langName, locale } = i18n;
  const d = state!.data;
  const f = useMemo(() => parseFilters(new URLSearchParams(sp.toString())), [sp]);
  const [q, setQ] = useState(f.q);
  const [mobileOpen, setMobileOpen] = useState(false);
  useEffect(() => setQ(f.q), [f.q]);

  const res = useMemo(() => runSearch(d, f, { me: meId, country: settings.country, currency: settings.currency }), [d, f, meId, settings.country, settings.currency]);
  const hasAny = !!f.q.trim() || f.type !== "all" || allowedFilters(f.type).some((k) => f[k]);

  /** Every change keeps the query and the other filters; switching type drops filters that don't apply. */
  const apply = (patch: Partial<Filters>) => {
    const next: Filters = { ...f, ...patch };
    if (patch.type && patch.type !== f.type) {
      for (const k of FILTERS_BY_TYPE[f.type]) delete next[k as FilterKey];
      if (!SORTS_BY_TYPE[patch.type].includes(next.sort)) next.sort = "relevance";
    }
    const qs = filtersToQuery(next);
    router.replace(qs ? `/search?${qs}` : "/search", { scroll: false });
  };
  // A price range only makes sense within one currency, so clearing the currency clears the range.
  const setFilter = (k: FilterKey, v: string) =>
    apply({ [k]: v || undefined, ...(k === "cur" && !v ? { pmin: undefined, pmax: undefined } : {}) } as Partial<Filters>);
  const resetFilters = () => {
    const qs = filtersToQuery({ q: f.q, type: f.type, sort: f.sort });
    router.replace(qs ? `/search?${qs}` : "/search", { scroll: false });
  };

  const countryLabel = (c: string) => (i18n.has(`countryName.${c}`) ? t(`countryName.${c}`) : c);
  const userName = (id: string) => d.users.find((u) => u.id === id)?.name ?? id;
  const valueLabel = (k: FilterKey, v: string): string => {
    switch (k) {
      case "cat": return cat(v as CategoryId);
      case "date": return t(`sx.date.${v}`);
      case "lang": return langName(v);
      case "country": case "from": return countryLabel(v);
      case "kind": return t(`postKind.${v}`);
      case "tech": return techniqueName(v, locale);
      case "author": return userName(v);
      case "mat": return v.split(",").join(", ");
      case "cur": return v;
      case "pmin": return `${t("sx.f.priceFrom")} ${v} ${f.cur ?? ""}`;
      case "pmax": return `${t("sx.f.priceTo")} ${v} ${f.cur ?? ""}`;
      case "ship": return t("sx.f.shipsToMe", { country: t(`countries.${settings.country}`) });
      case "stock": return t("sx.f.inStock");
      case "mto": return t("sx.f.madeToOrder");
      case "fmt": return t(`workshop.${v}`);
      case "city": return v;
      case "when": return t(`sx.when.${v}`);
      case "cost": return t(`sx.cost.${v}`);
      case "seats": return t("sx.f.seats");
      case "level": return t(`level.${v}`);
      case "lfmt": return t(`sx.learnFormat.${v}`);
      case "pst": return t(`prj.status.${v}`);
    }
  };
  const active = allowedFilters(f.type).filter((k) => f[k]);
  const visibleSorts = SORTS_BY_TYPE[f.type];

  const panel = <FilterPanel f={f} pool={res.pool} setFilter={setFilter} countryLabel={countryLabel} userName={userName} />;

  return (
    <div>
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          apply({ q: q.trim() });
        }}
        className="relative mb-4"
      >
        <Search className="pointer-events-none absolute start-4 top-1/2 size-5 -translate-y-1/2 text-faint" />
        <Input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("search.placeholder")} aria-label={t("search.placeholder")} className="h-14 rounded-2xl ps-12 pe-24 text-base" />
        <Button type="submit" className="absolute end-2 top-1/2 -translate-y-1/2">{t("nav.search")}</Button>
      </form>

      <div className="scrollbar-none -mx-4 mb-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0" role="tablist" aria-label={t("sx.f.type")}>
        {SEARCH_TYPES.map((ty) => (
          <Chip key={ty} role="tab" aria-selected={f.type === ty} active={f.type === ty} onClick={() => apply({ type: ty })}>
            {t(`sx.type.${ty}`)}
            <span className={cn("nums rounded-md px-1.5 text-[11px]", f.type === ty ? "bg-white/20" : "bg-ink-soft")}>{res.counts[ty]}</span>
          </Chip>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <aside className="hidden lg:block" aria-label={t("sx.filters")}>
          <div className="sticky top-32 max-h-[calc(100dvh-9rem)] overflow-y-auto pe-1">{panel}</div>
        </aside>

        <section aria-live="polite" className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <p className="me-auto text-sm font-semibold text-ink">{t("sx.found", { count: res.items.length })}</p>
            <Button variant="secondary" size="sm" className="lg:hidden" onClick={() => setMobileOpen(true)}>
              <SlidersHorizontal className="size-4" /> {t("sx.filters")}
              {active.length > 0 && <span className="nums rounded-md bg-ink px-1.5 text-[11px] text-white">{active.length}</span>}
            </Button>
            <label className="flex items-center gap-2 text-sm text-muted">
              <span className="hidden sm:inline">{t("sx.sort.label")}</span>
              <Select value={f.sort} onChange={(e) => apply({ sort: e.target.value as SortKey })} className="h-9 w-auto text-sm" aria-label={t("sx.sort.label")}>
                {visibleSorts.map((s) => <option key={s} value={s}>{t(`sx.sort.${s}`)}</option>)}
              </Select>
            </label>
          </div>

          {active.length > 0 && (
            <div className="mb-4 flex flex-wrap items-center gap-1.5" aria-label={t("sx.activeFilters")}>
              {active.map((k) => {
                const label = valueLabel(k, f[k]!);
                return (
                  <span key={k} className="inline-flex items-center gap-1 rounded-full bg-ink px-3 py-1 text-xs font-semibold text-white">
                    {label}
                    <button onClick={() => setFilter(k, "")} className="-me-1 rounded-full p-0.5 hover:bg-white/20" aria-label={t("sx.remove", { label })}>
                      <X className="size-3" />
                    </button>
                  </span>
                );
              })}
              <button onClick={resetFilters} className="ms-1 text-xs font-semibold text-rust hover:underline">{t("sx.resetAll")}</button>
            </div>
          )}
          {(f.sort === "priceAsc" || f.sort === "priceDesc") && !f.cur && <p className="mb-3 text-xs text-faint">{t("sx.mixedCurrency")}</p>}
          {f.type === "project" && <p className="mb-3 flex items-center gap-1.5 text-xs text-muted"><Lock className="size-3.5" /> {t("sx.privateNote")}</p>}

          {!hasAny ? (
            <div>
              <p className="mb-4 text-sm text-muted">{t("sx.start")}</p>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((c) => (
                  <Chip key={c.id} color={c.color} onClick={() => setFilter("cat", c.id)}>{cat(c.id)}</Chip>
                ))}
              </div>
            </div>
          ) : res.items.length === 0 ? (
            <EmptyState
              icon={<Search className="size-6" />}
              title={t("sx.empty")}
              text={f.q ? t("sx.emptyQuery", { q: f.q }) : t("sx.emptyText")}
              action={active.length > 0 ? <Button variant="secondary" onClick={resetFilters}>{t("sx.resetAll")}</Button> : undefined}
            />
          ) : (
            <Results type={f.type} items={res.items} />
          )}
        </section>
      </div>

      <Modal
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        title={t("sx.filters")}
        footer={
          <>
            {active.length > 0 && <Button variant="ghost" onClick={resetFilters}>{t("sx.resetAll")}</Button>}
            <Button onClick={() => setMobileOpen(false)}>{t("sx.show", { count: res.items.length })}</Button>
          </>
        }
      >
        <div className="p-5">{panel}</div>
      </Modal>
    </div>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-line py-3 first:pt-0 last:border-0">
      <p className="mb-2 text-xs font-bold uppercase tracking-wider text-faint">{label}</p>
      {children}
    </div>
  );
}

function Toggle({ label, on, onChange }: { label: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 py-1 text-sm text-ink">
      <input type="checkbox" checked={on} onChange={(e) => onChange(e.target.checked)} className="size-4 accent-[var(--color-ink)]" />
      {label}
    </label>
  );
}

/** Only filters relevant to the selected content type are rendered. */
function FilterPanel({
  f, pool, setFilter, countryLabel, userName,
}: {
  f: Filters;
  pool: SearchItem[];
  setFilter: (k: FilterKey, v: string) => void;
  countryLabel: (c: string) => string;
  userName: (id: string) => string;
}) {
  const { t, cat, langName, locale } = useI18n();
  const { settings, state } = useStore();
  const d = state!.data;
  const uniq = (xs: (string | undefined)[]) => [...new Set(xs.filter((x): x is string => !!x))];
  const langs = uniq(pool.map((i) => i.lang));
  const countries = uniq(pool.map((i) => i.country));
  const techIds = uniq(pool.map((i) => i.tech));
  const techs = TECHNIQUES.filter((x) => techIds.includes(x.id) && (!f.cat || x.cats.includes(f.cat as CategoryId)));
  const type = f.type;
  const sel = (k: FilterKey, options: { v: string; l: string }[], anyLabel = t("sx.anyOption")) => (
    <Select value={f[k] ?? ""} onChange={(e) => setFilter(k, e.target.value)} className="h-10 text-sm" aria-label={t(`sx.f.${LABEL_KEY[k] ?? k}`)}>
      <option value="">{anyLabel}</option>
      {options.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
    </Select>
  );
  const products = pool.filter((i) => i.type === "product").map((i) => i.ref as Product);
  const matCounts = new Map<string, number>();
  products.forEach((p) => p.materials.forEach((m) => matCounts.set(m, (matCounts.get(m) ?? 0) + 1)));
  const topMats = [...matCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([m]) => m);
  const selMats = (f.mat ?? "").split(",").filter(Boolean);
  const cities = uniq(pool.filter((i) => i.type === "workshop").flatMap((i) => d.sessions.filter((x) => x.workshopId === i.id && x.status === "scheduled").map((x) => x.city)));
  const authors = uniq(pool.filter((i) => i.type === "post").map((i) => (i.ref as Post).authorId));
  const shipFrom = uniq(products.map((p) => p.shipsFrom));

  return (
    <div className="text-sm">
      <Group label={t("sx.f.category")}>{sel("cat", CATEGORIES.map((c) => ({ v: c.id, l: cat(c.id) })), t("common.allCategories"))}</Group>
      {type !== "project" && (
        <Group label={t("sx.f.date")}>
          {sel("date", (["d7", "d30", "y1"] as const).map((v) => ({ v, l: t(`sx.date.${v}`) })), t("sx.date.any"))}
        </Group>
      )}
      {type !== "project" && langs.length > 0 && <Group label={t("sx.f.lang")}>{sel("lang", langs.map((v) => ({ v, l: langName(v) })))}</Group>}
      {type !== "project" && countries.length > 0 && <Group label={t("sx.f.country")}>{sel("country", countries.map((v) => ({ v, l: countryLabel(v) })))}</Group>}

      {type === "post" && (
        <>
          <Group label={t("sx.f.postKind")}>{sel("kind", POST_KINDS.map((v) => ({ v, l: t(`postKind.${v}`) })))}</Group>
          {techs.length > 0 && <Group label={t("sx.f.technique")}>{sel("tech", techs.map((x) => ({ v: x.id, l: x.name[locale] })))}</Group>}
          <Group label={t("sx.f.author")}>{sel("author", authors.map((v) => ({ v, l: userName(v) })).sort((a, b) => a.l.localeCompare(b.l)))}</Group>
        </>
      )}

      {type === "product" && (
        <>
          {techs.length > 0 && <Group label={t("sx.f.technique")}>{sel("tech", techs.map((x) => ({ v: x.id, l: x.name[locale] })))}</Group>}
          {topMats.length > 0 && (
            <Group label={t("sx.f.materials")}>
              <div className="flex flex-wrap gap-1.5">
                {topMats.map((m) => {
                  const on = selMats.includes(m);
                  return (
                    <button
                      key={m}
                      type="button"
                      aria-pressed={on}
                      onClick={() => setFilter("mat", (on ? selMats.filter((x) => x !== m) : [...selMats, m]).join(","))}
                      className={cn("rounded-full border px-2.5 py-1 text-xs font-semibold", on ? "border-ink bg-ink text-white" : "border-line bg-surface text-ink hover:border-ink/40")}
                    >
                      {m}
                    </button>
                  );
                })}
              </div>
            </Group>
          )}
          <Group label={t("sx.f.price")}>
            {sel("cur", CURRENCIES.map((c) => ({ v: c, l: `${c} — ${t(`currencies.${c}`)}` })), t("sx.f.currency"))}
            <div className="mt-2 flex items-center gap-2">
              <Input type="number" min={0} inputMode="decimal" disabled={!f.cur} value={f.pmin ?? ""} onChange={(e) => setFilter("pmin", e.target.value)} placeholder={t("sx.f.priceFrom")} aria-label={t("sx.f.priceFrom")} className="h-10 text-sm" />
              <span className="text-faint">—</span>
              <Input type="number" min={0} inputMode="decimal" disabled={!f.cur} value={f.pmax ?? ""} onChange={(e) => setFilter("pmax", e.target.value)} placeholder={t("sx.f.priceTo")} aria-label={t("sx.f.priceTo")} className="h-10 text-sm" />
            </div>
            {!f.cur && <p className="mt-1.5 text-xs text-faint">{t("sx.f.currencyNeeded")}</p>}
          </Group>
          {shipFrom.length > 0 && <Group label={t("sx.f.shipsFrom")}>{sel("from", shipFrom.map((v) => ({ v, l: countryLabel(v) })))}</Group>}
          <Group label={t("sx.f.availability")}>
            <Toggle label={t("sx.f.shipsToMe", { country: t(`countries.${settings.country}`) })} on={!!f.ship} onChange={(v) => setFilter("ship", v ? "1" : "")} />
            <Toggle label={t("sx.f.inStock")} on={!!f.stock} onChange={(v) => setFilter("stock", v ? "1" : "")} />
            <Toggle label={t("sx.f.madeToOrder")} on={!!f.mto} onChange={(v) => setFilter("mto", v ? "1" : "")} />
          </Group>
        </>
      )}

      {type === "workshop" && (
        <>
          <Group label={t("sx.f.format")}>
            <div className="flex gap-1.5">
              {(["", "online", "offline"] as const).map((v) => (
                <Chip key={v || "any"} active={(f.fmt ?? "") === v} onClick={() => setFilter("fmt", v)} className="h-8 px-3 text-xs">
                  {v ? t(`workshop.${v}`) : t("sx.anyOption")}
                </Chip>
              ))}
            </div>
          </Group>
          {cities.length > 0 && f.fmt !== "online" && <Group label={t("sx.f.city")}>{sel("city", cities.map((v) => ({ v, l: v })))}</Group>}
          <Group label={t("sx.f.when")}>{sel("when", (["week", "month", "past"] as const).map((v) => ({ v, l: t(`sx.when.${v}`) })), t("sx.when.any"))}</Group>
          <Group label={t("sx.f.cost")}>{sel("cost", (["free", "paid"] as const).map((v) => ({ v, l: t(`sx.cost.${v}`) })), t("sx.cost.any"))}</Group>
          {techs.length > 0 && <Group label={t("sx.f.technique")}>{sel("tech", techs.map((x) => ({ v: x.id, l: x.name[locale] })))}</Group>}
          {type === "workshop" && <Group label={t("sx.f.level")}>{sel("level", (["beginner", "intermediate", "advanced"] as const).map((v) => ({ v, l: t(`level.${v}`) })))}</Group>}
          <Group label={t("sx.f.seatsGroup")}>
            <Toggle label={t("sx.f.seats")} on={!!f.seats} onChange={(v) => setFilter("seats", v ? "1" : "")} />
          </Group>
        </>
      )}

      {type === "tutorial" && (
        <>
          {techs.length > 0 && <Group label={t("sx.f.technique")}>{sel("tech", techs.map((x) => ({ v: x.id, l: x.name[locale] })))}</Group>}
          <Group label={t("sx.f.level")}>{sel("level", (["beginner", "intermediate", "advanced"] as const).map((v) => ({ v, l: t(`level.${v}`) })))}</Group>
          <Group label={t("sx.f.learnFormat")}>{sel("lfmt", (["steps", "video"] as const).map((v) => ({ v, l: t(`sx.learnFormat.${v}`) })))}</Group>
          <Group label={t("sx.f.cost")}>{sel("cost", (["free", "paid"] as const).map((v) => ({ v, l: t(`sx.cost.${v}`) })), t("sx.cost.any"))}</Group>
        </>
      )}

      {type === "project" && <Group label={t("sx.f.projectStatus")}>{sel("pst", PROJECT_STATUSES.map((v) => ({ v, l: t(`prj.status.${v}`) })))}</Group>}
    </div>
  );
}

function Results({ type, items }: { type: SearchType; items: SearchItem[] }) {
  const [limit, setLimit] = useState(30);
  const { t } = useI18n();
  const { state } = useStore();
  const shown = items.slice(0, limit);
  const more = items.length > limit && (
    <div className="mt-6 flex justify-center">
      <Button variant="secondary" onClick={() => setLimit((n) => n + 30)}>{t("feed.more")}</Button>
    </div>
  );
  if (type === "product")
    return (
      <>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">{shown.map((i) => <ProductCard key={i.id} p={i.ref as Product} />)}</div>
        {more}
      </>
    );
  if (type === "workshop")
    return (
      <>
        <div className="grid gap-4 xl:grid-cols-2">{shown.map((i) => <WorkshopCard key={i.id} w={i.ref as Workshop} session={state!.data.sessions.find((x) => x.workshopId === i.id && x.startsAt === i.eventAt)} />)}</div>
        {more}
      </>
    );
  if (type === "tutorial")
    return (
      <>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{shown.map((i) => <TutorialCard key={i.id} tut={i.ref as Tutorial} />)}</div>
        {more}
      </>
    );
  if (type === "post")
    return (
      <>
        {/* masonry columns reorder visually; a single column on phones keeps the sort order readable */}
        <div className="masonry columns-1 sm:columns-2 xl:columns-3">{shown.map((i) => <PostCard key={i.id} post={i.ref as Post} />)}</div>
        {more}
      </>
    );
  return (
    <>
      <ul className="space-y-2">{shown.map((i) => <Row key={`${i.type}-${i.id}`} it={i} />)}</ul>
      {more}
    </>
  );
}

/** Uniform row for mixed results and for people/projects. */
function Row({ it }: { it: SearchItem }) {
  const { t, cat, date, relative } = useI18n();
  const { state } = useStore();
  const d = state!.data;
  let href = "#";
  let img: string | undefined;
  let meta = "";
  let extra: React.ReactNode = null;
  switch (it.type) {
    case "post": {
      const p = it.ref as Post;
      href = `/post/${p.id}`;
      img = p.images[0];
      meta = `${d.users.find((u) => u.id === p.authorId)?.name ?? ""} · ${relative(p.createdAt)}`;
      break;
    }
    case "product": {
      const p = it.ref as Product;
      href = `/market/${p.id}`;
      img = p.images[0];
      meta = d.users.find((u) => u.id === p.sellerId)?.name ?? "";
      extra = <Price value={p.price} className="text-sm font-bold text-ink" />;
      break;
    }
    case "workshop": {
      const w = it.ref as Workshop;
      href = `/learn/workshop/${w.id}`;
      img = w.cover;
      meta = `${it.eventAt ? date(it.eventAt, "datetime") : t("ws.noDates")} · ${w.format === "online" ? t("workshop.online") : w.city ?? ""}`;
      break;
    }
    case "tutorial": {
      const tu = it.ref as Tutorial;
      href = `/learn/tutorial/${tu.id}`;
      img = tu.cover;
      meta = `${t(`level.${tu.level}`)} · ${t("learn.minutes", { count: tu.durationMin })}`;
      break;
    }
    case "project": {
      const p = it.ref as Project;
      href = `/dashboard/projects/${p.id}`;
      img = p.cover ?? p.photos[0]?.src;
      meta = relative(p.updatedAt);
      extra = <Badge tone={PROJECT_TONE[p.status]}>{t(`prj.status.${p.status}`)}</Badge>;
      break;
    }
    case "user": {
      const u = it.ref as User;
      return (
        <li className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-3">
          <Avatar name={u.name} color={u.avatarColor} size={44} href={`/profile/${u.username}`} />
          <Link href={`/profile/${u.username}`} className="min-w-0 flex-1">
            <span className="flex items-center gap-2">
              <span className="truncate font-bold text-ink">{u.name}</span>
              <Badge className="shrink-0">{t("sx.type.user")}</Badge>
            </span>
            <span className="block truncate text-xs text-muted">{[u.city, ...u.interests.slice(0, 2).map(cat)].filter(Boolean).join(" · ")}</span>
          </Link>
          <FollowButton userId={u.id} />
        </li>
      );
    }
  }
  return (
    <li>
      <Link href={href} className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-2.5 transition hover:border-ink/30">
        <span className="relative size-14 shrink-0 overflow-hidden rounded-xl bg-line/50">
          {img && <Image src={img} alt="" fill sizes="56px" unoptimized={img.startsWith("data:")} className="object-cover" />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-1.5">
            <Badge>{t(`sx.type.${it.type}`)}</Badge>
            {it.cat && <span className="text-xs text-muted">{cat(it.cat)}</span>}
          </span>
          <span className="mt-0.5 block truncate font-bold text-ink">{it.title}</span>
          <span className="block truncate text-xs text-muted">{meta}</span>
        </span>
        {extra && <span className="shrink-0">{extra}</span>}
      </Link>
    </li>
  );
}
