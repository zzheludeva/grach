import type { SeedData } from "@/data/seed";
import type { Enrollment, Money, SessionPhase, Workshop, WorkshopSession } from "./types";

/* ============================================================
 * Workshops = template (permanent info) + sessions (concrete runs).
 * Bookings belong to a session. There is no separate "event" entity.
 * ============================================================ */

export function sessionPhase(s: WorkshopSession, now = Date.now()): SessionPhase {
  if (s.status === "cancelled") return "cancelled";
  return new Date(s.endsAt).getTime() < now ? "completed" : "upcoming";
}

export const sessionsOf = (d: SeedData, workshopId: string) =>
  d.sessions.filter((s) => s.workshopId === workshopId).sort((a, b) => a.startsAt.localeCompare(b.startsAt));

export const bookingsOf = (d: SeedData, sessionId: string) => d.enrollments.filter((e) => e.sessionId === sessionId);

export function seatsTaken(d: SeedData, s: WorkshopSession) {
  return (s.externalSeats ?? 0) + bookingsOf(d, s.id).reduce((n, e) => n + e.seats, 0);
}
export const seatsLeft = (d: SeedData, s: WorkshopSession) => Math.max(0, s.seatsTotal - seatsTaken(d, s));

/** Bookable: template published, session scheduled, in the future and with free seats. */
export function isBookable(d: SeedData, s: WorkshopSession, now = Date.now()) {
  const w = d.workshops.find((x) => x.id === s.workshopId);
  return !!w && w.status === "published" && s.status === "scheduled" && new Date(s.startsAt).getTime() > now && seatsLeft(d, s) > 0;
}

/** Upcoming scheduled sessions of a published template, soonest first. */
export function upcomingSessions(d: SeedData, workshopId: string, now = Date.now()) {
  return sessionsOf(d, workshopId).filter((s) => s.status === "scheduled" && new Date(s.startsAt).getTime() > now);
}
export const nextSession = (d: SeedData, workshopId: string, now = Date.now()) => upcomingSessions(d, workshopId, now)[0];

/** Templates people can discover: published only. */
export const isPublicWorkshop = (w: Workshop) => w.status === "published";

/* ---------- significant changes of a session (notify its participants) ---------- */

export const SIGNIFICANT_FIELDS = ["startsAt", "endsAt", "timeZone", "format", "place", "onlineUrl", "price", "terms"] as const;
export type SignificantField = (typeof SIGNIFICANT_FIELDS)[number];

const moneyRaw = (m: Money | null) => (m ? `${m.amount}|${m.currency}` : "");
const norm = (s?: string) => (s ?? "").trim().replace(/\s+/g, " ");

export function rawValue(s: WorkshopSession, field: SignificantField): string {
  switch (field) {
    case "startsAt":
      return s.startsAt;
    case "endsAt":
      return s.endsAt;
    case "timeZone":
      return s.timeZone;
    case "format":
      return s.format;
    case "place":
      return s.format === "offline" ? [s.country, s.city ?? "", s.venue ?? ""].join("|") : "";
    case "onlineUrl":
      return s.format === "online" ? norm(s.onlineUrl) : "";
    case "price":
      return moneyRaw(s.price);
    case "terms":
      return norm(s.terms);
  }
}

export interface SessionChange {
  field: SignificantField;
  from: string;
  to: string;
}

export function significantChanges(before: WorkshopSession, after: WorkshopSession): SessionChange[] {
  const out: SessionChange[] = [];
  for (const f of SIGNIFICANT_FIELDS) {
    const a = rawValue(before, f);
    const b = rawValue(after, f);
    if (f === "startsAt" || f === "endsAt") {
      if (new Date(a).getTime() !== new Date(b).getTime()) out.push({ field: f, from: a, to: b });
    } else if (a !== b) out.push({ field: f, from: a, to: b });
  }
  return out;
}

/** Participants of a session (one entry per person even if they booked several seats). Never the host. */
export function sessionAudience(d: SeedData, s: WorkshopSession): string[] {
  return [...new Set(bookingsOf(d, s.id).map((e) => e.userId))].filter((u) => u !== s.hostId);
}

/**
 * How template edits reach sessions. Already published sessions keep their own copy
 * of price, terms and venue; the host chooses explicitly:
 *  - "new": only sessions created from now on;
 *  - "empty": also future sessions nobody has booked yet;
 *  - "all": every future session (booked participants are notified of the change).
 */
export type ApplyMode = "new" | "empty" | "all";

export function templateDiffForSessions(before: Workshop, after: Workshop) {
  return {
    price: moneyRaw(before.price) !== moneyRaw(after.price),
    terms: norm(before.terms) !== norm(after.terms),
    place: [before.country, before.city, before.venue].map(norm).join("|") !== [after.country, after.city, after.venue].map(norm).join("|"),
  };
}

