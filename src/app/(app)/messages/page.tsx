"use client";
import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { useStore } from "@/lib/store";
import { useI18n } from "@/i18n/I18nProvider";
import { userById } from "@/lib/selectors";
import { Avatar, Card, EmptyState, PageHeader, DemoNote } from "@/components/ui/primitives";
import { ButtonLink } from "@/components/ui/button";

export default function Messages() {
  const { state, meId } = useStore();
  const { t, relative } = useI18n();
  const d = state!.data;
  const mine = d.messages.filter((m) => m.fromId === meId || m.toId === meId);
  const threads = [...new Set(mine.map((m) => (m.fromId === meId ? m.toId : m.fromId)))].map((id) => {
    const msgs = mine.filter((m) => m.fromId === id || m.toId === id);
    return { user: userById(d, id)!, last: msgs[msgs.length - 1] };
  });
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={t("messages.title")} />
      <DemoNote className="mb-4">{t("messages.demo")}</DemoNote>
      {threads.length === 0 ? (
        <EmptyState icon={<MessageCircle className="size-6" />} title={t("messages.empty")} text={t("messages.emptyText")} action={<ButtonLink href="/market">{t("nav.market")}</ButtonLink>} />
      ) : (
        <Card className="divide-y divide-line">
          {threads.map(({ user, last }) => (
            <Link key={user.id} href={`/messages/${user.username}`} className="flex items-center gap-3 p-4 hover:bg-bg">
              <Avatar name={user.name} color={user.avatarColor} size={44} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold text-ink">{user.name}</p>
                <p className="truncate text-sm text-muted">{last.text}</p>
              </div>
              <span className="shrink-0 text-xs text-faint">{relative(last.at)}</span>
            </Link>
          ))}
        </Card>
      )}
    </div>
  );
}
