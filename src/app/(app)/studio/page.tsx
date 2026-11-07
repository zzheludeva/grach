"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import { Bookmark, FileText, FolderKanban, History, Lightbulb, Plus, Send, Sparkles, Trash, WandSparkles, Compass, LifeBuoy, ListChecks, Shuffle, MessageSquare } from "lucide-react";
import { useStore } from "@/lib/store";
import { useI18n } from "@/i18n/I18nProvider";
import { demoProvider, demoStart } from "@/lib/ai/demo";
import type { AIConversation, AIMessage, AIScenario, IdeaCard } from "@/lib/types";
import { Badge, Card, DemoNote, EmptyState, Textarea } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { useShell } from "@/components/shell/AppShell";
import { useToast } from "@/components/ui/toast";
import { cn, uid } from "@/lib/utils";

const STARTERS: { s: AIScenario; icon: typeof Sparkles; color: string }[] = [
  { s: "idea", icon: Shuffle, color: "#f66483" },
  { s: "develop", icon: Sparkles, color: "#ff9f00" },
  { s: "explore", icon: Compass, color: "#30b8b2" },
  { s: "block", icon: LifeBuoy, color: "#be6334" },
  { s: "plan", icon: ListChecks, color: "#15484c" },
];

export default function Studio() {
  const sp = useSearchParams();
  const router = useRouter();
  const { state, meId, actions } = useStore();
  const { t, locale, relative } = useI18n();
  const { openComposer } = useShell();
  const toast = useToast();
  const d = state!.data;
  const convs = d.conversations.filter((c) => c.userId === meId).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const ideas = d.ideas.filter((i) => i.userId === meId);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [live, setLive] = useState<boolean | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [panel, setPanel] = useState<"chat" | "history" | "ideas">("chat");
  const endRef = useRef<HTMLDivElement>(null);
  const active = convs.find((c) => c.id === activeId) ?? null;
  const contextPost = active?.contextPostId ? d.posts.find((p) => p.id === active.contextPostId) : undefined;

  useEffect(() => {
    fetch("/api/ai/chat")
      .then((r) => r.json())
      .then((j) => setLive(!!j.live))
      .catch(() => setLive(false));
  }, []);

  // ?post=ID → open a discussion about that post
  const postParam = sp.get("post");
  useEffect(() => {
    if (!postParam || live === null) return;
    const existing = convs.find((c) => c.contextPostId === postParam);
    if (existing) setActiveId(existing.id);
    else start("post", postParam);
    router.replace("/studio");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postParam, live]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [active?.messages.length, busy]);

  const now = () => new Date().toISOString();

  function start(s: AIScenario, postId?: string) {
    const first = demoStart(s, locale);
    const post = postId ? d.posts.find((p) => p.id === postId) : undefined;
    const c: AIConversation = {
      id: uid("conv"),
      userId: meId!,
      title: post ? post.title : t(`studio.scenario.${s}`),
      scenario: s,
      nodeId: first.nodeId,
      mode: live ? "live" : "demo",
      contextPostId: postId,
      messages: [{ id: uid("m"), role: "assistant", text: first.text, options: live ? undefined : first.options, at: now() }],
      createdAt: now(),
      updatedAt: now(),
    };
    actions.upsertConversation(c);
    setActiveId(c.id);
    setPanel("chat");
  }

  async function send(userText: string, optionNext?: string) {
    if (!active || !userText.trim() || busy) return;
    const userMsg: AIMessage = { id: uid("m"), role: "user", text: userText.trim(), at: now() };
    const title = active.messages.filter((m) => m.role === "user").length === 0 && !active.contextPostId ? userText.trim().slice(0, 48) : active.title;
    actions.appendMessages(active.id, [userMsg], { title });
    setText("");
    setBusy(true);
    try {
      if (active.mode === "live") {
        const history = [...active.messages, userMsg].map((m) => ({ role: m.role, text: m.text }));
        const res = await fetch("/api/ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ locale, scenario: active.scenario, history, postContext: contextPost ? { title: contextPost.title, body: contextPost.body } : undefined }),
        });
        const j = await res.json();
        if (!res.ok || !j.text) throw new Error(j.error ?? "error");
        actions.appendMessages(active.id, [{ id: uid("m"), role: "assistant", text: j.text, at: now() }]);
      } else {
        if (active.nodeId === "end") {
          actions.appendMessages(active.id, [{ id: uid("m"), role: "assistant", text: t("studio.scriptEnded"), at: now() }]);
        } else {
          const out = await demoProvider.reply({ scenario: active.scenario, locale, nodeId: active.nodeId, history: [], userText, optionNext });
          actions.appendMessages(active.id, [{ id: uid("m"), role: "assistant", text: out.text, ideas: out.ideas, options: out.options, at: now() }], { nodeId: out.nodeId });
        }
      }
    } catch {
      toast({ text: t("studio.error"), tone: "error" });
    } finally {
      setBusy(false);
    }
  }

  const saveIdea = (i: IdeaCard) => {
    if (ideas.some((x) => x.title === i.title)) return toast({ text: t("studio.alreadySaved"), tone: "info" });
    actions.saveIdea({ title: i.title, text: i.text, tags: [t(`studio.scenario.${active?.scenario ?? "idea"}`)], conversationId: active?.id });
    toast({ text: t("studio.ideaSaved") });
  };
  const exportToPost = (title: string, body: string) => openComposer({ title, body });
  const lastAssistant = active ? [...active.messages].reverse().find((m) => m.role === "assistant") : undefined;

  const Sidebar = (
    <div className="space-y-5">
      <Button className="w-full" onClick={() => { setActiveId(null); setPanel("chat"); }}>
        <Plus className="size-4" /> {t("studio.newSession")}
      </Button>
      <div>
        <p className="mb-2 px-1 text-xs font-bold uppercase tracking-wider text-faint">{t("studio.history")}</p>
        {convs.length === 0 ? (
          <p className="px-1 text-sm text-muted">{t("studio.noHistory")}</p>
        ) : (
          <ul className="space-y-1">
            {convs.map((c) => (
              <li key={c.id} className="group flex items-center gap-1">
                <button
                  onClick={() => { setActiveId(c.id); setPanel("chat"); }}
                  className={cn("min-w-0 flex-1 rounded-xl px-3 py-2 text-start", c.id === activeId ? "bg-ink text-white" : "hover:bg-ink-soft/60")}
                >
                  <span className="block truncate text-sm font-semibold">{c.title}</span>
                  <span className={cn("block truncate text-[11px]", c.id === activeId ? "text-white/60" : "text-faint")}>
                    {t(`studio.scenario.${c.scenario}`)} · {relative(c.updatedAt)}
                  </span>
                </button>
                <button
                  onClick={() => {
                    actions.deleteConversation(c.id);
                    if (activeId === c.id) setActiveId(null);
                  }}
                  className="rounded-lg p-1.5 text-faint opacity-0 hover:text-rose-deep group-hover:opacity-100 focus:opacity-100"
                  aria-label={t("common.delete")}
                >
                  <Trash className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );

  const IdeasPanel = (
    <div>
      <p className="mb-2 flex items-center gap-2 text-sm font-bold text-ink">
        <Lightbulb className="size-4 text-saffron" /> {t("studio.savedIdeas")}
      </p>
      {ideas.length === 0 ? (
        <p className="text-sm text-muted">{t("studio.noIdeas")}</p>
      ) : (
        <ul className="space-y-2">
          {ideas.map((i) => (
            <li key={i.id} className="rounded-xl border border-line bg-surface p-3">
              <div className="flex items-start gap-2">
                {i.isProject ? <FolderKanban className="mt-0.5 size-4 shrink-0 text-rust" /> : <Lightbulb className="mt-0.5 size-4 shrink-0 text-saffron" />}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-ink">{i.title}</p>
                  <p className="text-xs text-muted">{i.text}</p>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {!i.isProject ? (
                  <button onClick={() => { actions.makeProject(i.id); toast({ text: t("studio.projectCreated"), action: { label: t("nav.profile"), href: `/profile/${d.users.find((u) => u.id === meId)?.username}` } }); }} className="rounded-md bg-rust-soft px-2 py-1 text-[11px] font-bold text-rust">
                    {t("studio.toProject")}
                  </button>
                ) : (
                  <Badge tone="rust">{t("studio.project")}</Badge>
                )}
                <button onClick={() => exportToPost(i.title, i.text)} className="rounded-md bg-ink-soft px-2 py-1 text-[11px] font-bold text-ink">
                  {t("studio.toPost")}
                </button>
                <button onClick={() => actions.deleteIdea(i.id)} className="ms-auto rounded-md px-1.5 py-1 text-faint hover:text-rose-deep" aria-label={t("common.delete")}>
                  <Trash className="size-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 font-display text-3xl text-ink sm:text-4xl">
            <WandSparkles className="size-7 text-rust" /> {t("studio.title")}
          </h1>
          <p className="mt-1 max-w-2xl text-[15px] text-muted">{t("studio.subtitle")}</p>
        </div>
        {live !== null && (
          <Badge tone={live ? "success" : "warn"} className="text-[12px]">
            {live ? t("studio.liveMode") : t("studio.demoMode")}
          </Badge>
        )}
      </div>
      {live === false && <DemoNote className="mb-4">{t("studio.demoExplain")}</DemoNote>}

      <div className="mb-3 lg:hidden">
        <div className="flex gap-1 rounded-xl bg-ink-soft/60 p-1">
          {(["chat", "history", "ideas"] as const).map((p) => (
            <button key={p} onClick={() => setPanel(p)} className={cn("flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-semibold", panel === p ? "bg-surface text-ink shadow-sm" : "text-muted")}>
              {p === "chat" ? <MessageSquare className="size-4" /> : p === "history" ? <History className="size-4" /> : <Bookmark className="size-4" />}
              {t(`studio.panel.${p}`)}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[230px_1fr] xl:grid-cols-[230px_1fr_280px]">
        <aside className={cn("lg:block", panel === "history" ? "block" : "hidden")}>{Sidebar}</aside>

        <Card className={cn("flex min-h-[560px] flex-col overflow-hidden lg:flex", panel === "chat" ? "flex" : "hidden", "lg:h-[calc(100dvh-200px)]")}>
          {!active ? (
            <div className="flex-1 overflow-y-auto p-5 sm:p-8">
              <div className="mx-auto max-w-xl text-center">
                <div className="mx-auto mb-4 grid w-fit grid-cols-3 gap-1">
                  {["#f66483", "#ff9f00", "#30b8b2", "#be6334", "#15484c", "#ff9f00"].map((c, i) => (
                    <span key={i} className="size-4 rounded-[3px]" style={{ background: c, transform: `rotate(${i * 7 - 14}deg)` }} />
                  ))}
                </div>
                <h2 className="font-display text-3xl text-ink">{t("studio.pingPong")}</h2>
                <p className="mt-2 text-muted">{t("studio.pingPongText")}</p>
              </div>
              <div className="mx-auto mt-8 grid max-w-2xl gap-3 sm:grid-cols-2">
                {STARTERS.map(({ s, icon: Icon, color }) => (
                  <button key={s} onClick={() => start(s)} className="flex items-start gap-3 rounded-2xl border border-line bg-bg/50 p-4 text-start transition hover:-translate-y-0.5 hover:border-ink/40 hover:bg-surface">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl text-white" style={{ background: color }}>
                      <Icon className="size-5" />
                    </span>
                    <span>
                      <span className="block font-bold text-ink">{t(`studio.starter.${s}`)}</span>
                      <span className="block text-sm text-muted">{t(`studio.starterHint.${s}`)}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 border-b border-line px-4 py-3">
                <span className="min-w-0 flex-1 truncate font-bold text-ink">{active.title}</span>
                <Badge>{t(`studio.scenario.${active.scenario}`)}</Badge>
                {lastAssistant && (
                  <Button size="sm" variant="ghost" onClick={() => exportToPost(active.title, active.messages.filter((m) => m.role === "user").map((m) => m.text).join("\n\n"))}>
                    <FileText className="size-4" /> <span className="hidden sm:inline">{t("studio.toPost")}</span>
                  </Button>
                )}
              </div>
              {contextPost && (
                <div className="flex items-center gap-3 border-b border-line bg-bg/60 px-4 py-2.5">
                  <Image src={contextPost.images[0]} alt="" width={40} height={40} unoptimized={contextPost.images[0].startsWith("data:")} className="size-10 rounded-lg object-cover" />
                  <p className="min-w-0 flex-1 truncate text-sm text-muted">{t("studio.discussing", { title: contextPost.title })}</p>
                </div>
              )}
              <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-5" aria-live="polite">
                {active.messages.map((m, idx) => (
                  <div key={m.id} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                    <div className={cn("max-w-[88%]", m.role === "user" ? "" : "w-full sm:w-auto")}>
                      <div className={cn("whitespace-pre-line rounded-2xl px-4 py-3 text-[15px] leading-relaxed", m.role === "user" ? "rounded-ee-sm bg-ink text-white" : "rounded-es-sm bg-bg text-text")}>{m.text}</div>
                      {m.ideas && m.ideas.length > 0 && (
                        <div className="mt-2 grid gap-2 sm:grid-cols-2">
                          {m.ideas.map((i) => {
                            const saved = ideas.some((x) => x.title === i.title);
                            return (
                              <div key={i.id} className="rounded-2xl border border-saffron/40 bg-saffron-soft/40 p-3">
                                <p className="flex items-center gap-1.5 text-sm font-bold text-ink">
                                  <Lightbulb className="size-4 text-saffron" /> {i.title}
                                </p>
                                <p className="mt-1 text-[13px] text-text/85">{i.text}</p>
                                <div className="mt-2 flex flex-wrap gap-1.5">
                                  <button onClick={() => saveIdea(i)} disabled={saved} className="inline-flex items-center gap-1 rounded-md bg-surface px-2 py-1 text-[11px] font-bold text-ink disabled:opacity-60">
                                    <Bookmark className={cn("size-3", saved && "fill-ink")} /> {saved ? t("favorites.saved") : t("studio.saveIdea")}
                                  </button>
                                  <button onClick={() => exportToPost(i.title, i.text)} className="inline-flex items-center gap-1 rounded-md bg-surface px-2 py-1 text-[11px] font-bold text-ink">
                                    <FileText className="size-3" /> {t("studio.toPost")}
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                      {m.role === "assistant" && active.mode === "live" && idx > 0 && (
                        <button onClick={() => saveIdea({ id: m.id, title: active.title, text: m.text.slice(0, 220) })} className="mt-1 text-[11px] font-semibold text-muted hover:text-ink">
                          {t("studio.saveAsIdea")}
                        </button>
                      )}
                      {m.options && idx === active.messages.length - 1 && !busy && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {m.options.map((o) => (
                            <button key={o.next} onClick={() => send(o.label, o.next)} className="rounded-full border border-ink/20 bg-surface px-3.5 py-1.5 text-[13px] font-semibold text-ink hover:border-ink hover:bg-ink-soft/50">
                              {o.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {busy && (
                  <div className="flex items-center gap-1.5 px-2 text-sm text-muted">
                    {[0, 1, 2].map((i) => (
                      <span key={i} className="size-2 animate-bounce rounded-[2px] bg-teal" style={{ animationDelay: `${i * 120}ms` }} />
                    ))}
                    <span className="ms-1">{t("studio.thinking")}</span>
                  </div>
                )}
                <div ref={endRef} />
              </div>
              <form
                className="flex items-end gap-2 border-t border-line p-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  send(text);
                }}
              >
                <Textarea
                  rows={1}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send(text);
                    }
                  }}
                  placeholder={t("studio.placeholder")}
                  aria-label={t("studio.placeholder")}
                  className="min-h-11 resize-none"
                  maxLength={1500}
                />
                <Button type="submit" disabled={!text.trim() || busy} className="h-11 w-11 shrink-0 px-0" aria-label={t("post.send")}>
                  <Send className="size-4" />
                </Button>
              </form>
            </>
          )}
        </Card>

        <aside className={cn(panel === "ideas" ? "block" : "hidden", "lg:col-span-2 lg:block xl:col-span-1")}>{IdeasPanel}</aside>
      </div>
      {convs.length === 0 && ideas.length === 0 && panel === "ideas" && <EmptyState title={t("studio.noIdeas")} />}
    </div>
  );
}
