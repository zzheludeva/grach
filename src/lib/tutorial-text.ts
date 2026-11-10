import type { Tutorial } from "./types";

/**
 * Translatable text of a tutorial as a flat list (title, summary, detailed content, materials, step titles and
 * texts, link labels) and the way back. Used for on-page translation and for the translated PDF, so both always
 * show the same translation of the same (current) version. URLs, images and numbers are not part of the list.
 */
export function tutorialTexts(t: Tutorial, steps: Tutorial["steps"]): string[] {
  return [
    t.title,
    t.summary ?? "",
    t.content ?? "",
    ...t.materials,
    ...steps.flatMap((s) => [s.title ?? "", s.text ?? ""]),
    ...(t.links ?? []).map((l) => l.label),
  ];
}

/** A copy of the tutorial with translated texts; the original object is never modified. */
export function withTutorialTexts(t: Tutorial, steps: Tutorial["steps"], tr: string[]): { tut: Tutorial; steps: Tutorial["steps"] } {
  let i = 0;
  const next = () => tr[i++] ?? "";
  const title = next();
  const summary = next();
  const content = next();
  const materials = t.materials.map(() => next());
  const st = steps.map((s) => ({ ...s, title: next(), text: next() }));
  const links = (t.links ?? []).map((l) => ({ ...l, label: next() }));
  return { tut: { ...t, title, summary, content: t.content ? content : t.content, materials, links: t.links ? links : t.links }, steps: st };
}
