"use client";
import { use, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Circle, Clock, Lock, Signal, Pencil, PlayCircle, ExternalLink } from "lucide-react";
import { techniqueName } from "@/i18n/content";
import { useStore } from "@/lib/store";
import { BackLink } from "@/components/common/BackLink";
import { useI18n } from "@/i18n/I18nProvider";
import { rating, userById } from "@/lib/selectors";
import { Avatar, Badge, Card, DemoNote, EmptyState, Stars, Textarea } from "@/components/ui/primitives";
import { Button, ButtonLink } from "@/components/ui/button";
import { FollowButton, SaveButton } from "@/components/common/actions";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

export default function TutorialPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { state, meId, actions } = useStore();
  const { t, cat, money, relative, langName, locale } = useI18n();
  const toast = useToast();
  const d = state!.data;
  const tut = d.tutorials.find((x) => x.id === id);
  const [done, setDone] = useState<number[]>([]);
  const [buy, setBuy] = useState(false);
  const [rev, setRev] = useState({ rating: 5, text: "" });
  useEffect(() => {
    actions.viewTutorial(id);
    // one view per visit
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);
  // Drafts and hidden materials are visible to their author only.
  if (tut && tut.status !== "published" && tut.authorId !== meId) return <EmptyState title={t("tut.page.unavailable")} action={<ButtonLink href="/learn">{t("nav.learn")}</ButtonLink>} />;
  if (!tut) return <EmptyState title={t("errors.notFound")} action={<ButtonLink href="/learn">{t("nav.learn")}</ButtonLink>} />;
  const author = userById(d, tut.authorId)!;
  const owned = !tut.price || tut.authorId === meId || d.tutorialPurchases.some((p) => p.userId === meId && p.tutorialId === tut.id);
  const r = rating(tut.reviews);
  const reviewed = tut.reviews.some((x) => x.authorId === meId);
  const visibleSteps = owned ? tut.steps : tut.steps.slice(0, 1);

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <BackLink fallback={tut.authorId === meId ? "/dashboard/tutorials" : "/learn"} fallbackLabel={tut.authorId === meId ? t("nav.myTutorials") : t("nav.learn")} />
        {tut.authorId === meId && (
          <ButtonLink href={`/dashboard/tutorials/${tut.id}`} size="sm" variant="soft"><Pencil className="size-3.5" /> {t("common.edit")}</ButtonLink>
        )}
      </div>
      {tut.status !== "published" && <DemoNote className="mb-4">{tut.status === "draft" ? t("tut.page.draft") : t("tut.page.hidden")}</DemoNote>}
      <div className="grid gap-6 lg:grid-cols-[1fr_320px] [&>*]:min-w-0">
        <div className="min-w-0">
          <div className="relative aspect-[16/9] overflow-hidden rounded-3xl bg-line">
            {tut.cover && <Image src={tut.cover} alt={tut.title} fill priority sizes="(max-width: 1024px) 100vw, 640px" unoptimized={tut.cover.startsWith("data:")} className="object-cover" />}
          </div>
          <div className="mt-5 flex flex-wrap gap-1.5">
            <Badge>{cat(tut.category)}</Badge>
            {tut.direction && <Badge>{tut.direction}</Badge>}
            {tut.technique && <Badge tone="rust">{techniqueName(tut.technique, locale)}</Badge>}
            <Badge tone="info">
              <Signal className="size-3" /> {t(`level.${tut.level}`)}
            </Badge>
            <Badge tone="warn">
              <Clock className="size-3" /> {t("learn.minutes", { count: tut.durationMin })}
            </Badge>
          </div>
          <h1 className="mt-3 font-display text-3xl leading-tight text-ink sm:text-4xl" lang={tut.lang}>
            {tut.title}
          </h1>
          <p className="mt-2 text-[15px] text-muted" lang={tut.lang}>
            {tut.summary}
          </p>
          <p className="mt-2 text-xs text-faint">{t("translate.original", { lang: langName(tut.lang) })}</p>
          {tut.content && <p className="mt-5 whitespace-pre-line text-[15px] leading-relaxed text-text/90" lang={tut.lang}>{tut.content}</p>}
          {tut.videoUrl && (
            <a href={tut.videoUrl} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-white hover:bg-ink-deep">
              <PlayCircle className="size-4" /> {t("tut.page.watch")}
            </a>
          )}
          {tut.videoUrl && <p className="mt-1 text-xs text-faint">{t("tut.page.videoNote")}</p>}
          {!!tut.images?.length && (
            <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {tut.images.map((src, i) => (
                <div key={i} className="relative aspect-square overflow-hidden rounded-xl bg-line/40">
                  <Image src={src} alt="" fill sizes="220px" unoptimized={src.startsWith("data:")} className="object-cover" />
                </div>
              ))}
            </div>
          )}

          <section className="mt-8">
            <h2 className="mb-3 text-lg font-bold text-ink">{t("learn.steps")}</h2>
            <ol className="space-y-3">
              {visibleSteps.map((s, i) => {
                const on = done.includes(i);
                return (
                  <li key={i}>
                    <Card className={cn("flex gap-4 p-4 transition-colors", on && "border-teal/50 bg-teal-soft/30")}>
                      <button onClick={() => setDone(on ? done.filter((x) => x !== i) : [...done, i])} aria-pressed={on} aria-label={t("learn.markStep")} className="mt-0.5 shrink-0">
                        {on ? <CheckCircle2 className="size-6 text-teal" /> : <Circle className="size-6 text-line" />}
                      </button>
                      <div className="min-w-0" lang={tut.lang}>
                        <p className="font-bold text-ink">
                          <span className="nums me-2 text-rust">{i + 1}.</span>
                          {s.title}
                        </p>
                        <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-text/85">{s.text}</p>
                        {s.image && (
                          <div className="relative mt-2 aspect-[4/3] w-full max-w-xs overflow-hidden rounded-xl">
                            <Image src={s.image} alt="" fill sizes="320px" unoptimized={s.image.startsWith("data:")} className="object-cover" />
                          </div>
                        )}
                      </div>
                    </Card>
                  </li>
                );
              })}
            </ol>
            {owned && done.length === tut.steps.length && <p className="mt-3 text-sm font-bold text-teal">{t("learn.allDone")}</p>}
            {!owned && (
              <Card className="mt-3 flex flex-col items-center gap-3 p-6 text-center">
                <Lock className="size-6 text-muted" />
                <p className="font-bold text-ink">{t("learn.locked", { count: tut.steps.length - 1 })}</p>
                <Button onClick={() => setBuy(true)}>{t("learn.buyFor", { price: money(tut.price!) })}</Button>
              </Card>
            )}
          </section>

          <section className="mt-10">
            <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-ink">
              {t("learn.reviews")} {r !== null && <Stars value={r} />}
              <span className="nums text-sm text-muted">{r !== null ? `${r} · ${t("learn.reviewsCount", { count: tut.reviews.length })}` : ""}</span>
            </h2>
            {owned && !reviewed && tut.authorId !== meId && (
              <Card className="mb-4 space-y-3 p-4">
                <p className="text-sm font-bold text-ink">{t("learn.leaveReview")}</p>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button key={n} onClick={() => setRev({ ...rev, rating: n })} aria-label={`${n}`} className={cn("size-8 rounded-lg text-sm font-bold", n <= rev.rating ? "bg-saffron text-ink-deep" : "bg-ink-soft text-muted")}>
                      {n}
                    </button>
                  ))}
                </div>
                <Textarea rows={2} value={rev.text} onChange={(e) => setRev({ ...rev, text: e.target.value })} placeholder={t("learn.reviewPlaceholder")} aria-label={t("learn.reviewPlaceholder")} />
                <Button
                  size="sm"
                  disabled={rev.text.trim().length < 3}
                  onClick={() => {
                    actions.addTutorialReview(tut.id, rev.rating, rev.text.trim());
                    toast({ text: t("learn.reviewThanks") });
                  }}
                >
                  {t("learn.submitReview")}
                </Button>
              </Card>
            )}
            {tut.reviews.length === 0 ? (
              <p className="text-sm text-muted">{t("learn.noReviews")}</p>
            ) : (
              <ul className="space-y-3">
                {tut.reviews.map((rv, i) => {
                  const u = userById(d, rv.authorId);
                  if (!u) return null;
                  return (
                    <li key={i} className="flex gap-3">
                      <Avatar name={u.name} color={u.avatarColor} size={34} href={`/profile/${u.username}`} />
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-ink">
                          {u.name} <Stars value={rv.rating} className="ms-1 align-middle" />
                        </p>
                        <p className="text-sm text-text/85">{rv.text}</p>
                        <p className="text-xs text-faint">{relative(rv.at)}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-32 lg:h-fit">
          <Card className="p-5">
            <p className="nums text-2xl font-bold text-ink">{tut.price ? money(tut.price) : t("learn.free")}</p>
            {owned && tut.price && tut.authorId !== meId && <Badge tone="success" className="mt-1">{t("learn.purchased")}</Badge>}
            <div className="mt-4 flex flex-col gap-2">
              {!owned && <Button onClick={() => setBuy(true)}>{t("learn.buy")}</Button>}
              <SaveButton type="tutorial" id={tut.id} variant="button" className="justify-center" />
            </div>
            <div className="mt-5">
              <p className="mb-2 text-sm font-bold text-ink">{t("learn.materialsNeeded")}</p>
              <ul className="space-y-1.5 text-sm text-text/85" lang={tut.lang}>
                {tut.materials.map((m) => (
                  <li key={m} className="flex gap-2">
                    <span className="mt-2 size-1.5 shrink-0 rotate-45 bg-saffron" />
                    {m}
                  </li>
                ))}
              </ul>
            </div>
          </Card>
          {!!tut.links?.length && (
            <Card className="p-5">
              <p className="mb-2 text-sm font-bold text-ink">{t("tut.form.links")}</p>
              <ul className="space-y-1.5 text-sm">
                {tut.links.map((l, i) => (
                  <li key={i}><a href={l.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 font-semibold text-teal hover:underline"><ExternalLink className="size-3.5" />{l.label}</a></li>
                ))}
              </ul>
            </Card>
          )}
          <Card className="flex items-center gap-3 p-4">
            <Avatar name={author.name} color={author.avatarColor} size={44} href={`/profile/${author.username}`} />
            <Link href={`/profile/${author.username}`} className="min-w-0 flex-1">
              <span className="block truncate font-bold text-ink hover:underline">{author.name}</span>
              <span className="block truncate text-xs text-muted">{t(`status.${author.status}`)}</span>
            </Link>
            <FollowButton userId={author.id} />
          </Card>
        </aside>
      </div>

      <Modal
        open={buy}
        onClose={() => setBuy(false)}
        title={t("learn.buyTitle")}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setBuy(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              onClick={() => {
                actions.buyTutorial(tut.id);
                setBuy(false);
                toast({ text: t("learn.bought") });
              }}
            >
              {t("learn.confirmDemo")}
            </Button>
          </>
        }
      >
        <div className="space-y-3 p-5">
          <p className="font-bold text-ink" lang={tut.lang}>
            {tut.title}
          </p>
          <p className="nums text-xl font-bold text-ink">{tut.price && money(tut.price)}</p>
          <DemoNote>{t("common.noPayment")}</DemoNote>
        </div>
      </Modal>
    </div>
  );
}