export function applyTemplateToSession(s: WorkshopSession, w: Workshop, diff: ReturnType<typeof templateDiffForSessions>): WorkshopSession {
  return {
    ...s,
    price: diff.price ? w.price : s.price,
    terms: diff.terms ? w.terms : s.terms,
    ...(diff.place && s.format === "offline" ? { country: w.country, city: w.city, venue: w.venue } : {}),
  };
}

/* ---------- organizer reminders ---------- */

export type ReminderKind = "24h" | "1h";
const HOUR = 3_600_000;

/**
 * Which reminder is due for a session right now. Each window is sent at most once
 * (dedupe by `${sessionId}:${kind}`), only for scheduled sessions of published templates.
 * A window that was missed entirely (e.g. session created 30 min before start) is skipped.
 */
export function dueReminder(s: WorkshopSession, now: number, prefs: { remind24h: boolean; remind1h: boolean }, sent: Set<string>): ReminderKind | null {
  if (s.status !== "scheduled") return null;
  const start = new Date(s.startsAt).getTime();
  if (now >= start) return null;
  if (prefs.remind1h && now >= start - HOUR && !sent.has(`${s.id}:1h`)) return "1h";
  if (prefs.remind24h && now >= start - 24 * HOUR && now < start - HOUR && !sent.has(`${s.id}:24h`)) return "24h";
  return null;
}

/* ---------- legacy (one record = one date) → template + session ---------- */

export interface LegacyWorkshop {
  id: string;
  hostId: string;
  title: string;
  cover: string;
  category: Workshop["category"];
  startsAt: string;
  durationMin: number;
  timeZone: string;
  format: "online" | "offline";
  country: string;
  city?: string;
  venue?: string;
  onlineUrl?: string;
  price: Money | null;
  seatsTotal: number;
  seatsTaken: number;
  description: string;
  program: string[];
  lang: string;
  kind?: string;
  status?: string;
  endsAt?: string;
  level?: Workshop["level"];
  materials?: string[];
  terms?: string;
  technique?: string;
  createdAt?: string;
  updatedAt?: string;
  cancelledAt?: string;
}

/** Splits an old single-date workshop (or a former "event") into a template and its one session. */
export function splitLegacy(w: LegacyWorkshop, inAppSeats: number): { template: Workshop; session: WorkshopSession } {
  const created = w.createdAt ?? w.startsAt;
  const updated = w.updatedAt ?? created;
  const template: Workshop = {
    id: w.id,
    hostId: w.hostId,
    title: w.title,
    cover: w.cover,
    category: w.category,
    technique: w.technique,
    level: w.level ?? "any",
    description: w.description,
    program: w.program,
    materials: w.materials ?? [],
    format: w.format,
    price: w.price,
    durationMin: w.durationMin,
    terms: w.terms,
    country: w.country,
    city: w.city,
    venue: w.venue,
    lang: w.lang,
    status: w.status === "draft" ? "draft" : "published",
    createdAt: created,
    updatedAt: updated,
  };
  const session: WorkshopSession = {
    id: `${w.id}_s1`,
    workshopId: w.id,
    hostId: w.hostId,
    startsAt: w.startsAt,
    endsAt: w.endsAt ?? new Date(new Date(w.startsAt).getTime() + w.durationMin * 60000).toISOString(),
    timeZone: w.timeZone,
    format: w.format,
    country: w.country,
    city: w.city,
    venue: w.venue,
    onlineUrl: w.onlineUrl,
    seatsTotal: w.seatsTotal,
    externalSeats: Math.max(0, w.seatsTaken - inAppSeats),
    price: w.price,
    terms: w.terms,
    status: w.status === "cancelled" ? "cancelled" : "scheduled",
    createdAt: created,
    updatedAt: updated,
    cancelledAt: w.cancelledAt,
  };
  return { template, session };
}

export function legacyEnrollment(e: { userId: string; workshopId: string; at: string }): Enrollment {
  return { id: `e_${e.workshopId}_${e.userId}`, userId: e.userId, workshopId: e.workshopId, sessionId: `${e.workshopId}_s1`, seats: 1, at: e.at };
}

/* ---------- time-zone aware date inputs ---------- */

function tzOffset(instant: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(instant);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asUTC = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour") % 24, get("minute"), get("second"));
  return asUTC - instant.getTime();
}

/** "2026-11-20T18:30" wall-clock time in `timeZone` → ISO instant. */
export function wallToIso(local: string, timeZone: string): string {
  if (!local) return "";
  const [d, tm = "00:00"] = local.split("T");
  const [y, m, day] = d.split("-").map(Number);
  const [h, mi] = tm.split(":").map(Number);
  const guess = Date.UTC(y, m - 1, day, h, mi);
  let ts = guess - tzOffset(new Date(guess), timeZone);
  ts = guess - tzOffset(new Date(ts), timeZone);
  return new Date(ts).toISOString();
}

/** ISO instant → "YYYY-MM-DDTHH:mm" wall-clock time in `timeZone`. */
export function isoToWall(iso: string, timeZone: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  return new Date(d.getTime() + tzOffset(d, timeZone)).toISOString().slice(0, 16);
}
