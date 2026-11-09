"use client";
import { use, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Send } from "lucide-react";
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
  const d = state!.data;
  const other = userByName(d, decodeURIComponent(username));
  const [text, setText] = useState("");
  const end = useRef<HTMLDivElement>(null);
  const msgs = other ? d.messages.filter((m) => (m.fromId === meId && m.toId === other.id) || (m.toId === meId && m.fromId === other.id)) : [];
  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
  }, [msgs.length]);
  if (!other) return <EmptyState title={t("errors.notFound")} />;
  if (other.id === meId) return <EmptyState title={t("messages.self")} />;
  const send = () => {
    actions.sendMessage(other.id, text);
    setText("");
  };
  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/messages" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink">
        <ArrowLeft className="size-4" /> {t("messages.title")}
      </Link>
      <Card className="flex h-[calc(100dvh-220px)] min-h-[420px] flex-col overflow-hidden">
        <Link href={`/profile/${other.username}`} className="flex items-center gap-3 border-b border-line p-4 hover:bg-bg">
          <Avatar name={other.name} color={other.avatarColor} size={40} />
          <div className="min-w-0">
            <p className="truncate font-bold text-ink">{other.name}</p>
            <p className="truncate text-xs text-muted">@{other.username}</p>
          </div>
        </Link>
        <div className="flex-1 space-y-2 overflow-y-auto bg-bg/60 p-4">
          <DemoNote className="mb-3">{t("messages.demo")}</DemoNote>
          {msgs.length === 0 && <p className="text-center text-sm text-muted">{t("messages.start", { name: other.name })}</p>}
          {msgs.map((m) => (
            <div key={m.id} className={cn("flex", m.fromId === meId ? "justify-end" : "justify-start")}>
              <div className={cn("max-w-[80%] rounded-2xl px-3.5 py-2 text-sm", m.fromId === meId ? "rounded-ee-sm bg-ink text-white" : "rounded-es-sm bg-surface text-text shadow-sm")}>
                {m.image && (
                  <a href={m.image} target="_blank" rel="noopener noreferrer" className="mb-1.5 block overflow-hidden rounded-xl" aria-label={t("ord.openPhoto")}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={m.image} alt={t("ord.readyPhoto")} className="max-h-64 w-full object-cover" />
                  </a>
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
            className="min-h-11 resize-none"
          />
          <Button type="submit" disabled={!text.trim()} className="h-11 w-11 shrink-0 px-0" aria-label={t("post.send")}>
            <Send className="size-4" />
          </Button>
        </form>
      </Card>
    </div>
  );
}
