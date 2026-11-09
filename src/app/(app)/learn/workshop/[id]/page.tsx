"use client";
import { use, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CalendarDays, Clock, MapPin, MessageCircle, MonitorPlay, Users, CheckCircle2, Pencil, Link2, Wrench, ScrollText, GraduationCap, Minus, Plus } from "lucide-react";
import { useStore } from "@/lib/store";
import { BackLink } from "@/components/common/BackLink";
import { useI18n } from "@/i18n/I18nProvider";
import { userById } from "@/lib/selectors";
import { techniqueName } from "@/i18n/content";
import { Avatar, Badge, Card, DemoNote, EmptyState } from "@/components/ui/primitives";
import { Button, ButtonLink } from "@/components/ui/button";
import { FollowButton, SaveButton } from "@/components/common/actions";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { seatsLeft, sessionPhase, sessionsOf } from "@/lib/workshops";

/** Workshop template page: information + the list of dates; a booking is made for one concrete date. */
export default function WorkshopPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const sp = useSearchParams();
  const { state, meId, actions, settings } = useStore();
  const { t, cat, money, date, langName, locale } = useI18n();
  const toast = useToast();
  const d = state!.data;
  const w = d.workshops.find((x) => x.id === id);
  const [picked, setPicked] = useState<string | null>(sp.get("session"));
  const [seats, setSeats] = useState(1);
  const [confirm, setConfirm] = useState(false);
  const [cancel, setCancel] = useState(false);
  const [photo, setPhoto] = useState(0);
  if (!w || (w.status === "draft" && w.hostId !== meId)) return <EmptyState title={t("errors.notFound")} action={<ButtonLink href="/learn?tab=workshops">{t("learn.workshops")}</ButtonLink>} />;
  const host = userById(d, w.hostId)!;
  const isHost = w.hostId === meId;
  const all = sessionsOf(d, w.id);
  const myBookings = d.enrollments.filter((e) => e.userId === meId && e.workshopId === w.id);
  // Upcoming dates + dates I'm booked on (even if cancelled/finished, so I can see what happened).
  const visible = all.filter((s) => sessionPhase(s) === "upcoming" || myBookings.some((b) => b.sessionId === s.id) || s.id === picked);
  const session = visible.find((s) => s.id === picked) ?? visible.find((s) => sessionPhase(s) === "upcoming") ?? visible[0];
  const phase = session ? sessionPhase(session) : null;
  const booking = session ? myBookings.find((b) => b.sessionId === session.id) : undefined;
  const left = session ? seatsLeft(d, session) : 0;
  const maxSeats = Math.min(left, 10);
  const gallery = [w.cover, ...(w.photos ?? [])].filter(Boolean);
  const differentTz = session && session.timeZone !== settings.timeZone;
  const hostTime = session ? new Intl.DateTimeFormat(locale, { timeZone: session.timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(session.startsAt)) : "";
  const price = session?.price ?? w.price;

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <BackLink fallback={isHost ? `/dashboard/workshops/${w.id}` : "/learn?tab=workshops"} fallbackLabel={isHost ? t("ws.mine.manage") : t("learn.workshops")} />
        {isHost && (
          <ButtonLink href={`/dashboard/workshops/${w.id}`} size="sm" variant="soft">
            <Pencil className="size-3.5" /> {t("ws.mine.manage")}
          </ButtonLink>
        )}
      </div>
      {w.status === "draft" && <DemoNote className="mb-4">{t("ev.page.draft")}</DemoNote>}
      {w.status === "archived" && <DemoNote className="mb-4">{t("ws.page.archived")}</DemoNote>}
      <div className="grid gap-6 lg:grid-cols-[1fr_360px] [&>*]:min-w-0">
        <div className="min-w-0">
          <div className="relative aspect-[16/9] overflow-hidden rounded-3xl bg-line">
            <Image src={gallery[photo] ?? w.cover} alt={w.title} fill priority sizes="(max-width: 1024px) 100vw, 640px" unoptimized={(gallery[photo] ?? w.cover).startsWith("data:")} className="object-cover" />
          </div>
          {gallery.length > 1 && (
            <div className="scrollbar-none mt-3 flex gap-2 overflow-x-auto">
              {gallery.map((src, i) => (
                <button key={i} onClick={() => setPhoto(i)} aria-pressed={photo === i} aria-label={t("product.photo", { n: i + 1 })} className={cn("relative size-16 shrink-0 overflow-hidden rounded-xl border-2", photo === i ? "border-ink" : "border-transparent opacity-70")}>
                  <Image src={src} alt="" fill sizes="64px" unoptimized={src.startsWith("data:")} className="object-cover" />
                </button>
              ))}
            </div>
          )}
          <div className="mt-5 flex flex-wrap gap-1.5">
            <Badge tone={w.format === "online" ? "info" : "rust"}>
              {w.format === "online" ? <MonitorPlay className="size-3" /> : <MapPin className="size-3" />}
              {t(`workshop.${w.format}`)}
            </Badge>
            <Badge>{cat(w.category)}</Badge>
            {w.technique && <Badge tone="warn">{techniqueName(w.technique, locale)}</Badge>}
            <Badge><Clock className="size-3" /> {t("workshop.duration", { count: Math.round((w.durationMin / 60) * 10) / 10 })}</Badge>
          </div>
          <h1 className="mt-3 font-display text-3xl leading-tight text-ink sm:text-4xl" lang={w.lang}>{w.title}</h1>
          <p className="mt-3 whitespace-pre-line text-[15px] leading-relaxed text-text/90" lang={w.lang}>{w.description}</p>
          <p className="mt-2 text-xs text-faint">{t("workshop.language", { lang: langName(w.lang) })}</p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {w.level !== "any" && (
              <Card className="flex gap-3 p-4 text-sm">
                <GraduationCap className="mt-0.5 size-4 shrink-0 text-rust" />
                <div><p className="text-xs font-semibold text-faint">{t("ev.page.level")}</p><p className="font-semibold text-ink">{t(`level.${w.level}`)}</p></div>
              </Card>
            )}
            {w.materials.length > 0 && (
              <Card className="flex gap-3 p-4 text-sm">
                <Wrench className="mt-0.5 size-4 shrink-0 text-rust" />
                <div>
                  <p className="text-xs font-semibold text-faint">{t("ev.page.materials")}</p>
                  <ul className="list-inside list-disc text-ink" lang={w.lang}>{w.materials.map((m, i) => <li key={i}>{m}</li>)}</ul>
                </div>
              </Card>
            )}
            {(session?.terms ?? w.terms) && (
              <Card className="flex gap-3 p-4 text-sm sm:col-span-2">
                <ScrollText className="mt-0.5 size-4 shrink-0 text-rust" />
                <div><p className="text-xs font-semibold text-faint">{t("ev.page.terms")}</p><p className="whitespace-pre-line text-ink" lang={w.lang}>{session?.terms ?? w.terms}</p></div>
              </Card>
            )}
          </div>
          {w.program.length > 0 && (
            <section className="mt-8">
              <h2 className="mb-3 text-lg font-bold text-ink">{t("workshop.program")}</h2>
              <ol className="relative space-y-3 border-s-2 border-dashed border-line ps-6">
                {w.program.map((p, i) => (
                  <li key={i} className="relative" lang={w.lang}>
                    <span className="absolute -start-[33px] top-0.5 flex size-4 rotate-45 items-center justify-center rounded-[3px] bg-saffron" />
                    <p className="text-[15px] font-semibold text-ink">{p}</p>
                  </li>
                ))}
              </ol>
            </section>
          )}
          <Card className="mt-8 flex items-center gap-3 p-4">
            <Avatar name={host.name} color={host.avatarColor} size={48} href={`/profile/${host.username}`} />
            <Link href={`/profile/${host.username}`} className="min-w-0 flex-1">
              <span className="block text-xs text-muted">{t("workshop.hostLabel")}</span>
              <span className="block truncate font-bold text-ink hover:underline">{host.name}</span>
              <span className="block truncate text-xs text-muted" lang={host.contentLang}>{host.bio}</span>
            </Link>
            <FollowButton userId={host.id} />
          </Card>
          {!isHost && (
            <ButtonLink href={`/messages/${host.username}?workshop=${w.id}${session ? `&session=${session.id}` : ""}`} variant="secondary" className="mt-3 w-full sm:w-auto">
              <MessageCircle className="size-4" /> {t("wsx.messageHost")}
            </ButtonLink>
          )}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-32 lg:h-fit">
          <Card className="space-y-4 p-5">
            <p className="nums text-2xl font-bold text-ink">{price ? money(price) : t("learn.free")}</p>
            <div>
              <p className="mb-2 text-sm font-bold text-ink">{t("ws.page.chooseDate")}</p>
              {visible.length === 0 ? (
                <p className="text-sm text-muted">{t("ws.page.noDates")}</p>
              ) : (
                <ul className="space-y-1.5" role="radiogroup" aria-label={t("ws.page.chooseDate")}>
                  {visible.map((s) => {
                    const ph = sessionPhase(s);
                    const l = seatsLeft(d, s);
                    const mine = myBookings.find((b) => b.sessionId === s.id);
                    const on = s.id === session?.id;
                    return (
                      <li key={s.id}>
                        <button
                          role="radio"
                          aria-checked={on}
                          onClick={() => { setPicked(s.id); setSeats(1); }}
                          className={cn("flex w-full items-center gap-2 rounded-xl border px-3 py-2 text-start text-sm", on ? "border-ink bg-ink-soft/60" : "border-line hover:border-ink/40")}
                        >
                          <CalendarDays className="size-4 shrink-0 text-rust" />
                          <span className="min-w-0 flex-1">
                            <span className="nums block font-semibold text-ink">{date(s.startsAt, "weekday")}, {date(s.startsAt, "time")}</span>
                            <span className="block text-xs text-muted">
                              {ph !== "upcoming" ? t(`ws.phase.${ph}`) : l <= 0 ? t("workshop.full") : t("workshop.seatsLeft", { count: l })}
                              {s.format === "offline" && s.city ? ` · ${s.city}` : ""}
                            </span>
                          </span>
                          {mine && <CheckCircle2 className="size-4 shrink-0 text-teal" aria-label={t("workshop.enrolled")} />}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
            {session && (
              <ul className="space-y-3 border-t border-line pt-4 text-sm">
                <li className="flex gap-3">
                  <CalendarDays className="mt-0.5 size-4 shrink-0 text-rust" />
                  <span>
                    <span className="block font-semibold text-ink">{date(session.startsAt, "long")}</span>
                    <span className="nums text-muted">{date(session.startsAt, "time")}–{date(session.endsAt, "time")} · {t("workshop.yourTime")}</span>
                    {differentTz && <span className="nums block text-xs text-faint">{t("workshop.hostTime", { time: hostTime, tz: session.timeZone.split("/").pop()!.replace(/_/g, " ") })}</span>}
                  </span>
                </li>
                <li className="flex gap-3">
                  {session.format === "online" ? <MonitorPlay className="mt-0.5 size-4 shrink-0 text-rust" /> : <MapPin className="mt-0.5 size-4 shrink-0 text-rust" />}
                  <span className="text-ink">{session.format === "online" ? w.onlineInfo ?? t("workshop.online") : `${session.city}, ${session.venue}`}</span>
                </li>
                {session.format === "online" && phase === "upcoming" && (
                  <li className="flex gap-3">
                    <Link2 className="mt-0.5 size-4 shrink-0 text-rust" />
                    <span className="min-w-0">
                      <span className="block text-xs font-semibold text-faint">{t("ev.page.link")}</span>
                      {/* The joining link is shown only to people booked on THIS session and to the host. */}
                      {booking || isHost ? (
                        session.onlineUrl ? <a href={session.onlineUrl} target="_blank" rel="noopener noreferrer" className="block break-all font-semibold text-teal hover:underline">{session.onlineUrl}</a> : <span className="text-muted">{t("ev.page.linkMissing")}</span>
                      ) : (
                        <span className="text-muted">{t("ev.page.linkHidden")}</span>
                      )}
                    </span>
                  </li>
                )}
                <li className="flex gap-3">
                  <Users className="mt-0.5 size-4 shrink-0 text-rust" />
                  <span className="min-w-0 flex-1">
                    <span className={cn("font-semibold", left <= 0 ? "text-rose-deep" : "text-ink")}>{left <= 0 ? t("workshop.full") : t("workshop.seatsLeft", { count: left })}</span>
                    <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-line">
                      <span className="block h-full rounded-full bg-teal" style={{ width: `${((session.seatsTotal - left) / session.seatsTotal) * 100}%` }} />
                    </span>
                  </span>
                </li>
              </ul>
            )}
            {isHost ? (
              <DemoNote>{t("workshop.youHost")}</DemoNote>
            ) : !session ? null : phase === "cancelled" ? (
              <p className="rounded-xl bg-rose-soft px-3 py-2.5 text-sm font-bold text-rose-deep">{t("ws.page.sessionCancelled")}</p>
            ) : phase === "completed" ? (
              <Button disabled className="w-full">{t("workshop.past")}</Button>
            ) : booking ? (
              <div className="space-y-2">
                <p className="flex items-center gap-2 rounded-xl bg-[#e1f3e6] px-3 py-2.5 text-sm font-bold text-[#1f6b3a]">
                  <CheckCircle2 className="size-4" /> {t("ws.page.booked", { count: booking.seats })}
                </p>
                <Button variant="danger" className="w-full" onClick={() => setCancel(true)}>{t("workshop.cancel")}</Button>
              </div>
            ) : w.status !== "published" ? null : (
              <div className="space-y-3">
                {left > 0 && (
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold text-ink">{t("ws.page.seats")}</span>
                    <div className="flex items-center rounded-xl border border-line">
                      <button onClick={() => setSeats(Math.max(1, seats - 1))} disabled={seats <= 1} className="flex size-10 items-center justify-center disabled:opacity-30" aria-label={t("cart.less")}><Minus className="size-4" /></button>
                      <span className="nums w-8 text-center font-bold" aria-live="polite">{seats}</span>
                      <button onClick={() => setSeats(Math.min(maxSeats, seats + 1))} disabled={seats >= maxSeats} className="flex size-10 items-center justify-center disabled:opacity-30" aria-label={t("cart.more")}><Plus className="size-4" /></button>
                    </div>
                  </div>
                )}
                <Button className="w-full" size="lg" variant="accent" disabled={left <= 0} onClick={() => setConfirm(true)}>
                  {left <= 0 ? t("workshop.full") : t("workshop.enroll")}
                </Button>
              </div>
            )}
            <SaveButton type="workshop" id={w.id} variant="button" className="w-full justify-center" />
          </Card>
        </aside>
      </div>

      <Modal
        open={confirm && !!session}
        onClose={() => setConfirm(false)}
        title={t("workshop.confirmTitle")}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirm(false)}>{t("common.cancel")}</Button>
            <Button
              onClick={() => {
                if (!session) return;
                const r = actions.enroll(session.id, seats);
                setConfirm(false);
                if (r === "ok") toast({ text: t("workshop.enrolledToast"), action: { label: t("learn.mine"), href: "/learn?tab=mine" } });
                else toast({ text: t(`ws.enrollError.${r}`), tone: "error" });
              }}
            >
              {t("workshop.confirm")}
            </Button>
          </>
        }
      >
        {session && (
          <div className="space-y-3 p-5 text-sm">
            <p className="font-bold text-ink" lang={w.lang}>{w.title}</p>
            <p className="text-muted">{date(session.startsAt, "long")}, {date(session.startsAt, "time")} · {session.format === "online" ? t("workshop.online") : session.city}</p>
            <p className="text-muted">{t("ws.seatsN", { count: seats })}</p>
            <p className="nums text-lg font-bold text-ink">{price ? money({ amount: price.amount * seats, currency: price.currency }) : t("learn.free")}</p>
            {price && <DemoNote>{t("common.noPayment")}</DemoNote>}
          </div>
        )}
      </Modal>
      <Modal
        open={cancel}
        onClose={() => setCancel(false)}
        title={t("workshop.cancelTitle")}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setCancel(false)}>{t("common.keep")}</Button>
            <Button variant="danger" onClick={() => { if (session) actions.cancelEnrollment(session.id); setCancel(false); toast({ text: t("workshop.cancelled"), tone: "info" }); }}>
              {t("workshop.cancel")}
            </Button>
          </>
        }
      >
        <p className="p-5 text-sm text-muted">{t("workshop.cancelText")}</p>
      </Modal>
    </div>
  );
}
