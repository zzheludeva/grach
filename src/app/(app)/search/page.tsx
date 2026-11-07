"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { useStore } from "@/lib/store";
import { useI18n } from "@/i18n/I18nProvider";
import { CATEGORIES, categorySearchTerms } from "@/i18n/content";
import { Avatar, Chip, EmptyState, Input, SectionTitle } from "@/components/ui/primitives";
import { PostCard } from "@/components/feed/PostCard";
import { ProductCard, TutorialCard, WorkshopCard } from "@/components/common/cards";
import { FollowButton } from "@/components/common/actions";
import { norm } from "@/lib/utils";
import type { CategoryId } from "@/lib/types";

export default function SearchPage() {
  const sp = useSearchParams();
  const router = useRouter();
  const { state } = useStore();
  const { t, cat } = useI18n();
  const d = state!.data;
  const [q, setQ] = useState(sp.get("q") ?? "");
  useEffect(() => {
    setQ(sp.get("q") ?? "");
  }, [sp]);
  const nq = norm(q.trim());

  const res = useMemo(() => {
    if (nq.length < 2) return null;
    // categories match by any localized name or synonym (multi-language search)
    const cats = CATEGORIES.map((c) => c.id).filter((id) => categorySearchTerms(id).some((s) => norm(s).includes(nq) || nq.includes(norm(s))));
    const hit = (s: string, c?: CategoryId) => norm(s).includes(nq) || (!!c && cats.includes(c));
    return {
      cats,
      users: d.users.filter((u) => hit(`${u.name} ${u.username} ${u.bio} ${u.skills.join(" ")} ${u.city}`)),
      posts: d.posts.filter((p) => hit(`${p.title} ${p.body} ${Object.values(p.translations ?? {}).map((x) => `${x?.title} ${x?.body}`).join(" ")}`, p.category)),
      products: d.products.filter((p) => hit(`${p.title} ${p.summary} ${p.materials.join(" ")}`, p.category)),
      tutorials: d.tutorials.filter((p) => hit(`${p.title} ${p.summary}`, p.category)),
      workshops: d.workshops.filter((p) => hit(`${p.title} ${p.description} ${p.city ?? ""}`, p.category)),
    };
  }, [d, nq]);
  const total = res ? res.users.length + res.posts.length + res.products.length + res.tutorials.length + res.workshops.length : 0;

  return (
    <div>
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          router.replace(`/search?q=${encodeURIComponent(q)}`);
        }}
        className="relative mb-6"
      >
        <Search className="pointer-events-none absolute start-4 top-1/2 size-5 -translate-y-1/2 text-faint" />
        <Input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("search.placeholder")} aria-label={t("search.placeholder")} className="h-14 rounded-2xl ps-12 text-base" />
      </form>
      {!res ? (
        <div>
          <SectionTitle>{t("search.browse")}</SectionTitle>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <Chip key={c.id} color={c.color} onClick={() => router.replace(`/search?q=${encodeURIComponent(cat(c.id))}`)}>
                {cat(c.id)}
              </Chip>
            ))}
          </div>
          <p className="mt-6 text-sm text-muted">{t("search.hint")}</p>
        </div>
      ) : total === 0 ? (
        <EmptyState title={t("search.nothing")} text={t("search.nothingText", { q })} />
      ) : (
        <div className="space-y-10">
          <p className="text-sm text-muted">{t("search.results", { count: total })}</p>
          {res.users.length > 0 && (
            <section>
              <SectionTitle>{t("search.people")}</SectionTitle>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {res.users.map((u) => (
                  <div key={u.id} className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-3">
                    <Avatar name={u.name} color={u.avatarColor} size={42} href={`/profile/${u.username}`} />
                    <Link href={`/profile/${u.username}`} className="min-w-0 flex-1">
                      <span className="block truncate font-bold text-ink">{u.name}</span>
                      <span className="block truncate text-xs text-muted">{u.interests.slice(0, 2).map(cat).join(" · ")}</span>
                    </Link>
                    <FollowButton userId={u.id} />
                  </div>
                ))}
              </div>
            </section>
          )}
          {res.posts.length > 0 && (
            <section>
              <SectionTitle>{t("search.posts")}</SectionTitle>
              <div className="masonry columns-1 sm:columns-2 xl:columns-3">
                {res.posts.slice(0, 9).map((p) => (
                  <PostCard key={p.id} post={p} />
                ))}
              </div>
            </section>
          )}
          {res.products.length > 0 && (
            <section>
              <SectionTitle>{t("search.products")}</SectionTitle>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
                {res.products.map((p) => (
                  <ProductCard key={p.id} p={p} />
                ))}
              </div>
            </section>
          )}
          {res.tutorials.length > 0 && (
            <section>
              <SectionTitle>{t("search.tutorials")}</SectionTitle>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {res.tutorials.map((x) => (
                  <TutorialCard key={x.id} tut={x} />
                ))}
              </div>
            </section>
          )}
          {res.workshops.length > 0 && (
            <section>
              <SectionTitle>{t("search.workshops")}</SectionTitle>
              <div className="grid gap-4 lg:grid-cols-2">
                {res.workshops.map((x) => (
                  <WorkshopCard key={x.id} w={x} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
