"use client";
import { use, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, CalendarDays, Clock, MapPin, MonitorPlay, Users, CheckCircle2, Pencil, Link2, Wrench, ScrollText, GraduationCap, Ban } from "lucide-react";
import { useStore } from "@/lib/store";
import { useI18n } from "@/i18n/I18nProvider";
import { userById } from "@/lib/selectors";
import { Avatar, Badge, Card, DemoNote, EmptyState } from "@/components/ui/primitives";
import { Button, ButtonLink } from "@/components/ui/button";
import { FollowButton, SaveButton } from "@/components/common/actions";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { workshopPhase } from "@/lib/workshops";

export default function WorkshopPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { state, meId, actions, settings } = useStore();
  const { t, cat, money, date, langName } = useI18n();
  const toast = useToast();
  const d = state!.data;
  const w = d.workshops.find((x) => x.id === id);
  const [confirm, setConfirm] = useState(false);
  const [cancel, setCancel] = useState(false);
  if (!w || (w.status === "draft" && w.hostId !== meId)) return <EmptyState title={t("errors.notFound")} action={<ButtonLink href="/learn?tab=workshops">{t("learn.workshops")}</ButtonLink>} />;
  const phase = workshopPhase(w);
  const host = userById(d, w.hostId)!;
  const enrolled = d.enrollments.some((e) => e.userId === meId && e.workshopId === w.id);
  const left = w.seatsTotal - w.seatsTaken;
  const past = new Date(w.startsAt).getTime() < Date.now() || phase === "completed";
  const isHost = w.hostId === meId;
  const end = w.endsAt;
  const differentTz = w.timeZone !== settings.timeZone;
  const hostTime = new Intl.DateTimeFormat(undefined, { timeZone: w.timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(w.startsAt));

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <Link href={isHost ? "/dashboard/events" : "/learn?tab=workshops"} className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink">
          <ArrowLeft className="size-4" /> {isHost ? t("nav.myEvents") : t("learn.workshops")}
        </Link>
        {isHost && (phase === "draft" || phase === "published") && (
          <ButtonLink href={`/dashboard/events/${w.id}`} size="sm" variant="soft">
            <Pencil className="size-3.5" /> {t("ev.page.edit")}
          </ButtonLink>
        )}
      </div>
      {phase === "draft" && <DemoNote className="mb-4">{t("ev.page.draft")}</DemoNote>}
      {phase === "cancelled" && (
        <p role="status" className="mb-4 flex items-center gap-2 rounded-xl border border-rose/40 bg-rose-soft px-3 py-2.5 text-sm font-bold text-rose-deep">
          <Ban className="size-4" /> {t("ev.page.cancelled")}
        </p>
      )}
      {phase === "completed" && <DemoNote className="mb-4">{t("ev.page.completed")}</DemoNote>}
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0">
          <div className="relative aspect-[16/9] overflow-hidden rounded-3xl bg-line">
            <Image src={w.cover} alt={w.title} fill priority sizes="(max-width: 1024px) 100vw, 640px" unoptimized={w.cover.startsWith("data:")} className={cn("object-cover", phase === "cancelled" && "grayscale")} />
          </div>
          <div className="mt-5 flex flex-wrap gap-1.5">
            <Badge tone={w.format === "online" ? "info" : "rust"}>
              {w.format === "online" ? <MonitorPlay className="size-3" /> : <MapPin className="size-3" />}
              {t(`workshop.${w.format}`)}
            </Badge>
            <Badge>{cat(w.category)}</Badge>
            <Badge tone="warn">{t(`ev.kind.${w.kind}`)}</Badge>
            {enrolled && <Badge tone="success">{t("workshop.enrolled")}</Badge>}
          </div>
          <h1 className="mt-3 font-display text-3xl leading-tight text-ink sm:text-4xl" lang={w.lang}>
            {w.title}
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed text-text/90" lang={w.lang}>
            {w.description}
          </p>
          <p className="mt-2 text-xs text-faint">{t("workshop.language", { lang: langName(w.lang) })}</p>
          {(!!w.materials?.length || w.terms || (w.level && w.level !== "any")) && (
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {w.level && w.level !== "any" && (
                <Card className="flex gap-3 p-4 text-sm">
                  <GraduationCap className="mt-0.5 size-4 shrink-0 text-rust" />
                  <div>
                    <p className="text-xs font-semibold text-faint">{t("ev.page.level")}</p>
                    <p className="font-semibold text-ink">{t(`level.${w.level}`)}</p>
                  </div>
                </Card>
              )}
              {!!w.materials?.length && (
                <Card className="flex gap-3 p-4 text-sm">
                  <Wrench className="mt-0.5 size-4 shrink-0 text-rust" />
                  <div>
                    <p className="text-xs font-semibold text-faint">{t("ev.page.materials")}</p>
                    <ul className="list-inside list-disc text-ink" lang={w.lang}>
                      {w.materials.map((m, i) => <li key={i}>{m}</li>)}
                    </ul>
                  </div>
                </Card>
              )}
              {w.terms && (
                <Card className="flex gap-3 p-4 text-sm sm:col-span-2">
                  <ScrollText className="mt-0.5 size-4 shrink-0 text-rust" />
                  <div>
                    <p className="text-xs font-semibold text-faint">{t("ev.page.terms")}</p>
                    <p className="whitespace-pre-line text-ink" lang={w.lang}>{w.terms}</p>
                  </div>
                </Card>
              )}
            </div>
          )}
          {w.program.length > 0 && <section className="mt-8">
            <h2 className="mb-3 text-lg font-bold text-ink">{t("workshop.program")}</h2>
            <ol className="relative space-y-3 border-s-2 border-dashed border-line ps-6">
              {w.program.map((p, i) => (
                <li key={i} className="relative" lang={w.lang}>
                  <span className="absolute -start-[33px] top-0.5 flex size-4 rotate-45 items-center justify-center rounded-[3px] bg-saffron" />
                  <p className="text-[15px] font-semibold text-ink">{p}</p>
                </li>
              ))}
            </ol>
          </section>}
          <Card className="mt-8 flex items-center gap-3 p-4">
            <Avatar name={host.name} color={host.avatarColor} size={48} href={`/profile/${host.username}`} />
            <Link href={`/profile/${host.username}`} className="min-w-0 flex-1">
              <span className="block text-xs text-muted">{t("workshop.hostLabel")}</span>
              <span className="block truncate font-bold text-ink hover:underline">{host.name}</span>
              <span className="block truncate text-xs text-muted" lang={host.contentLang}>
                {host.bio}
              </span>
            </Link>
            <FollowButton userId={host.id} />
          </Card>
        </div>

        <aside className="lg:sticky lg:top-32 lg:h-fit">
          <Card className="space-y-4 p-5">
            <p className="nums text-2xl font-bold text-ink">{w.price ? money(w.price) : t("learn.free")}</p>
            <ul className="space-y-3 text-sm">
              <li className="flex gap-3">
                <CalendarDays className="mt-0.5 size-4 shrink-0 text-rust" />
                <span>
                  <span className="block font-semibold text-ink">{date(w.startsAt, "long")}</span>
                  <span className="nums text-muted">
                    {date(w.startsAt, "time")}–{date(end, "time")} · {t("workshop.yourTime")}
                  </span>
                  {differentTz && <span className="nums block text-xs text-faint">{t("workshop.hostTime", { time: hostTime, tz: w.timeZone.split("/").pop()!.replace(/_/g, " ") })}</span>}
                </span>
              </li>
              <li className="flex gap-3">
                <Clock className="mt-0.5 size-4 shrink-0 text-rust" />
                <span className="text-ink">{t("workshop.duration", { count: Math.round(w.durationMin / 60 * 10) / 10 })}</span>
              </li>
              <li className="flex gap-3">
                {w.format === "online" ? <MonitorPlay className="mt-0.5 size-4 shrink-0 text-rust" /> : <MapPin className="mt-0.5 size-4 shrink-0 text-rust" />}
                <span className="text-ink">{w.format === "online" ? t("workshop.onlineHint") : `${w.city}, ${w.venue}`}</span>
              </li>
              {w.format === "online" && phase !== "cancelled" && (
                <li className="flex gap-3">
                  <Link2 className="mt-0.5 size-4 shrink-0 text-rust" />
                  <span className="min-w-0">
                    <span className="block text-xs font-semibold text-faint">{t("ev.page.link")}</span>
                    {/* The joining link is shown only to enrolled participants and the host. */}
                    {enrolled || isHost ? (
                      w.onlineUrl ? (
                        <a href={w.onlineUrl} target="_blank" rel="noopener noreferrer" className="block break-all font-semibold text-teal hover:underline">{w.onlineUrl}</a>
                      ) : (
                        <span className="text-muted">{t("ev.page.linkMissing")}</span>
                      )
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
                    <span className="block h-full rounded-full bg-teal" style={{ width: `${(w.seatsTaken / w.seatsTotal) * 100}%` }} />
                  </span>
                  <span className="nums mt-1 block text-xs text-faint">{t("workshop.taken", { taken: w.seatsTaken, total: w.seatsTotal })}</span>
                </span>
              </li>
            </ul>
            {isHost ? (
              <DemoNote>{t("workshop.youHost")}</DemoNote>
            ) : phase === "cancelled" ? (
              <Button disabled className="w-full">{t("ev.phase.cancelled")}</Button>
            ) : phase === "draft" ? null : past ? (
              <Button disabled className="w-full">{t("workshop.past")}</Button>
            ) : enrolled ? (
              <div className="space-y-2">
                <p className="flex items-center gap-2 rounded-xl bg-[#e1f3e6] px-3 py-2.5 text-sm font-bold text-[#1f6b3a]">
                  <CheckCircle2 className="size-4" /> {t("workshop.youAreIn")}
                </p>
                <Button variant="danger" className="w-full" onClick={() => setCancel(true)}>
                  {t("workshop.cancel")}
                </Button>
              </div>
            ) : (
              <Button className="w-full" size="lg" variant="accent" disabled={left <= 0} onClick={() => setConfirm(true)}>
                {left <= 0 ? t("workshop.full") : t("workshop.enroll")}
              </Button>
            )}
            <SaveButton type="workshop" id={w.id} variant="button" className="w-full justify-center" />
          </Card>
        </aside>
      </div>

      <Modal
        open={confirm}
        onClose={() => setConfirm(false)}
        title={t("workshop.confirmTitle")}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirm(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              onClick={() => {
                const ok = actions.enroll(w.id);
                setConfirm(false);
                toast(ok !== false ? { text: t("workshop.enrolledToast"), action: { label: t("learn.mine"), href: "/learn?tab=mine" } } : { text: t("workshop.full"), tone: "error" });
              }}
            >
              {t("workshop.confirm")}
            </Button>
          </>
        }
      >
        <div className="space-y-3 p-5 text-sm">
          <p className="font-bold text-ink" lang={w.lang}>
            {w.title}
          </p>
          <p className="text-muted">
            {date(w.startsAt, "long")}, {date(w.startsAt, "time")} · {w.format === "online" ? t("workshop.online") : w.city}
          </p>
          <p className="nums text-lg font-bold text-ink">{w.price ? money(w.price) : t("learn.free")}</p>
          {w.price && <DemoNote>{t("common.noPayment")}</DemoNote>}
        </div>
      </Modal>
      <Modal
        open={cancel}
        onClose={() => setCancel(false)}
        title={t("workshop.cancelTitle")}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setCancel(false)}>
              {t("common.keep")}
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                actions.cancelEnrollment(w.id);
                setCancel(false);
                toast({ text: t("workshop.cancelled"), tone: "info" });
              }}
            >
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
