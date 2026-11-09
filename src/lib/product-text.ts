/**
 * Products have one main description (`summary`, shown at the top of the product page and in search) and an
 * optional, separate story (`story`: idea, inspiration, process). Older data also had a long `description`
 * that the product page used to print inside the story block. It is folded into the main description once
 * (no text is lost) and is no longer edited or shown on its own.
 */
export function mainDescription(summary: string, legacyDescription?: string) {
  const s = (summary ?? "").trim();
  const d = (legacyDescription ?? "").trim();
  if (!d || s.includes(d)) return s;
  if (!s || d.includes(s)) return d;
  return `${s}\n\n${d}`;
}

/** A story that merely repeats the description is not a story. */
export function cleanStory(story: string, summary: string, legacyDescription?: string) {
  const st = (story ?? "").trim();
  if (!st) return "";
  if (st === (legacyDescription ?? "").trim() || st === (summary ?? "").trim()) return "";
  return st;
}
