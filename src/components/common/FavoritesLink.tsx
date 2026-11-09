"use client";
import Link from "next/link";
import { Bookmark } from "lucide-react";
import { useStore } from "@/lib/store";
import { useI18n } from "@/i18n/I18nProvider";
import type { FavoriteType } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Quiet shortcut from a section to the matching tab of the one shared Favorites list
 * (posts from Inspiration, products from the Marketplace, tutorials or workshops from Learning).
 */
export function FavoritesLink({ type, className, compact = false }: { type: FavoriteType; className?: string; compact?: boolean }) {
  const { state, meId } = useStore();
  const { t } = useI18n();
  const count = state?.data.favorites.filter((f) => f.userId === meId && f.type === type).length ?? 0;
  return (
    <Link
      href={`/favorites?tab=${type}`}
      aria-label={`${t(`favx.${type}`)}: ${count}`}
      className={cn(
        "inline-flex min-h-10 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-ink ring-1 ring-line transition-colors hover:bg-ink-soft/60",
        className,
      )}
    >
      <Bookmark className="size-4 text-rust" />
      <span className={cn(compact && "hidden sm:inline")}>{t(`favx.${type}`)}</span>
      <span className="nums rounded-md bg-ink-soft px-1.5 text-[11px]">{count}</span>
    </Link>
  );
}
