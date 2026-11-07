"use client";
import { use, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Link2, Send, Trash, WandSparkles, Play } from "lucide-react";
import { useStore } from "@/lib/store";
import { useI18n } from "@/i18n/I18nProvider";
import { commentsOf, userById } from "@/lib/selectors";
import { Avatar, Badge, Card, EmptyState, Textarea } from "@/components/ui/primitives";
import { Button, ButtonLink, IconButton } from "@/components/ui/button";
import { FollowButton, LikeButton, SaveButton } from "@/components/common/actions";
import { TranslateBar, useTranslation } from "@/components/common/Translatable";
import { PostCard } from "@/components/feed/PostCard";
import { categoryColor } from "@/i18n/content";
import { useToast } from "@/components/ui/toast";

export default function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { state, meId, actions } = useStore();
  const { t, cat, relative, date } = useI18n();
  const toast = useToast();
  const router = useRouter();
  const d = state!.data;
  const post = d.posts.find((p) => p.id === id);
  const [text, setText] = useState("");
  const tr = useTranslation(post?.lang ?? "ru", post?.translations);

  useEffect(() => {
    if (post) {
      actions.viewPost(post.id);
      if (post.category) actions.viewCategory(post.category);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (!post) return <EmptyState title={t("errors.notFound")} text={t("errors.postGone")} action={<ButtonLink href="/feed">{t("nav.feed")}</ButtonLink>} />;
  const author = userById(d, post.authorId)!;
  const comments = commentsOf(d, post.id);
  const related = d.posts.filter((p) => p.id !== post.id && (p.category === post.category || p.authorId === post.authorId)).slice(0, 3);
  const title = tr.on ? tr.tr!.title : post.title;
  const body = tr.on ? tr.tr!.body : post.body;

  const send = () => {
    if (!text.trim()) return;
    actions.addComment(post.id, text);
    setText("");
    toast({ text: t("post.commentAdded") });
  };

  return (
    <div className="mx-auto max-w-5xl">
      <button onClick={() => router.back()} className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink">
        <ArrowLeft className="size-4" /> {t("common.back")}
      </button>
      <Card className="overflow-hidden lg:grid lg:grid-cols-[1.15fr_1fr]">
        <div className="relative bg-ink-deep">
          <Image src={post.images[0]} alt={title} width={1000} height={1000} priority unoptimized={post.images[0].startsWith("data:")} className="h-full max-h-[78vh] w-full object-contain" />
          {post.kind === "video" && (
            <div className="absolute inset-x-3 bottom-3 flex items-center gap-2 rounded-xl bg-ink-deep/80 px-3 py-2 text-xs text-white">
              <Play className="size-4 shrink-0 fill-white" />
              {t("post.videoDemo", { length: post.videoLength ?? "" })}
            </div>
          )}
        </div>
        <div className="flex min-w-0 flex-col">
          <div className="flex items-center gap-3 border-b border-line p-4">
            <Avatar name={author.name} color={author.avatarColor} size={42} href={`/profile/${author.username}`} />
            <Link href={`/profile/${author.username}`} className="min-w-0 flex-1">
              <span className="block truncate font-bold text-ink hover:underline">{author.name}</span>
              <span className="block truncate text-xs text-muted">
                @{author.username} · {t(`status.${author.status}`)}
              </span>
            </Link>
            <FollowButton userId={author.id} />
          </div>
          <div className="space-y-3 p-4">
            <div className="flex flex-wrap gap-1.5">
              {post.category && (
                <Link href={`/search?q=${encodeURIComponent(cat(post.category))}`}>
                  <Badge>
                    <span className="size-2 rotate-45 rounded-[1px]" style={{ background: categoryColor(post.category) }} />
                    {cat(post.category)}
                  </Badge>
                </Link>
              )}
              <Badge tone="rust">{t(`postKind.${post.kind}`)}</Badge>
            </div>
            <h1 className="text-2xl font-bold leading-tight text-ink" lang={tr.on ? undefined : post.lang}>
              {title}
            </h1>
            <p className="whitespace-pre-line text-[15px] leading-relaxed text-text/90" lang={tr.on ? undefined : post.lang}>
              {body}
            </p>
            <TranslateBar contentLang={post.lang} state={tr} />
            <p className="text-xs text-faint" title={date(post.createdAt, "datetime")}>
              {relative(post.createdAt)} · {t("post.views", { count: post.views })}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-1 border-y border-line px-3 py-2">
            <LikeButton postId={post.id} />
            <SaveButton type="post" id={post.id} />
            <IconButton
              label={t("post.copyLink")}
              onClick={() => {
                navigator.clipboard?.writeText(window.location.href).catch(() => {});
                toast({ text: t("post.linkCopied") });
              }}
            >
              <Link2 className="size-[18px]" />
            </IconButton>
            {post.authorId === meId && (
              <IconButton
                label={t("post.delete")}
                onClick={() => {
                  if (confirm(t("post.deleteConfirm"))) {
                    actions.deletePost(post.id);
                    toast({ text: t("post.deleted"), tone: "info" });
                    router.push("/feed");
                  }
                }}
              >
                <Trash className="size-[18px] text-rose-deep" />
              </IconButton>
            )}
            <ButtonLink href={`/studio?post=${post.id}`} variant="soft" size="sm" className="ms-auto">
              <WandSparkles className="size-4" /> {t("post.discussInStudio")}
            </ButtonLink>
          </div>
          <div id="comments" className="flex min-h-0 flex-1 flex-col">
            <p className="px-4 pt-3 text-sm font-bold text-ink">{t("post.commentsCount", { count: comments.length })}</p>
            <ul className="max-h-[360px] flex-1 space-y-3 overflow-y-auto px-4 py-3">
              {comments.length === 0 && <li className="text-sm text-muted">{t("post.noComments")}</li>}
              {comments.map((c) => {
                const u = userById(d, c.authorId);
                if (!u) return null;
                return (
                  <li key={c.id} className="group flex gap-2.5">
                    <Avatar name={u.name} color={u.avatarColor} size={30} href={`/profile/${u.username}`} />
                    <div className="min-w-0 flex-1 rounded-2xl rounded-ss-sm bg-bg px-3 py-2">
                      <div className="flex items-baseline gap-2">
                        <Link href={`/profile/${u.username}`} className="truncate text-[13px] font-bold text-ink hover:underline">
                          {u.name}
                        </Link>
                        <span className="shrink-0 text-[11px] text-faint">{relative(c.createdAt)}</span>
                        {c.authorId === meId && (
                          <button onClick={() => actions.deleteComment(c.id)} className="ms-auto text-[11px] font-semibold text-faint hover:text-rose-deep">
                            {t("common.delete")}
                          </button>
                        )}
                      </div>
                      <p className="text-sm leading-relaxed text-text/90">{c.text}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
            <form
              className="flex items-end gap-2 border-t border-line p-3"
              onSubmit={(e) => {
                e.preventDefault();
                send();
              }}
            >
              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                placeholder={t("post.commentPlaceholder")}
                aria-label={t("post.commentPlaceholder")}
                rows={1}
                maxLength={600}
                className="min-h-11 resize-none"
              />
              <Button type="submit" disabled={!text.trim()} aria-label={t("post.send")} className="h-11 w-11 shrink-0 px-0">
                <Send className="size-4" />
              </Button>
            </form>
          </div>
        </div>
      </Card>
      {related.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-4 font-display text-2xl text-ink">{t("post.related")}</h2>
          <div className="masonry columns-1 sm:columns-2 lg:columns-3">
            {related.map((p) => (
              <PostCard key={p.id} post={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
