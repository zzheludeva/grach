"use client";
import { use, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Search } from "lucide-react";
import { useStore } from "@/lib/store";
import { useI18n } from "@/i18n/I18nProvider";
import { followersOf, followingOf, postsOf, userById, userByName } from "@/lib/selectors";
import { Avatar, Card, EmptyState, Input, Tabs } from "@/components/ui/primitives";
import { ButtonLink } from "@/components/ui/button";
import { FollowButton } from "@/components/common/actions";
import { norm } from "@/lib/utils";

export default function Connections({ params }: { params: Promise<{ username: string }> }) {
  const { username } = use(params);
  const sp = useSearchParams();
  const { state, meId } = useStore();
  const { t, cat } = useI18n();
  const d = state!.data;
  const user = userByName(d, decodeURIComponent(username));
  const [tab, setTab] = useState<"followers" | "following">(sp.get("tab") === "following" ? "following" : "followers");
  const [q, setQ] = useState("");
  if (!user) return <EmptyState title={t("errors.notFound")} />;
  const isMe = user.id === meId;
  const followers = followersOf(d, user.id).map((f) => userById(d, f.followerId)!).filter(Boolean);
  const following = followingOf(d, user.id).map((f) => userById(d, f.followingId)!).filter(Boolean);
  const list = (tab === "followers" ? followers : following).filter((u) => !q || norm(`${u.name} ${u.username} ${u.bio}`).includes(norm(q)));

  return (
    <div className="mx-auto max-w-3xl">
      <Link href={`/profile/${user.username}`} className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink">
        <ArrowLeft className="size-4" /> {user.name}
      </Link>
      <h1 className="mb-5 font-display text-3xl text-ink">{t("connections.title")}</h1>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Tabs
          value={tab}
          onChange={(v) => {
            setTab(v);
            history.replaceState(null, "", `?tab=${v}`);
          }}
          items={[
            { value: "followers", label: t("connections.followers"), count: followers.length },
            { value: "following", label: t("connections.following"), count: following.length },
          ]}
        />
        <div className="relative min-w-0 flex-1 basis-56">
          <Search className="pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-faint" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("connections.search")} aria-label={t("connections.search")} className="ps-10" />
        </div>
      </div>
      {list.length === 0 ? (
        <EmptyState
          title={q ? t("search.nothing") : tab === "followers" ? (isMe ? t("connections.noFollowersMe") : t("connections.noFollowers")) : isMe ? t("connections.noFollowingMe") : t("connections.noFollowing")}
          text={!q && isMe ? (tab === "followers" ? t("connections.noFollowersMeText") : t("connections.noFollowingMeText")) : undefined}
          action={!q && isMe ? <ButtonLink href="/feed">{t("nav.feed")}</ButtonLink> : undefined}
        />
      ) : (
        <Card className="divide-y divide-line">
          {list.map((u) => (
            <div key={u.id} className="flex items-center gap-3 p-3.5">
              <Avatar name={u.name} color={u.avatarColor} size={46} href={`/profile/${u.username}`} />
              <Link href={`/profile/${u.username}`} className="min-w-0 flex-1">
                <span className="block truncate font-bold text-ink hover:underline">
                  {u.name} {u.id === meId && <span className="text-xs font-semibold text-faint">({t("connections.you")})</span>}
                </span>
                <span className="block truncate text-xs text-muted">
                  @{u.username} · {u.interests.slice(0, 3).map(cat).join(", ")}
                </span>
                <span className="block text-xs text-faint">{t("profile.postsCountFull", { count: postsOf(d, u.id).length })}</span>
              </Link>
              <FollowButton userId={u.id} />
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
