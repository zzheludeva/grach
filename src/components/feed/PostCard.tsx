"use client";
import Link from "next/link";
import Image from "next/image";
import { MessageSquare, Play, Compass } from "lucide-react";
import { useStore } from "@/lib/store";
import { useI18n } from "@/i18n/I18nProvider";
import { commentsOf, userById } from "@/lib/selectors";
import type { Post } from "@/lib/types";
import { Avatar, Badge } from "@/components/ui/primitives";
import { FollowButton, LikeButton, SaveButton } from "@/components/common/actions";
import { categoryColor } from "@/i18n/content";
import { useTranslation } from "@/components/common/Translatable";
import { cn } from "@/lib/utils";

export function PostCard({ post, discovery, priority }: { post: Post; discovery?: boolean; priority?: boolean }) {
  const { state } = useStore();
  const { t, cat, relative, num } = useI18n();
  const d = state!.data;
  const author = userById(d, post.authorId);
  const tr = useTranslation(post.lang, post.translations);
  if (!author) return null;
  const title = tr.on ? tr.tr!.title : post.title;
  const body = tr.on ? tr.tr!.body : post.body;
  const cc = commentsOf(d, post.id).length;
  return (
    <article className={cn("group animate-fade-up overflow-hidden rounded-[var(--radius-tile)] border bg-surface shadow-[var(--shadow-tile)]", discovery ? "border-teal/60 ring-2 ring-teal/20" : "border-line")}>
      {discovery && (
        <div className="flex items-center gap-2 bg-teal-soft px-3.5 py-2 text-[12px] font-bold text-ink">
          <Compass className="size-4 text-teal" /> {t("feed.discoveryBadge")}
        </div>
      )}
      <Link href={`/post/${post.id}`} className="relative block overflow-hidden bg-line/40" aria-label={title}>
        <Image
          src={post.images[0]}
          alt={title}
          width={600}
          height={600}
          priority={priority}
          unoptimized={post.images[0].startsWith("data:")}
          sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
          className="h-auto w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        />
        <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-2.5">
          <span className="flex min-w-0 flex-wrap gap-1.5">
            {post.category && (
              <Badge tone="glass">
                <span className="size-2 rotate-45 rounded-[1px]" style={{ background: categoryColor(post.category) }} />
                {cat(post.category)}
              </Badge>
            )}
            {post.kind !== "finished" && <Badge tone="glass">{t(`postKind.${post.kind}`)}</Badge>}
          </span>
          <SaveButton type="post" id={post.id} variant="glass" />
        </div>
        {post.kind === "video" && (
          <span className="absolute bottom-2.5 start-2.5 inline-flex items-center gap-1.5 rounded-full bg-ink-deep/80 px-2.5 py-1 text-xs font-bold text-white">
            <Play className="size-3 fill-white" /> {post.videoLength}
          </span>
        )}
      </Link>
      <div className="p-3.5">
        <div className="mb-2 flex items-center gap-2.5">
          <Avatar name={author.name} color={author.avatarColor} size={30} href={`/profile/${author.username}`} />
          <Link href={`/profile/${author.username}`} className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-bold text-ink hover:underline">{author.name}</span>
            <span className="block truncate text-[11px] text-faint">{relative(post.createdAt)}</span>
          </Link>
          <FollowButton userId={author.id} className="h-7 px-2.5 text-xs" />
        </div>
        <Link href={`/post/${post.id}`} className="block" lang={tr.on ? undefined : post.lang}>
          <h3 className="text-[15px] font-bold leading-snug text-ink">{title}</h3>
          <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-muted">{body}</p>
        </Link>
        {tr.foreign && tr.available && (
          <button onClick={tr.toggle} className="mt-1.5 text-[12px] font-semibold text-teal hover:underline">
            {tr.on ? t("translate.showOriginal") : t("translate.show")}
          </button>
        )}
        <div className="mt-2.5 flex items-center gap-1 border-t border-line/70 pt-2">
          <LikeButton postId={post.id} />
          <Link href={`/post/${post.id}#comments`} className="inline-flex items-center gap-1.5 rounded-lg px-1.5 py-1 text-sm font-semibold text-muted hover:text-ink" aria-label={t("post.commentsCount", { count: cc })}>
            <MessageSquare className="size-[18px]" />
            <span className="nums">{num(cc)}</span>
          </Link>
          <span className="ms-auto text-[11px] text-faint">{t("post.views", { count: post.views })}</span>
        </div>
      </div>
    </article>
  );
}

export function PostGridSkeleton() {
  return (
    <div className="masonry columns-1 sm:columns-2 xl:columns-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="overflow-hidden rounded-[var(--radius-tile)] border border-line bg-surface">
          <div className="animate-pulse bg-line/70" style={{ height: 180 + (i % 3) * 60 }} />
          <div className="space-y-2 p-3.5">
            <div className="h-3 w-1/2 animate-pulse rounded bg-line/70" />
            <div className="h-3 w-3/4 animate-pulse rounded bg-line/70" />
          </div>
        </div>
      ))}
    </div>
  );
}
