"use client";
import Link from "next/link";
import { Bell, Heart, MessageSquare, Package, UserPlus, CalendarDays, Info, Check, ArrowRight } from "lucide-react";
import { useStore } from "@/lib/store";
import { useI18n } from "@/i18n/I18nProvider";
import { userById } from "@/lib/selectors";
import { Avatar, Card, EmptyState, PageHeader } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChangeList } from "@/components/common/ChangeList";

const ICONS = { like: Heart, comment: MessageSquare, follow: UserPlus, order: Package, workshop: CalendarDays, system: Info };

/** Params starting with "@" are i18n keys (e.g. a status); "startsAt" is formatted in the reader's time zone. */
function useParams() {
  const { t, date } = useI18n();
  return (p: Record<string, string | number> = {}) =>
    Object.fromEntries(
      Object.entries(p).map(([k, v]) => [k, typeof v === "string" && v.startsWith("@") ? t(v.slice(1)) : k === "startsAt" && typeof v === "string" ? date(v, "datetime") : v]),
    );
}

export default function Notifications() {
  const { state, meId, actions } = useStore();
  const { t, relative } = useI18n();
  const resolve = useParams();
  const d = state!.data;
  const list = d.notifications.filter((n) => n.userId === meId).sort((a, b) => b.at.localeCompare(a.at));
  const unread = list.filter((n) => !n.read).length;
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title={t("notifications.title")}
        subtitle={unread ? t("notifications.unread", { count: unread }) : t("notifications.allRead")}
        actions={unread > 0 && <Button variant="secondary" onClick={actions.markAllRead}>{t("notifications.markAll")}</Button>}
      />
      {list.length === 0 ? (
        <EmptyState icon={<Bell className="size-6" />} title={t("notifications.empty")} />
      ) : (
        <Card className="divide-y divide-line overflow-hidden">
          {list.map((n) => {
            const actor = n.actorId ? userById(d, n.actorId) : undefined;
            const Icon = ICONS[n.type];
            const content = (
              <>
                <div className="relative shrink-0">
                  {actor ? <Avatar name={actor.name} color={actor.avatarColor} size={42} /> : <span className="flex size-[42px] items-center justify-center rounded-full bg-ink-soft text-ink"><Icon className="size-5" /></span>}
                  {actor && (
                    <span className="absolute -bottom-1 -end-1 flex size-5 items-center justify-center rounded-full bg-surface text-ink shadow">
                      <Icon className="size-3" />
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-text">{t(`notifications.k.${n.key}`, { name: actor?.name ?? "", ...resolve(n.params) })}</p>
                  <p className="text-xs text-faint">{relative(n.at)}</p>
                </div>
                {!n.read && <span className="size-2.5 shrink-0 rounded-full bg-rose" aria-label={t("notifications.new")} />}
              </>
            );
            const cls = cn("flex items-center gap-3 p-4 transition-colors hover:bg-bg", !n.read && "bg-teal-soft/30");
            // Event updates carry old → new values, so they get an expanded card with explicit actions.
            if (n.changes?.length || n.key === "eventCancelled" || n.key === "sessionCancelled")
              return (
                <div key={n.id} className={cn("flex gap-3 p-4", !n.read && "bg-teal-soft/30")}>
                  <span className={cn("flex size-[42px] shrink-0 items-center justify-center rounded-full", n.key === "eventCancelled" || n.key === "sessionCancelled" ? "bg-rose-soft text-rose-deep" : "bg-saffron-soft text-ink")}>
                    <CalendarDays className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-text">{t(`notifications.k.${n.key}`, { name: actor?.name ?? "", ...resolve(n.params) })}</p>
                    <p className="text-xs text-faint">{relative(n.at)}</p>
                    {!!n.changes?.length && (
                      <div className="mt-2">
                        <ChangeList changes={n.changes} maskLinks />
                      </div>
                    )}
                    <div className="mt-2 flex flex-wrap gap-2">
                      {n.href && (
                        <Link href={n.href} onClick={() => actions.markRead(n.id)} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-ink px-3 text-[13px] font-semibold text-white hover:bg-ink-deep">
                          {t("ws.openWorkshop")} <ArrowRight className="size-3.5 rtl:rotate-180" />
                        </Link>
                      )}
                      {!n.read && (
                        <button onClick={() => actions.markRead(n.id)} className="inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-[13px] font-semibold text-ink hover:bg-ink-soft/60">
                          <Check className="size-3.5" /> {t("notifications.markRead")}
                        </button>
                      )}
                    </div>
                  </div>
                  {!n.read && <span className="mt-1 size-2.5 shrink-0 rounded-full bg-rose" aria-label={t("notifications.new")} />}
                </div>
              );
            return n.href ? (
              <Link key={n.id} href={n.href} onClick={() => actions.markRead(n.id)} className={cls}>
                {content}
              </Link>
            ) : (
              <button key={n.id} onClick={() => actions.markRead(n.id)} className={cn(cls, "w-full text-start")}>
                {content}
              </button>
            );
          })}
        </Card>
      )}
    </div>
  );
}
