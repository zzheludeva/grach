import type { SeedData } from "@/data/seed";
import type { Money, Workshop, WorkshopPhase } from "./types";

/** Lifecycle as people see it: a published event whose end time has passed is "completed". */
export function workshopPhase(w: Workshop, now = Date.now()): WorkshopPhase {
  if (w.status !== "published") return w.status;
  return new Date(w.endsAt).getTime() < now ? "completed" : "published";
}

/** Events listed publicly: published (incl. completed) and cancelled ones; never drafts. */
export function isPublicWorkshop(w: Workshop) {
  return w.status === "published" || w.status === "cancelled";
}

/** Upcoming and bookable. */
export function isBookable(w: Workshop, now = Date.now()) {
  return w.status === "published" && new Date(w.startsAt).getTime() > now;
}

/**
 * Fields whose change matters to participants. Editing anything else
 * (title typo, description wording, cover, seats) does NOT notify anyone.
 */
export const SIGNIFICANT_FIELDS = ["startsAt", "endsAt", "timeZone", "format", "place", "onlineUrl", "price", "program", "terms"] as const;
export type SignificantField = (typeof SIGNIFICANT_FIELDS)[number];

const moneyRaw = (m: Money | null) => (m ? `${m.amount}|${m.currency}` : "");
const placeRaw = (w: Pick<Workshop, "country" | "city" | "venue">) => [w.country, w.city ?? "", w.venue ?? ""].join("|");
const norm = (s?: string) => (s ?? "").trim().replace(/\s+/g, " ");

/** Raw (locale-neutral) values; they are formatted for each reader when the notification is shown. */
export function rawValue(w: Workshop, field: SignificantField): string {
  switch (field) {
    case "startsAt":
      return w.startsAt;
    case "endsAt":
      return w.endsAt;
    case "timeZone":
      return w.timeZone;
    case "format":
      return w.format;
    case "place":
      return w.format === "offline" ? placeRaw(w) : "";
    case "onlineUrl":
      return w.format === "online" ? norm(w.onlineUrl) : "";
    case "price":
      return moneyRaw(w.price);
    case "program":
      return w.program.map(norm).filter(Boolean).join("\n");
    case "terms":
      return norm(w.terms);
  }
}

export interface WorkshopChange {
  field: SignificantField;
  from: string;
  to: string;
}

/** Significant differences between the stored (published) version and the edited one. */
export function significantChanges(before: Workshop, after: Workshop): WorkshopChange[] {
  const out: WorkshopChange[] = [];
  for (const f of SIGNIFICANT_FIELDS) {
    const a = rawValue(before, f);
    const b = rawValue(after, f);
    if (f === "startsAt" || f === "endsAt") {
      if (new Date(a).getTime() !== new Date(b).getTime()) out.push({ field: f, from: a, to: b });
    } else if (a !== b) out.push({ field: f, from: a, to: b });
  }
  return out;
}

/**
 * People to notify about an event: enrolled participants + those who saved it.
 * A person who is both gets exactly one notification. The host is never notified.
 */
export function eventAudience(d: SeedData, w: Workshop): string[] {
  const ids = new Set<string>();
  d.enrollments.filter((e) => e.workshopId === w.id).forEach((e) => ids.add(e.userId));
  d.favorites.filter((f) => f.type === "workshop" && f.id === w.id).forEach((f) => ids.add(f.userId));
  ids.delete(w.hostId);
  return [...ids];
}

export function durationMin(w: Pick<Workshop, "startsAt" | "endsAt">) {
  return Math.max(0, Math.round((new Date(w.endsAt).getTime() - new Date(w.startsAt).getTime()) / 60000));
}

/* ---------- time-zone aware date inputs ---------- */

/** Offset (ms) of a time zone at a given instant. */
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
  ts = guess - tzOffset(new Date(ts), timeZone); // second pass handles DST edges
  return new Date(ts).toISOString();
}

/** ISO instant → "YYYY-MM-DDTHH:mm" wall-clock time in `timeZone` (for datetime-local inputs). */
export function isoToWall(iso: string, timeZone: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  const local = new Date(d.getTime() + tzOffset(d, timeZone));
  return local.toISOString().slice(0, 16);
}
