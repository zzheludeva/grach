"use client";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { useStore } from "@/lib/store";
import { useI18n } from "@/i18n/I18nProvider";
import { CATEGORIES } from "@/i18n/content";
import { EmptyState, Input, PageHeader, Select, Tabs } from "@/components/ui/primitives";
import { ButtonLink } from "@/components/ui/button";
import { PostCard } from "@/components/feed/PostCard";
import { ProductCard, TutorialCard, WorkshopCard } from "@/components/common/cards";
import type { CategoryId, FavoriteType } from "@/lib/types";
import { norm } from "@/lib/utils";

const TYPES: FavoriteType[] = ["post", "tutorial", "product", "workshop"];
const SECTION: Record<FavoriteType, string> = { post: "/feed", tutorial: "/learn", product: "/market", workshop: "/learn?tab=workshops" };

export default function Favorites() {
  const sp = useSearchParams();
  const initial = (TYPES.includes(sp.get("tab") as FavoriteType) ? sp.get("tab") : "post") as FavoriteType;
  const { state, meId } = useStore();
  const { t, cat } = useI18n();
  const d = state!.data;
  const [tab, setTab] = useState<FavoriteType>(initial);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState<CategoryId | "">("");

  const mine = d.favorites.filter((f) => f.userId === meId);
  const counts = Object.fromEntries(TYPES.map((ty) => [ty, mine.filter((f) => f.type === ty).length])) as Record<FavoriteType, number>;

  const items = useMemo(() => {
    const ids = mine.filter((f) => f.type === tab).map((f) => f.id);
    const match = (title: string, c?: CategoryId, extra = "") => (!q || norm(`${title} ${extra}`).includes(norm(q))) && (!category || c === category);
    if (tab === "post") return d.posts.filter((p) => ids.includes(p.id) && match(p.title, p.category, p.body)).sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));
    if (tab === "tutorial") return d.tutorials.filter((x) => ids.includes(x.id) && match(x.title, x.category, x.summary));
    if (tab === "product") return d.products.filter((x) => ids.includes(x.id) && match(x.title, x.category, x.summary));
    return d.workshops.filter((x) => ids.includes(x.id) && match(x.title, x.category, x.description));
  }, [d, mine, tab, q, category]);

  return (
    <div>
      <PageHeader title={t("favorites.title")} subtitle={t("favorites.subtitle")} />
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <Tabs
          value={tab}
          onChange={(v) => {
            setTab(v);
            history.replaceState(null, "", `?tab=${v}`);
          }}
          items={TYPES.map((ty) => ({ value: ty, label: t(`favorites.tab.${ty}`), count: counts[ty] }))}
        />
        <div className="flex min-w-0 flex-1 basis-72 gap-2">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-faint" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("favorites.search")} aria-label={t("favorites.search")} className="ps-10" />
          </div>
          <Select value={category} onChange={(e) => setCategory(e.target.value as CategoryId)} aria-label={t("common.category")} className="w-40 shrink-0 sm:w-48">
            <option value="">{t("common.allCategories")}</option>
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {cat(c.id)}
              </option>
            ))}
          </Select>
        </div>
      </div>
      {items.length === 0 ? (
        counts[tab] === 0 ? (
          <EmptyState title={t(`favorites.empty.${tab}`)} text={t("favorites.emptyText")} action={<ButtonLink href={SECTION[tab]}>{t(`favorites.goTo.${tab}`)}</ButtonLink>} />
        ) : (
          <EmptyState title={t("search.nothing")} text={t("favorites.tryOther")} />
        )
      ) : tab === "post" ? (
        <div className="masonry columns-1 sm:columns-2 xl:columns-3">
          {items.map((p) => (
            <PostCard key={p.id} post={p as never} />
          ))}
        </div>
      ) : tab === "tutorial" ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((x) => (
            <TutorialCard key={x.id} tut={x as never} />
          ))}
        </div>
      ) : tab === "product" ? (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
          {items.map((x) => (
            <ProductCard key={x.id} p={x as never} />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {items.map((x) => (
            <WorkshopCard key={x.id} w={x as never} enrolled={d.enrollments.some((e) => e.userId === meId && e.workshopId === x.id)} />
          ))}
        </div>
      )}
    </div>
  );
}
