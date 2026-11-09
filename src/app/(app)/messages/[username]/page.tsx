"use client";
import { use, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CalendarDays, Package, Send } from "lucide-react";
import { BackLink } from "@/components/common/BackLink";
import { useStore } from "@/lib/store";
import { useI18n } from "@/i18n/I18nProvider";
import { userByName } from "@/lib/selectors";
import { Avatar, Card, DemoNote, EmptyState, Textarea } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function Thread({ params }: { params: Promise<{ username: string }> }) {
  const { username } = use(params);
  const { state, meId, actions } = useStore();
  const { t, date } = useI18n();
  const sp = useSearchParams();
  const d = state!.data;
  const other = userByName(d, decodeURIComponent(username));
  // Context of the conversation (opened from a workshop, a participant list or an order). Kept on sent messages.
  const ctxWorkshop = d.workshops.find((w) => w.id === sp.get("workshop"));
  const ctxSession = ctxWorkshop ? d.sessions.find((s) => s.id === sp.get("session") && s.workshopId === ctxWorkshop.id) : undefined;
  const ctxOrder = d.orders.find((o) => o.id === sp.get("order") && (o.buyerId === meId || o.sellerId === meId));
  const [text, setText] = useState("");
  const end = useRef<HTMLDivElement>(null);
  const msgs = other ? d.messages.filter((m) => (m.fromId === meId && m.toId === other.id) || (m.toId === meId && m.fromId === other.id)) : [];
  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
  }, [msgs.length]);
  // Opening the conversation reads its message notifications.
  const unreadNotes = other ? d.notifications.filter((n) => n.userId === meId && !n.read && n.actorId === other.id && n.key.startsWith("newMessage")).map((n) => n.id) : [];
  const unreadKey = unreadNotes.join(",");
  useEffect(() => {
    if (unreadKey) unreadKey.split(",").forEach((id) => actions.markRead(id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unreadKey]);
  if (!other) return <EmptyState title={t("errors.notFound")} />;
  if (other.id === meId) return <EmptyState title={t("messages.self")} />;
  const send = () => {
    if (!text.trim()) return;
    actions.sendMessage(other.id, text, { workshopId: ctxWorkshop?.id, sessionId: ctxSession?.id, orderId: ctxOrder?.id });
    setText("");
  };
  const wsTitle = (id?: string) => d.workshops.find((w) => w.id === id)?.title;
  return (
    <div className="mx-auto max-w-3xl">
      <BackLink fallback="/messages" fallbackLabel={t("messages.title")} className="mb-2" />
      <Card className="flex h-[calc(100dvh-230px)] min-h-[380px] flex-col overflow-hidden lg:h-[calc(100dvh-260px)]">
        <Link href={`/profile/${other.username}`} className="flex items-center gap-3 border-b border-line p-4 hover:bg-bg">
          <Avatar name={other.name} color={other.avatarColor} size={40} />
          <div className="min-w-0">
            <p className="truncate font-bold text-ink">{other.name}</p>
            <p className="truncate text-xs text-muted">@{other.username}</p>
          </div>
        </Link>
        {(ctxWorkshop || ctxOrder) && (
          <div className="flex items-center gap-2 border-b border-line bg-teal-soft/40 px-4 py-2 text-sm">
            {ctxWorkshop ? <CalendarDays className="size-4 shrink-0 text-teal" /> : <Package className="size-4 shrink-0 text-teal" />}
            <span className="line-clamp-2 min-w-0 flex-1 text-ink">
              {ctxWorkshop
                ? `${t("msgx.aboutWorkshop", { title: ctxWorkshop.title })}${ctxSession ? ` · ${date(ctxSession.startsAt, "datetime")}` : ""}`
                : t("msgx.aboutOrder", { number: ctxOrder!.number })}
            </span>
            <Link
              href={ctxWorkshop ? (ctxWorkshop.hostId === meId ? `/dashboard/workshops/${ctxWorkshop.id}` : `/learn/workshop/${ctxWorkshop.id}${ctxSession ? `?session=${ctxSession.id}` : ""}`) : `/orders/${ctxOrder!.id}`}
              className="shrink-0 font-semibold text-teal hover:underline"
            >
              {ctxWorkshop ? t("msgx.toWorkshop") : t("ord.openOrder")}
            </Link>
          </div>
        )}
        <div className="flex-1 space-y-2 overflow-y-auto bg-bg/60 p-3 sm:p-4">
          <DemoNote className="mb-3">{t("messages.demo")}</DemoNote>
          {msgs.length === 0 && <p className="text-center text-sm text-muted">{t("messages.start", { name: other.name })}</p>}
          {msgs.map((m) => (
            <div key={m.id} className={cn("flex", m.fromId === meId ? "justify-end" : "justify-start")}>
              <div className={cn("max-w-[85%] break-words rounded-2xl px-3.5 py-2 text-sm sm:max-w-[80%]", m.fromId === meId ? "rounded-ee-sm bg-ink text-white" : "rounded-es-sm bg-surface text-text shadow-sm")}>
                {m.image && (
                  <a href={m.image} target="_blank" rel="noopener noreferrer" className="mb-1.5 block overflow-hidden rounded-xl" aria-label={t("ord.openPhoto")}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={m.image} alt={t("ord.readyPhoto")} className="max-h-64 w-full object-cover" />
                  </a>
                )}
                {m.workshopId && wsTitle(m.workshopId) && (
                  <Link
                    href={d.workshops.find((w) => w.id === m.workshopId)?.hostId === meId ? `/dashboard/workshops/${m.workshopId}` : `/learn/workshop/${m.workshopId}${m.sessionId ? `?session=${m.sessionId}` : ""}`}
                    className={cn("mb-1 flex items-center gap-1 text-xs font-semibold underline", m.fromId === meId ? "text-white/80" : "text-teal")}
                  >
                    <CalendarDays className="size-3 shrink-0" /> <span className="truncate">{wsTitle(m.workshopId)}</span>
                  </Link>
                )}
                {m.orderId && (
                  <Link href={`/orders/${m.orderId}`} className={cn("mb-1 block text-xs font-semibold underline", m.fromId === meId ? "text-white/80" : "text-teal")}>
                    {t("ord.openOrder")}
                  </Link>
                )}
                {m.text && <p className="whitespace-pre-line">{m.text}</p>}
                <p className={cn("mt-0.5 text-[10px]", m.fromId === meId ? "text-white/60" : "text-faint")}>{date(m.at, "datetime")}</p>
              </div>
            </div>
          ))}
          <div ref={end} />
        </div>
        <form
          className="flex items-end gap-2 border-t border-line p-3"
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
        >
          <Textarea
            rows={1}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder={t("messages.placeholder")}
            aria-label={t("messages.placeholder")}
            enterKeyHint="send"
            maxLength={4000}
            className="max-h-36 min-h-11 resize-none text-base sm:text-sm"
          />
          <Button type="submit" disabled={!text.trim()} className="h-11 w-11 shrink-0 px-0" aria-label={t("post.send")}>
            <Send className="size-4" />
          </Button>
        </form>
      </Card>
    </div>
  );
}
