import type { AIConversation, Project, ProjectItem, ProjectStatus } from "./types";
import { uid } from "./utils";

export const PROJECT_STATUSES: ProjectStatus[] = ["idea", "planning", "in_progress", "paused", "done"];
export const PROJECT_TONE = { idea: "warn", planning: "info", in_progress: "success", paused: "neutral", done: "dark" } as const;

/** First sentence of the idea, cut on a word boundary. */
function shortTitle(text: string) {
  const one = text.replace(/\s+/g, " ").trim().split(/(?<=[.!?])\s/)[0];
  if (one.length <= 60) return one;
  const cut = one.slice(0, 60);
  return `${cut.slice(0, Math.max(30, cut.lastIndexOf(" ")))}…`;
}

const item = (text: string, at: string): ProjectItem => ({ id: uid("pi"), text, at });

/**
 * Turns a studio conversation into project fields. Only what is actually present is
 * extracted: the first user message (idea), idea cards (recommendations) and numbered
 * steps from the assistant (plan). Anything missing stays empty to be filled later.
 */
export function projectFromConversation(c: AIConversation, picked?: { title: string; text: string }): Partial<Project> & { title: string } {
  const at = new Date().toISOString();
  const firstUser = c.messages.find((m) => m.role === "user")?.text.trim() ?? "";
  const ideas = c.messages.flatMap((m) => m.ideas ?? []);
  const recs = picked ? [picked] : ideas.map((i) => ({ title: i.title, text: i.text }));
  const plan: string[] = [];
  for (const m of c.messages) {
    if (m.role !== "assistant") continue;
    const steps = m.text
      .split("\n")
      .map((l) => l.trim().match(/^\d+[.)]\s+(.+)/)?.[1])
      .filter((x): x is string => !!x);
    if (steps.length >= 2) plan.splice(0, plan.length, ...steps); // keep the latest plan
  }
  const title = picked?.title ?? (c.scenario === "free" || c.scenario === "idea" ? shortTitle(firstUser) || c.title : c.title || shortTitle(firstUser)) ?? "—";
  return {
    title,
    idea: picked?.text ?? firstUser,
    description: picked?.text ?? "",
    recommendations: recs.map((r) => ({ ...item(`${r.title}: ${r.text}`, at), conversationId: c.id })),
    plan: plan.map((p) => item(p, at)),
    status: plan.length ? "planning" : "idea",
    conversationId: c.id,
  };
}

/** Context passed to the assistant when continuing a project. */
export function projectContext(p: Project) {
  return {
    title: p.title,
    idea: p.idea,
    description: p.description,
    technique: p.technique,
    materials: p.materials,
    tools: p.tools,
    done: p.checklist.filter((c) => c.done).map((c) => c.text),
    open: (p.checklist.length ? p.checklist.filter((c) => !c.done) : p.plan).map((c) => c.text),
    notes: p.notes.map((n) => n.text),
  };
}
