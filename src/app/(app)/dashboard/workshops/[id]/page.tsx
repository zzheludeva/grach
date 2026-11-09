"use client";
import { use, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Archive, ArchiveRestore, ArrowLeft, Ban, CalendarPlus, Copy, ExternalLink, MapPin, MonitorPlay, Pencil, Send, Trash, UserMinus, Users } from "lucide-react";
import { useStore } from "@/lib/store";
import { useI18n } from "@/i18n/I18nProvider";
import { bookingsOf, seatsLeft, seatsTaken, sessionAudience, sessionPhase, sessionsOf } from "@/lib/workshops";
import type { WorkshopSession } from "@/lib/types";
import { Avatar, Badge, Card, DemoNote, EmptyState, SectionTitle } from "@/components/ui/primitives";
import { Button, ButtonLink } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { SessionModal } from "@/components/seller/SessionModal";
import { userById } from "@/lib/selectors";
import { cn } from "@/lib/utils";

/** Host's control room for one workshop: template info and every date with its participants. */
export default function ManageWorkshop({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { state, meId, actions } = useStore();
  const { t, date, money, relative } = useI18n();
  const router = useRouter();
  const toast = useToast();
  const d = state!.data;
  const w = d.workshops.find((x) => x.id === id);
  const [modal, setModal] = useState<{ session?: WorkshopSession; base?: WorkshopSession; key: number } | null>(null);
  const [cancel, setCancel] = useState<WorkshopSession | null>(null);
  if (!w) return <EmptyState title={t("errors.notFound")} action={<ButtonLink href="/dashboard/workshops">{t("nav.myWorkshops")}</ButtonLink>} />;
  if (w.hostId !== meId) return <EmptyState title={t("common.forbidden")} action={<ButtonLink href={`/learn/workshop/${id}`}>{t("ev.form.openPage")}</ButtonLink>} />;
  const all = sessionsOf(d, w.id);
  const groups = (["upcoming", "completed", "cancelled"] as const).map((ph) => ({ ph, list: all.filter((s) => sessionPhase(s) === ph) }));
  if (groups[1]) groups[1].list.reverse();

  return (
    <div className="mx-auto max-w-5xl">
      <Link href="/dashboard/workshops" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink">
        <ArrowLeft className="size-4 rtl:rotate-180" /> {t("nav.myWorkshops")}
      </Link>
      <Card className="mb-6 flex flex-col gap-4 p-4 sm:flex-row">
        <div className="relative aspect-[16/10] w-full shrink-0 overflow-hidden rounded-2xl bg-line/40 sm:w-56">
          {w.cover && <Image src={w.cover} alt="" fill sizes="224px" unoptimized={w.cover.startsWith("data:")} className="object-cover" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap gap-1.5">
            <Badge tone={w.status === "published" ? "success" : w.status === "draft" ? "warn" : "neutral"}>{t(`ws.status.${w.status}`)}</Badge>
            <Badge tone={w.format === "online" ? "info" : "rust"}>{w.format === "online" ? <MonitorPlay className="size-3" /> : <MapPin className="size-3" />} {t(`workshop.${w.format}`)}</Badge>
            <Badge>{t("workshop.duration", { count: Math.round((w.durationMin / 60) * 10) / 10 })}</Badge>
          </div>
          <h1 className="mt-2 font-display text-2xl leading-tight text-ink sm:text-3xl" lang={w.lang}>{w.title}</h1>
          <p className="nums mt-1 text-sm text-muted">{w.price ? money(w.price) : t("learn.free")} · {w.format === "offline" ? [w.city, w.venue].filter(Boolean).join(", ") : w.onlineInfo ?? t("workshop.online")}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <ButtonLink href={`/dashboard/workshops/${w.id}/edit`} size="sm" variant="soft"><Pencil className="size-3.5" /> {t("ws.manage.editTemplate")}</ButtonLink>
            {w.status === "draft" && (
              <Button size="sm" onClick={() => router.push(`/dashboard/workshops/${w.id}/edit`)}><Send className="size-3.5" /> {t("common.publish")}</Button>
            )}
            {w.status !== "draft" && (
              <ButtonLink href={`/learn/workshop/${w.id}`} size="sm" variant="ghost"><ExternalLink className="size-3.5" /> {t("ev.form.openPage")}</ButtonLink>
            )}
            {w.status === "published" && (
              <Button size="sm" variant="ghost" onClick={() => { actions.archiveWorkshop(w.id, true); toast({ text: t("ws.toast.archived"), tone: "info" }); }}>
                <Archive className="size-3.5" /> {t("ws.manage.archive")}
              </Button>
            )}
            {w.status === "archived" && (
              <Button size="sm" variant="ghost" onClick={() => { actions.archiveWorkshop(w.id, false); toast({ text: t("ws.toast.restored") }); }}>
                <ArchiveRestore className="size-3.5" /> {t("ws.manage.restore")}
              </Button>
            )}
            {w.status === "draft" && (
              <Button size="sm" variant="ghost" className="text-rose-deep" onClick={() => { actions.deleteWorkshopDraft(w.id); toast({ text: t("ev.toast.deleted"), tone: "info" }); router.push("/dashboard/workshops"); }}>
                <Trash className="size-3.5" /> {t("ev.page.deleteDraft")}
              </Button>
            )}
          </div>
        </div>
      </Card>

      <SectionTitle action={<Button size="sm" onClick={() => setModal({ key: Date.now() })}><CalendarPlus className="size-4" /> {t("ws.session.add")}</Button>}>
        {t("ws.manage.dates")}
      </SectionTitle>
      {w.status === "draft" && <DemoNote className="mb-3">{t("ws.manage.draftNote")}</DemoNote>}
      {w.status === "archived" && <DemoNote className="mb-3">{t("ws.manage.archivedNote")}</DemoNote>}
      {all.length === 0 ? (
        <EmptyState icon={<CalendarPlus className="size-6" />} title={t("ws.manage.noDates")} text={t("ws.manage.noDatesText")} action={<Button onClick={() => setModal({ key: Date.now() })}>{t("ws.session.add")}</Button>} />
      ) : (
        <div className="space-y-6">
          {groups.filter((g) => g.list.length).map((g) => (
            <section key={g.ph}>
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-faint">{t(`ws.phase.${g.ph}`)} · {g.list.length}</p>
              <ul className="space-y-3">
                {g.list.map((s) => {
                  const taken = seatsTaken(d, s);
                  const bookings = bookingsOf(d, s.id);
                  return (
                    <li key={s.id}>
                      <Card className={cn("p-4", g.ph !== "upcoming" && "opacity-80")}>
                        <div className="flex flex-wrap items-start gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="nums font-bold text-ink">{date(s.startsAt, "datetime")} – {date(s.endsAt, "time")}</p>
                            <p className="text-sm text-muted">
                              {s.format === "offline" ? [s.city, s.venue].filter(Boolean).join(", ") : s.onlineUrl ? s.onlineUrl : t("ws.session.noLink")}
                              {" · "}{s.timeZone.replace(/_/g, " ")}
                            </p>
                            <p className="nums text-sm text-muted">{s.price ? money(s.price) : t("learn.free")}</p>
                          </div>
                          <div className="w-40 shrink-0">
                            <p className="nums text-sm font-semibold text-ink"><Users className="me-1 inline size-4" />{t("ev.mine.seats", { taken, total: s.seatsTotal })}</p>
                            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-line"><div className="h-full rounded-full bg-teal" style={{ width: `${Math.min(100, (taken / s.seatsTotal) * 100)}%` }} /></div>
                            <p className="mt-0.5 text-xs text-faint">{t("workshop.seatsLeft", { count: seatsLeft(d, s) })}</p>
                          </div>
                        </div>
                        {(bookings.length > 0 || (s.externalSeats ?? 0) > 0) && (
                          <ul className="mt-3 divide-y divide-line rounded-xl border border-line">
                            {bookings.map((b) => {
                              const u = userById(d, b.userId);
                              return (
                                <li key={b.id} className="flex items-center gap-2 px-3 py-2 text-sm">
                                  {u && <Avatar name={u.name} color={u.avatarColor} size={28} />}
                                  <span className="min-w-0 flex-1 truncate font-semibold text-ink">{u?.name ?? "—"}</span>
                                  <span className="nums text-muted">{t("ws.seatsN", { count: b.seats })}</span>
                                  <span className="hidden text-xs text-faint sm:inline">{relative(b.at)}</span>
                                  {g.ph === "upcoming" && (
                                    <button onClick={() => { actions.removeBooking(b.id); toast({ text: t("ws.toast.bookingRemoved"), tone: "info" }); }} className="rounded-md p-1 text-faint hover:text-rose-deep" aria-label={t("ws.manage.removeBooking")} title={t("ws.manage.removeBooking")}>
                                      <UserMinus className="size-4" />
                                    </button>
                                  )}
                                </li>
                              );
                            })}
                            {(s.externalSeats ?? 0) > 0 && <li className="px-3 py-2 text-xs text-muted">{t("ws.manage.external", { count: s.externalSeats ?? 0 })}</li>}
                          </ul>
                        )}
                        <div className="mt-3 flex flex-wrap gap-2">
                          {g.ph === "upcoming" && (
                            <>
                              <Button size="sm" variant="soft" onClick={() => setModal({ session: s, key: Date.now() })}><Pencil className="size-3.5" /> {t("common.edit")}</Button>
                              <Button size="sm" variant="ghost" className="text-rose-deep" onClick={() => setCancel(s)}><Ban className="size-3.5" /> {t("ws.session.cancel")}</Button>
                            </>
                          )}
                          <Button size="sm" variant="ghost" onClick={() => setModal({ base: s, key: Date.now() })}><Copy className="size-3.5" /> {t("ws.session.repeat")}</Button>
                        </div>
                      </Card>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}

      {modal && <SessionModal key={modal.key} open onClose={() => setModal(null)} workshop={w} session={modal.session} base={modal.base} />}

      <Modal
        open={!!cancel}
        onClose={() => setCancel(null)}
        title={t("ws.session.cancelTitle")}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setCancel(null)}>{t("ev.cancel.keep")}</Button>
            <Button
              variant="danger"
              onClick={() => {
                if (!cancel) return;
                const n = actions.cancelSession(cancel.id);
                setCancel(null);
                toast({ text: n > 0 ? `${t("ws.toast.sessionCancelled")} · ${t("ev.cancel.text", { count: n })}` : t("ws.toast.sessionCancelled"), tone: "info" });
              }}
            >
              {t("ws.session.cancel")}
            </Button>
          </>
        }
      >
        {cancel && (
          <div className="space-y-2 p-5 text-sm">
            <p className="nums font-bold text-ink">{date(cancel.startsAt, "datetime")}</p>
            <p className="font-semibold text-ink">{sessionAudience(d, cancel).length > 0 ? t("ev.cancel.text", { count: sessionAudience(d, cancel).length }) : t("ws.session.cancelNobody")}</p>
            <p className="text-muted">{t("ws.session.cancelHint")}</p>
          </div>
        )}
      </Modal>
    </div>
  );
}
