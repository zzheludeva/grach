"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Compass, Plus, Shuffle } from "lucide-react";
import { useStore } from "@/lib/store";
import { useI18n } from "@/i18n/I18nProvider";
import { buildFeed, unexploredCategories, type FeedMode } from "@/lib/recommend";
import { CATEGORIES, categoryColor } from "@/i18n/content";
import { Chip, EmptyState, Tabs, Avatar, Card } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { PostCard } from "@/components/feed/PostCard";
import { useShell } from "@/components/shell/AppShell";
import type { CategoryId } from "@/lib/types";
import { FollowButton } from "@/components/common/actions";
import { followersOf } from "@/lib/selectors";

export default function FeedPage() {
  const { state, me, meId, actions } = useStore();
  const { t, cat, num, date } = useI18n();
  const { openComposer } = useShell();
  const d = state!.data;
  const [mode, setMode] = useState<FeedMode>("foryou");
  const [category, setCategory] = useState<CategoryId | null>(null);
  const [limit, setLimit] = useState(12);

  const feed = useMemo(() => buildFeed(d, meId, mode, category), [d, meId, mode, category]);
  const unexplored = useMemo(() => unexploredCategories(d, meId), [d, meId]);
  const suggested = useMemo(() => {
    const following = new Set(d.follows.filter((f) => f.followerId === meId).map((f) => f.followingId));
    return d.users
      .filter((u) => u.id !== meId && !following.has(u.id) && u.status !== "hobbyist")
      .sort((a, b) => followersOf(d, b.id).length - followersOf(d, a.id).length)
      .slice(0, 4);
  }, [d, meId]);

  const pickCategory = (c: CategoryId | null) => {
    setCategory(c);
    setLimit(12);
    if (c) actions.viewCategory(c);
  };

  return (
    <div className="grid gap-8 xl:grid-cols-[1fr_300px]">
      <div className="min-w-0">
        <section className="relative mb-6 overflow-hidden rounded-3xl bg-ink px-5 py-6 text-white sm:px-8 sm:py-8">
          <div className="pointer-events-none absolute -end-6 -top-6 hidden grid-cols-4 gap-1.5 opacity-90 sm:grid" aria-hidden>
            {["#f66483", "#ff9f00", "#30b8b2", "#be6334", "#ff9f00", "#30b8b2", "#f66483", "#fff", "#30b8b2", "#be6334", "#fff", "#f66483"].map((c, i) => (
              <span key={i} className="size-9 rounded-[6px]" style={{ background: c, transform: `rotate(${(i % 3) * 4 - 4}deg)`, opacity: 0.85 - (i % 4) * 0.12 }} />
            ))}
          </div>
          <p className="text-sm font-semibold text-saffron">{t("feed.hello", { name: me!.name.split(" ")[0] })}</p>
          <h1 className="mt-1 max-w-lg font-display text-3xl leading-tight sm:text-4xl">{t("feed.heroTitle")}</h1>
          <p className="mt-2 max-w-md text-sm text-white/75">{t("feed.heroText")}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button variant="accent" onClick={() => openComposer()}>
              <Plus className="size-4" /> {t("feed.share")}
            </Button>
            <Link href="/studio" className="inline-flex h-10 items-center gap-2 rounded-xl bg-white/10 px-4 text-sm font-semibold text-white hover:bg-white/20">
              <Shuffle className="size-4" /> {t("feed.findIdea")}
            </Link>
          </div>
        </section>

        <div className="sticky top-16 z-20 lg:top-28 -mx-4 mb-5 space-y-3 bg-bg/90 px-4 py-3 backdrop-blur-md sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          <Tabs
            value={mode}
            onChange={(m) => {
              setMode(m);
              setLimit(12);
            }}
            items={[
              { value: "foryou", label: t("feed.forYou") },
              { value: "following", label: t("feed.following") },
              { value: "popular", label: t("feed.popular") },
              { value: "new", label: t("feed.new") },
            ]}
            className="w-fit"
          />
          <div className="scrollbar-none -mx-1 flex gap-2 overflow-x-auto px-1 pb-0.5">
            <Chip active={!category} onClick={() => pickCategory(null)}>
              {t("feed.all")}
            </Chip>
            {CATEGORIES.map((c) => (
              <Chip key={c.id} active={category === c.id} color={c.color} onClick={() => pickCategory(c.id)}>
                {cat(c.id)}
              </Chip>
            ))}
          </div>
        </div>

        {mode === "foryou" && !category && (
          <p className="mb-4 flex items-start gap-2 text-[13px] text-muted">
            <Compass className="mt-0.5 size-4 shrink-0 text-teal" />
            {t("feed.algoNote")}
          </p>
        )}

        {feed.length === 0 ? (
          <EmptyState
            title={mode === "following" ? t("feed.emptyFollowingTitle") : t("feed.emptyTitle")}
            text={mode === "following" ? t("feed.emptyFollowingText") : t("feed.emptyText")}
            action={
              mode === "following" ? (
                <Button onClick={() => setMode("popular")}>{t("feed.popular")}</Button>
              ) : (
                <Button onClick={() => pickCategory(null)}>{t("feed.resetFilter")}</Button>
              )
            }
          />
        ) : (
          <>
            <div className="masonry columns-1 sm:columns-2 2xl:columns-3">
              {feed.slice(0, limit).map((e, i) => (
                <PostCard key={e.post.id} post={e.post} discovery={e.discovery} priority={i < 2} />
              ))}
            </div>
            {limit < feed.length && (
              <div className="mt-4 flex justify-center">
                <Button variant="secondary" onClick={() => setLimit((l) => l + 9)}>
                  {t("feed.more")}
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      <aside className="hidden space-y-6 xl:block">
        {unexplored.length > 0 && (
          <Card className="overflow-hidden">
            <div className="grout px-4 py-4 text-white">
              <p className="flex items-center gap-2 text-sm font-bold">
                <Compass className="size-4 text-saffron" /> {t("feed.newDirections")}
              </p>
              <p className="mt-1 text-xs text-white/70">{t("feed.newDirectionsText")}</p>
            </div>
            <div className="space-y-2 p-3">
              {unexplored.slice(0, 4).map((c) => {
                const sample = d.posts.find((p) => p.category === c)!;
                return (
                  <button key={c} onClick={() => pickCategory(c)} className="flex w-full items-center gap-3 rounded-xl p-1.5 text-start hover:bg-ink-soft/60">
                    <Image src={sample.images[0]} alt="" width={48} height={48} className="size-12 rounded-lg object-cover" />
                    <span className="min-w-0">
                      <span className="flex items-center gap-1.5 text-sm font-bold text-ink">
                        <span className="size-2 rotate-45 rounded-[1px]" style={{ background: categoryColor(c) }} />
                        {cat(c)}
                      </span>
                      <span className="block text-xs text-muted">{t("feed.postsCount", { count: d.posts.filter((p) => p.category === c).length })}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </Card>
        )}
        {suggested.length > 0 && (
          <Card className="p-4">
            <p className="mb-3 text-sm font-bold text-ink">{t("feed.whoToFollow")}</p>
            <div className="space-y-3">
              {suggested.map((u) => (
                <div key={u.id} className="flex items-center gap-2.5">
                  <Avatar name={u.name} color={u.avatarColor} size={36} href={`/profile/${u.username}`} />
                  <Link href={`/profile/${u.username}`} className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-ink hover:underline">{u.name}</span>
                    <span className="block truncate text-xs text-muted">
                      {u.interests.slice(0, 2).map(cat).join(" · ")} · {num(followersOf(d, u.id).length)}
                    </span>
                  </Link>
                  <FollowButton userId={u.id} className="h-7 px-2.5 text-xs" />
                </div>
              ))}
            </div>
          </Card>
        )}
        <Card className="p-4">
          <p className="text-sm font-bold text-ink">{t("feed.upcoming")}</p>
          <div className="mt-3 space-y-3">
            {d.sessions
              .filter((s) => s.status === "scheduled" && new Date(s.startsAt).getTime() > Date.now() && d.workshops.some((w) => w.id === s.workshopId && w.status === "published"))
              .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
              .filter((s, i, arr) => arr.findIndex((x) => x.workshopId === s.workshopId) === i)
              .slice(0, 3)
              .map((s) => ({ s, w: d.workshops.find((w) => w.id === s.workshopId)! }))
              .map(({ s, w }) => (
                <Link key={s.id} href={`/learn/workshop/${w.id}?session=${s.id}`} className="flex gap-3 rounded-xl hover:bg-ink-soft/50">
                  <Image src={w.cover} alt="" width={56} height={56} className="size-14 shrink-0 rounded-lg object-cover" />
                  <span className="min-w-0 py-0.5">
                    <span className="line-clamp-2 text-[13px] font-bold leading-snug text-ink">{w.title}</span>
                    <span className="block text-xs text-muted">{date(s.startsAt, "medium")} · {t(`workshop.${w.format}`)}{s.city ? ` · ${s.city}` : ""}</span>
                  </span>
                </Link>
              ))}
          </div>
        </Card>
      </aside>
    </div>
  );
}
