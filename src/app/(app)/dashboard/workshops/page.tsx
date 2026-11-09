"use client";
import { useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Bookmark, CalendarDays, CalendarPlus, MapPin, MonitorPlay, Plus, Users } from "lucide-react";
import { useStore } from "@/lib/store";
import { useI18n } from "@/i18n/I18nProvider";
import { Badge, Card, EmptyState, PageHeader, Tabs } from "@/components/ui/primitives";
import { ButtonLink } from "@/components/ui/button";
import { nextSession, seatsTaken, sessionsOf } from "@/lib/workshops";
import type { WorkshopStatus } from "@/lib/types";

type Tab = "all" | WorkshopStatus;
const TONE = { draft: "warn", published: "success", archived: "neutral" } as const;

export default function MyWorkshops() {
  const { state, meId } = useStore();
  const { t, date } = useI18n();
  const router = useRouter();
  const sp = useSearchParams();
  const d = state!.data;
  const tab = (sp.get("tab") as Tab) || "all";
  const mine = useMemo(() => d.workshops.filter((w) => w.hostId === meId).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)), [d.workshops, meId]);
  const list = tab === "all" ? mine : mine.filter((w) => w.status === tab);
  const count = (v: Tab) => (v === "all" ? mine.length : mine.filter((w) => w.status === v).length);

  return (
    <div>
      <PageHeader title={t("ws.mine.title")} subtitle={t("ws.mine.subtitle")} actions={<ButtonLink href="/dashboard/workshops/new"><Plus className="size-4" /> {t("ws.mine.create")}</ButtonLink>} />
      <Tabs
        className="mb-4"
        value={tab}
        onChange={(v) => router.replace(v === "all" ? "/dashboard/workshops" : `/dashboard/workshops?tab=${v}`)}
        items={(["all", "published", "draft", "archived"] as Tab[]).map((v) => ({ value: v, label: t(`ws.mine.tab.${v}`), count: count(v) }))}
      />
      {list.length === 0 ? (
        <EmptyState icon={<CalendarDays className="size-6" />} title={t("ws.mine.empty")} text={t("ws.mine.emptyText")} action={<ButtonLink href="/dashboard/workshops/new">{t("ws.mine.create")}</ButtonLink>} />
      ) : (
        <ul className="space-y-3">
          {list.map((w) => {
            const ss = sessionsOf(d, w.id);
            const upcoming = ss.filter((s) => s.status === "scheduled" && new Date(s.startsAt).getTime() > Date.now());
            const nx = nextSession(d, w.id);
            const booked = upcoming.reduce((n, s) => n + seatsTaken(d, s), 0);
            const saves = d.favorites.filter((f) => f.type === "workshop" && f.id === w.id).length;
            return (
              <li key={w.id}>
                <Card className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
                  <Link href={`/dashboard/workshops/${w.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                    <span className="relative h-16 w-24 shrink-0 overflow-hidden rounded-xl bg-line/50">
                      {w.cover && <Image src={w.cover} alt="" fill sizes="96px" unoptimized={w.cover.startsWith("data:")} className="object-cover" />}
                    </span>
                    <span className="min-w-0">
                      <span className="flex flex-wrap gap-1.5">
                        <Badge tone={TONE[w.status]}>{t(`ws.status.${w.status}`)}</Badge>
                        <Badge tone={w.format === "online" ? "info" : "rust"}>
                          {w.format === "online" ? <MonitorPlay className="size-3" /> : <MapPin className="size-3" />} {t(`workshop.${w.format}`)}
                        </Badge>
                      </span>
                      <span className="mt-1 block truncate font-bold text-ink">{w.title || "—"}</span>
                      <span className="nums block text-xs text-muted">{nx ? `${t("ws.mine.next")}: ${date(nx.startsAt, "datetime")}` : t("ws.noDates")}</span>
                    </span>
                  </Link>
                  <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted sm:px-2">
                    <span className="nums inline-flex items-center gap-1"><CalendarDays className="size-4" /> {t("ws.mine.sessions", { count: upcoming.length })}</span>
                    <span className="nums inline-flex items-center gap-1"><Users className="size-4" /> {t("ws.mine.booked", { count: booked })}</span>
                    <span className="nums inline-flex items-center gap-1"><Bookmark className="size-4" /> {saves}</span>
                  </div>
                  <ButtonLink href={`/dashboard/workshops/${w.id}`} size="sm" variant="soft" className="shrink-0">
                    <CalendarPlus className="size-3.5" /> {t("ws.mine.manage")}
                  </ButtonLink>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
