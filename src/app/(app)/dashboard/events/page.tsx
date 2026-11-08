"use client";
import { useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Bookmark, CalendarDays, MapPin, MonitorPlay, Pencil, Plus, Users } from "lucide-react";
import { useStore } from "@/lib/store";
import { useI18n } from "@/i18n/I18nProvider";
import { Badge, Card, EmptyState, PageHeader, Tabs } from "@/components/ui/primitives";
import { ButtonLink } from "@/components/ui/button";
import { workshopPhase } from "@/lib/workshops";
import type { WorkshopPhase } from "@/lib/types";

type Tab = "all" | WorkshopPhase;
const TONE = { draft: "warn", published: "success", completed: "neutral", cancelled: "danger" } as const;

export default function MyEvents() {
  const { state, meId } = useStore();
  const { t, date } = useI18n();
  const router = useRouter();
  const sp = useSearchParams();
  const d = state!.data;
  const tab = (sp.get("tab") as Tab) || "all";
  const mine = useMemo(
    () => d.workshops.filter((w) => w.hostId === meId).map((w) => ({ w, phase: workshopPhase(w) })).sort((a, b) => b.w.startsAt.localeCompare(a.w.startsAt)),
    [d.workshops, meId],
  );
  const list = tab === "all" ? mine : mine.filter((x) => x.phase === tab);
  const count = (v: Tab) => (v === "all" ? mine.length : mine.filter((x) => x.phase === v).length);
  const enrolled = (id: string) => d.enrollments.filter((e) => e.workshopId === id).length;
  const saves = (id: string) => d.favorites.filter((f) => f.type === "workshop" && f.id === id).length;

  return (
    <div>
      <PageHeader title={t("ev.mine.title")} subtitle={t("ev.mine.subtitle")} actions={<ButtonLink href="/dashboard/events/new"><Plus className="size-4" /> {t("ev.mine.create")}</ButtonLink>} />
      <Tabs
        className="mb-4"
        value={tab}
        onChange={(v) => router.replace(v === "all" ? "/dashboard/events" : `/dashboard/events?tab=${v}`)}
        items={(["all", "published", "draft", "completed", "cancelled"] as Tab[]).map((v) => ({ value: v, label: t(`ev.mine.tab.${v}`), count: count(v) }))}
      />
      {list.length === 0 ? (
        <EmptyState icon={<CalendarDays className="size-6" />} title={t("ev.mine.empty")} text={t("ev.mine.emptyText")} action={<ButtonLink href="/dashboard/events/new">{t("ev.mine.create")}</ButtonLink>} />
      ) : (
        <ul className="space-y-3">
          {list.map(({ w, phase }) => (
            <li key={w.id}>
              <Card className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
                <Link href={`/learn/workshop/${w.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                  <span className="relative h-16 w-24 shrink-0 overflow-hidden rounded-xl bg-line/50">
                    {w.cover && <Image src={w.cover} alt="" fill sizes="96px" unoptimized={w.cover.startsWith("data:")} className="object-cover" />}
                  </span>
                  <span className="min-w-0">
                    <span className="flex flex-wrap gap-1.5">
                      <Badge tone={TONE[phase]}>{t(`ev.phase.${phase}`)}</Badge>
                      <Badge>{t(`ev.kind.${w.kind}`)}</Badge>
                      <Badge tone={w.format === "online" ? "info" : "rust"}>
                        {w.format === "online" ? <MonitorPlay className="size-3" /> : <MapPin className="size-3" />} {t(`workshop.${w.format}`)}
                      </Badge>
                    </span>
                    <span className="mt-1 block truncate font-bold text-ink">{w.title || "—"}</span>
                    <span className="nums block text-xs text-muted">{w.startsAt ? date(w.startsAt, "datetime") : "—"}</span>
                  </span>
                </Link>
                <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted sm:px-2">
                  <span className="nums inline-flex items-center gap-1"><Users className="size-4" /> {t("ev.mine.enrolled", { count: enrolled(w.id) })}</span>
                  <span className="nums inline-flex items-center gap-1"><Bookmark className="size-4" /> {t("ev.mine.saves", { count: saves(w.id) })}</span>
                  <span className="nums text-xs">{t("ev.mine.seats", { taken: w.seatsTaken, total: w.seatsTotal })}</span>
                </div>
                {(phase === "draft" || phase === "published") && (
                  <ButtonLink href={`/dashboard/events/${w.id}`} size="sm" variant="soft" className="shrink-0">
                    <Pencil className="size-3.5" /> {t("common.edit")}
                  </ButtonLink>
                )}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
