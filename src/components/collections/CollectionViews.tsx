"use client";
import Image from "next/image";
import Link from "next/link";
import { Lock } from "lucide-react";
import { useStore } from "@/lib/store";
import { useI18n } from "@/i18n/I18nProvider";
import type { Collection, FavoriteType } from "@/lib/types";
import { itemVisible } from "@/lib/access";
import { PostCard } from "@/components/feed/PostCard";
import { ProductCard, TutorialCard, WorkshopCard } from "@/components/common/cards";
import { VisibilityBadge } from "@/components/common/Visibility";
import { cn } from "@/lib/utils";

/** Cover image of a referenced object (for collection previews). */
export function useItemImage() {
  const { state } = useStore();
  const d = state!.data;
  return (type: FavoriteType, id: string): string | undefined => {
    if (type === "post") return d.posts.find((x) => x.id === id)?.images[0];
    if (type === "product") return d.products.find((x) => x.id === id)?.images[0];
    if (type === "tutorial") return d.tutorials.find((x) => x.id === id)?.cover;
    return d.workshops.find((x) => x.id === id)?.cover;
  };
}

/** Collection tile: mosaic of the first three visible items, title, count, visibility. */
export function CollectionCard({ c, showVisibility = true }: { c: Collection; showVisibility?: boolean }) {
  const { state, meId } = useStore();
  const { t } = useI18n();
  const img = useItemImage();
  const visible = c.items.filter((i) => itemVisible(state!.data, i.type, i.id, meId));
  const covers = visible.map((i) => img(i.type, i.id)).filter(Boolean).slice(0, 3) as string[];
  return (
    <Link href={`/collections/${c.id}`} className="group block overflow-hidden rounded-[var(--radius-tile)] border border-line bg-surface shadow-[var(--shadow-tile)] transition-colors hover:border-ink/30">
      <div className="grid aspect-[16/9] grid-cols-3 grid-rows-2 gap-0.5 bg-line/50">
        {[0, 1, 2].map((k) => (
          <div key={k} className={cn("relative overflow-hidden bg-ink-soft/60", k === 0 ? "col-span-2 row-span-2" : "")}>
            {covers[k] && <Image src={covers[k]} alt="" fill sizes="(max-width: 640px) 66vw, 260px" unoptimized={covers[k].startsWith("data:")} className="object-cover transition-transform duration-500 group-hover:scale-[1.03]" />}
          </div>
        ))}
      </div>
      <div className="p-3.5">
        <div className="flex items-start justify-between gap-2">
          <p className="line-clamp-2 font-bold leading-snug text-ink">{c.title}</p>
          {showVisibility && <VisibilityBadge value={c.visibility} />}
        </div>
        {c.description && <p className="mt-1 line-clamp-2 text-[13px] text-muted">{c.description}</p>}
        <p className="mt-1.5 text-xs font-semibold text-faint">{t("colx.items", { count: visible.length })}</p>
      </div>
    </Link>
  );
}

/** One referenced object in its own card style; restricted or deleted objects get a quiet placeholder. */
export function CollectionItem({ type, id }: { type: FavoriteType; id: string }) {
  const { state, meId } = useStore();
  const { t } = useI18n();
  const d = state!.data;
  const exists =
    type === "post" ? d.posts.some((x) => x.id === id) : type === "product" ? d.products.some((x) => x.id === id) : type === "tutorial" ? d.tutorials.some((x) => x.id === id) : d.workshops.some((x) => x.id === id);
  if (!exists || !itemVisible(d, type, id, meId)) {
    return (
      <div className="flex min-h-40 flex-col items-center justify-center gap-2 rounded-[var(--radius-tile)] border border-dashed border-line bg-surface p-5 text-center text-sm text-muted">
        <Lock className="size-5" />
        {exists ? t("colx.itemRestricted") : t("colx.itemGone")}
      </div>
    );
  }
  if (type === "post") return <PostCard post={d.posts.find((x) => x.id === id)!} />;
  if (type === "product") return <ProductCard p={d.products.find((x) => x.id === id)!} />;
  if (type === "tutorial") return <TutorialCard tut={d.tutorials.find((x) => x.id === id)!} />;
  return <WorkshopCard w={d.workshops.find((x) => x.id === id)!} />;
}
