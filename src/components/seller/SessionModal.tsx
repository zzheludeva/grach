"use client";
import { useMemo, useState } from "react";
import { useStore, type SessionInput } from "@/lib/store";
import { useI18n } from "@/i18n/I18nProvider";
import { REGIONS } from "@/lib/regions";
import type { Workshop, WorkshopSession } from "@/lib/types";
import { isoToWall, seatsTaken, sessionAudience, significantChanges, wallToIso, type SessionChange } from "@/lib/workshops";
import { DemoNote, Field, Input, Select } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { ChangeList } from "@/components/common/ChangeList";
import { COUNTRY_TZ, TIME_ZONES } from "./WorkshopForm";

const ms = (x: string) => Date.parse(`${x}:00Z`);
const wall = (n: number) => new Date(n).toISOString().slice(0, 16);

/**
 * Create or edit one date of a workshop. A new session copies price, terms and venue
 * from the template; `base` lets the host repeat an existing session with a new date.
 */
export function SessionModal({
  open,
  onClose,
  workshop,
  session,
  base,
}: {
  open: boolean;
  onClose: () => void;
  workshop: Workshop;
  session?: WorkshopSession;
  base?: WorkshopSession;
}) {
  const { t, money } = useI18n();
  const { state, settings, actions } = useStore();
  const toast = useToast();
  const d = state!.data;
  const src = session ?? base;
  const tz0 = src?.timeZone ?? (workshop.format === "offline" ? COUNTRY_TZ[workshop.country] ?? settings.timeZone : settings.timeZone);
  const shift = base && !session ? 7 * 86400000 : 0; // repeating: same time one week later
  const [timeZone, setTimeZone] = useState(tz0);
  const [start, setStart] = useState(src ? wall(ms(isoToWall(src.startsAt, tz0)) + shift) : "");
  const [end, setEnd] = useState(src ? wall(ms(isoToWall(src.endsAt, tz0)) + shift) : "");
  const [city, setCity] = useState(src?.city ?? workshop.city ?? "");
  const [venue, setVenue] = useState(src?.venue ?? workshop.venue ?? "");
  const [url, setUrl] = useState(session?.onlineUrl ?? "");
  const [seats, setSeats] = useState(String(src?.seatsTotal ?? 10));
  const [err, setErr] = useState<Record<string, string>>({});
  const [confirm, setConfirm] = useState<{ changes: SessionChange[]; audience: number } | null>(null);
  const taken = session ? seatsTaken(d, session) : 0;
  const cities = workshop.country === "RU" || workshop.country === "BR" ? REGIONS[workshop.country].cities : [];
  const price = session ? session.price : workshop.price;

  const input = useMemo<SessionInput>(
    () => ({
      startsAt: wallToIso(start, timeZone),
      endsAt: wallToIso(end, timeZone),
      timeZone,
      format: session?.format ?? workshop.format,
      country: session?.country ?? workshop.country,
      city: workshop.format === "offline" ? city.trim() : undefined,
      venue: workshop.format === "offline" ? venue.trim() : undefined,
      onlineUrl: workshop.format === "online" ? url.trim() || undefined : undefined,
      seatsTotal: Math.max(1, Math.floor(Number(seats || 0))),
      price: session ? session.price : workshop.price,
      terms: session ? session.terms : workshop.terms,
    }),
    [start, end, timeZone, city, venue, url, seats, session, workshop],
  );

  const validate = () => {
    const e: Record<string, string> = {};
    if (!start) e.start = t("ev.v.start");
    else if (new Date(input.startsAt).getTime() < Date.now()) e.start = t("ev.v.startPast");
    if (!end || (start && ms(end) <= ms(start))) e.end = t("ev.v.end");
    if (workshop.format === "offline") {
      if (!city.trim()) e.city = t("ev.v.city");
      if (!venue.trim()) e.venue = t("ev.v.venue");
    } else if (url.trim() && !/^https:\/\/\S+\.\S+/.test(url.trim())) e.url = t("ev.v.urlInvalid");
    const n = Math.floor(Number(seats));
    if (!(n >= 1)) e.seats = t("ev.v.seats");
    else if (n < taken) e.seats = t("ev.v.seatsTaken", { count: taken });
    return e;
  };

  const commit = () => {
    const res = actions.saveSession(workshop.id, input, session?.id);
    if ("error" in res) return toast({ text: res.error === "seats" ? t("ev.v.seatsTaken", { count: taken }) : t("common.forbidden"), tone: "error" });
    toast({ text: res.notified > 0 ? t("ev.toast.notified", { count: res.notified }) : session ? t("ws.toast.sessionSaved") : t("ws.toast.sessionAdded") });
    setConfirm(null);
    onClose();
  };

  const submit = () => {
    const e = validate();
    setErr(e);
    if (Object.keys(e).length) return;
    if (session) {
      const changes = significantChanges(session, { ...session, ...input });
      if (changes.length) return setConfirm({ changes, audience: sessionAudience(d, session).length });
    }
    commit();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={confirm ? t("ev.notify.title") : session ? t("ws.session.edit") : t("ws.session.add")}
      footer={
        confirm ? (
          <>
            <Button variant="ghost" onClick={() => setConfirm(null)}>{t("common.back")}</Button>
            <Button onClick={commit}>{confirm.audience > 0 ? t("ev.notify.confirm") : t("ev.form.saveChanges")}</Button>
          </>
        ) : (
          <>
            <Button variant="ghost" onClick={onClose}>{t("common.cancel")}</Button>
            <Button onClick={submit}>{session ? t("ev.form.saveChanges") : t("ws.session.publish")}</Button>
          </>
        )
      }
    >
      {confirm ? (
        <div className="space-y-3 p-5 text-sm">
          <p className="font-semibold text-ink">{confirm.audience > 0 ? t("ws.session.notifyText", { count: confirm.audience }) : t("ws.session.notifyNobody")}</p>
          <ChangeList changes={confirm.changes} />
        </div>
      ) : (
        <div className="space-y-4 p-5">
          <p className="text-sm font-bold text-ink" lang={workshop.lang}>{workshop.title}</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("ev.form.startsAt")} error={err.start}>
              {(id, dsc) => (
                <Input
                  id={id}
                  type="datetime-local"
                  aria-describedby={dsc}
                  aria-invalid={!!err.start}
                  value={start}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v && start && end && ms(end) > ms(start)) setEnd(wall(ms(v) + ms(end) - ms(start)));
                    else if (v) setEnd(wall(ms(v) + workshop.durationMin * 60000));
                    setStart(v);
                  }}
                />
              )}
            </Field>
            <Field label={t("ev.form.endsAt")} error={err.end}>
              {(id, dsc) => <Input id={id} type="datetime-local" aria-describedby={dsc} aria-invalid={!!err.end} value={end} min={start} onChange={(e) => setEnd(e.target.value)} />}
            </Field>
          </div>
          <Field label={t("ev.form.timeZone")} hint={t("ev.form.timeZoneHint")}>
            {(id, dsc) => (
              <Select id={id} aria-describedby={dsc} value={timeZone} onChange={(e) => setTimeZone(e.target.value)}>
                {TIME_ZONES.map((z) => <option key={z} value={z}>{z.replace(/_/g, " ")}</option>)}
              </Select>
            )}
          </Field>
          {workshop.format === "offline" ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t("ev.form.city")} error={err.city}>
                {(id, dsc) => (
                  <>
                    <Input id={id} aria-describedby={dsc} aria-invalid={!!err.city} list={`${id}-c`} value={city} onChange={(e) => setCity(e.target.value)} />
                    <datalist id={`${id}-c`}>{cities.map((c) => <option key={c} value={c} />)}</datalist>
                  </>
                )}
              </Field>
              <Field label={t("ev.form.venue")} error={err.venue}>
                {(id, dsc) => <Input id={id} aria-describedby={dsc} aria-invalid={!!err.venue} value={venue} onChange={(e) => setVenue(e.target.value)} />}
              </Field>
            </div>
          ) : (
            <Field label={t("ev.form.onlineUrl")} hint={t("ws.session.urlHint")} error={err.url}>
              {(id, dsc) => <Input id={id} type="url" placeholder="https://" aria-describedby={dsc} aria-invalid={!!err.url} value={url} onChange={(e) => setUrl(e.target.value)} />}
            </Field>
          )}
          <Field label={t("ev.form.seats")} error={err.seats} className="max-w-xs">
            {(id, dsc) => <Input id={id} type="number" min={Math.max(1, taken)} aria-describedby={dsc} aria-invalid={!!err.seats} value={seats} onChange={(e) => setSeats(e.target.value)} />}
          </Field>
          <DemoNote>
            {t("ws.session.snapshot", { price: price ? money(price) : t("learn.free") })}
          </DemoNote>
        </div>
      )}
    </Modal>
  );
}
