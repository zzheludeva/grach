"use client";
import { use, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ExternalLink, MapPin, MessageCircle, Pencil, CalendarDays, Lightbulb, FolderKanban } from "lucide-react";
import { useStore } from "@/lib/store";
import { CollectionCard } from "@/components/collections/CollectionViews";
import { TranslatableText } from "@/components/common/Translatable";
import { useI18n } from "@/i18n/I18nProvider";
import { followersOf, followingOf, postsOf, productsOf, userByName, workshopsOf, tutorialsOf } from "@/lib/selectors";
import { Avatar, Badge, Card, EmptyState, Tabs } from "@/components/ui/primitives";
import { ButtonLink } from "@/components/ui/button";
import { Mosaic } from "@/components/ui/mosaic";
import { FollowButton } from "@/components/common/actions";
import { PostCard } from "@/components/feed/PostCard";
import { ProductCard, TutorialCard, WorkshopCard } from "@/components/common/cards";
import { categoryColor } from "@/i18n/content";
import { useShell } from "@/components/shell/AppShell";

type Tab = "posts" | "products" | "learning" | "collections" | "saved";

export default function ProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = use(params);
  const { state, meId } = useStore();
  const { t, cat, num, date } = useI18n();
  const { openComposer } = useShell();
  const d = state!.data;
  const user = userByName(d, decodeURIComponent(username));
  const [tab, setTab] = useState<Tab>("posts");
  if (!user) return <EmptyState title={t("errors.notFound")} text={t("errors.userGone")} action={<ButtonLink href="/feed">{t("nav.feed")}</ButtonLink>} />;
  const isMe = user.id === meId;
  const posts = postsOf(d, user.id);
  const products = productsOf(d, user.id);
  const workshops = workshopsOf(d, user.id);
  const tutorials = tutorialsOf(d, user.id);
  // Only public collections appear in a profile (link-only and private ones never do — also for the owner's view).
  const collections = d.collections.filter((c) => c.ownerId === user.id && c.visibility === "public");
  const ideas = isMe ? d.ideas.filter((i) => i.userId === user.id) : [];
  const followers = followersOf(d, user.id).length;
  const following = followingOf(d, user.id).length;
  const statusTone = user.status === "pro" ? "rust" : user.status === "independent" ? "info" : "neutral";

  const tabs: { value: Tab; label: string; count?: number }[] = [
    { value: "posts", label: t("profile.posts"), count: posts.length },
    { value: "products", label: t("profile.products"), count: products.length },
    { value: "learning", label: t("profile.learning"), count: workshops.length + tutorials.length },
    { value: "collections", label: t("colx.tab"), count: collections.length },
  ];
  if (isMe) tabs.push({ value: "saved", label: t("profile.projects"), count: ideas.length });

  return (
    <div>
      <div className="relative -mx-4 -mt-4 h-36 overflow-hidden sm:mx-0 sm:mt-0 sm:h-48 sm:rounded-3xl">
        <Mosaic seed={user.id} cols={20} rows={5} className="h-full w-full" />
      </div>
      <div className="relative px-1 sm:px-6">
        <div className="-mt-12 flex flex-wrap items-end gap-4 sm:-mt-14">
          <Avatar name={user.name} color={user.avatarColor} size={104} className="ring-4" />
          <div className="ms-auto flex flex-wrap gap-2 pb-1">
            {isMe ? (
              <>
                <ButtonLink href="/profile/edit" variant="secondary">
                  <Pencil className="size-4" /> {t("nav.editProfile")}
                </ButtonLink>
              </>
            ) : (
              <>
                <ButtonLink href={`/messages/${user.username}`} variant="secondary">
                  <MessageCircle className="size-4" /> {t("profile.message")}
                </ButtonLink>
                <FollowButton userId={user.id} size="md" />
              </>
            )}
          </div>
        </div>
        <div className="mt-3 grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-3xl text-ink sm:text-4xl">{user.name}</h1>
              <Badge tone={statusTone}>{t(`status.${user.status}`)}</Badge>
            </div>
            <p className="text-sm text-muted">@{user.username}</p>
            {user.bio && (
              <div className="mt-3 max-w-2xl">
                <TranslatableText text={user.bio} lang={user.contentLang} className="text-[15px] leading-relaxed text-text/90" />
              </div>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
              <span className="inline-flex items-center gap-1">
                <MapPin className="size-4" />
                {user.city}
                {user.country === "RU" || user.country === "BR" ? `, ${t(`countries.${user.country}`)}` : ""}
              </span>
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="size-4" />
                {t("profile.joined", { date: date(user.joinedAt, "long") })}
              </span>
              {user.links.map((l) => (
                <a key={l.url} href={l.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-ink hover:underline">
                  <ExternalLink className="size-3.5" /> {l.label}
                </a>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-5 text-sm">
              <span>
                <b className="nums text-ink">{num(posts.length)}</b> <span className="text-muted">{t("profile.postsCount", { count: posts.length })}</span>
              </span>
              <Link href={`/connections/${user.username}?tab=followers`} className="hover:underline">
                <b className="nums text-ink">{num(followers)}</b> <span className="text-muted">{t("profile.followersCount", { count: followers })}</span>
              </Link>
              <Link href={`/connections/${user.username}?tab=following`} className="hover:underline">
                <b className="nums text-ink">{num(following)}</b> <span className="text-muted">{t("profile.followingCount", { count: following })}</span>
              </Link>
            </div>
          </div>
          <Card className="h-fit space-y-4 p-4">
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-faint">{t("profile.interests")}</p>
              <div className="flex flex-wrap gap-1.5">
                {user.interests.map((c) => (
                  <Badge key={c}>
                    <span className="size-2 rotate-45 rounded-[1px]" style={{ background: categoryColor(c) }} />
                    {cat(c)}
                  </Badge>
                ))}
              </div>
            </div>
            {user.skills.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-faint">{t("profile.skills")}</p>
                <div className="flex flex-wrap gap-1.5" lang={user.contentLang}>
                  {user.skills.map((s) => (
                    <Badge key={s} tone="rust">
                      {s}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </div>

        <Tabs value={tab} onChange={setTab} items={tabs} className="mt-8 w-fit" />
        <div className="mt-5">
          {tab === "posts" &&
            (posts.length ? (
              <div className="masonry columns-1 sm:columns-2 xl:columns-3">
                {posts.map((p) => (
                  <PostCard key={p.id} post={p} />
                ))}
              </div>
            ) : (
              <EmptyState
                title={isMe ? t("profile.noPostsMe") : t("profile.noPosts")}
                text={isMe ? t("profile.noPostsMeText") : undefined}
                action={isMe ? <button onClick={() => openComposer()} className="inline-flex h-10 items-center rounded-xl bg-rose px-4 text-sm font-semibold text-white">{t("nav.newPost")}</button> : undefined}
              />
            ))}
          {tab === "products" &&
            (products.length ? (
              <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
                {products.map((p) => (
                  <ProductCard key={p.id} p={p} />
                ))}
              </div>
            ) : (
              <EmptyState title={t("profile.noProducts")} text={isMe ? t("profile.noProductsMe") : undefined} action={isMe ? <ButtonLink href="/dashboard">{t("nav.dashboard")}</ButtonLink> : undefined} />
            ))}
          {tab === "learning" &&
            (workshops.length + tutorials.length ? (
              <div className="space-y-6">
                {workshops.length > 0 && (
                  <div className="grid gap-4 lg:grid-cols-2">
                    {workshops.map((w) => (
                      <WorkshopCard key={w.id} w={w} />
                    ))}
                  </div>
                )}
                {tutorials.length > 0 && (
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {tutorials.map((tu) => (
                      <TutorialCard key={tu.id} tut={tu} />
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <EmptyState title={t("profile.noLearning")} />
            ))}
          {tab === "collections" &&
            (collections.length ? (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {collections.map((c) => <CollectionCard key={c.id} c={c} showVisibility={false} />)}
              </div>
            ) : (
              <EmptyState title={isMe ? t("colx.profileEmptyMe") : t("colx.profileEmpty")} text={isMe ? t("colx.profileEmptyMeText") : undefined} />
            ))}
          {tab === "saved" &&
            (ideas.length ? (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {ideas.map((i) => (
                  <Card key={i.id} className="p-4">
                    <div className="mb-2 flex items-center gap-2">
                      {i.isProject ? <FolderKanban className="size-4 text-rust" /> : <Lightbulb className="size-4 text-saffron" />}
                      <Badge tone={i.isProject ? "rust" : "warn"}>{i.isProject ? t("studio.project") : t("studio.idea")}</Badge>
                    </div>
                    {i.projectId ? (
                      <Link href={`/dashboard/projects/${i.projectId}`} className="font-bold text-ink hover:underline">{i.title}</Link>
                    ) : (
                      <p className="font-bold text-ink">{i.title}</p>
                    )}
                    <p className="mt-1 text-sm text-muted">{i.text}</p>
                  </Card>
                ))}
              </div>
            ) : (
              <EmptyState title={t("profile.noProjects")} action={<ButtonLink href="/studio">{t("nav.studio")}</ButtonLink>} />
            ))}
        </div>
      </div>
    </div>
  );
}
