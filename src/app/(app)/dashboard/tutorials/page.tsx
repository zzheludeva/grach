"use client";
import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { BookOpen, Bookmark, Eye, EyeOff, Pencil, Plus, Send, Trash, ExternalLink } from "lucide-react";
import { useStore } from "@/lib/store";
import { useI18n } from "@/i18n/I18nProvider";
import { Badge, Card, DemoNote, EmptyState, PageHeader, Tabs } from "@/components/ui/primitives";
import { Button, ButtonLink } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import type { Tutorial } from "@/lib/types";

type Tab = "all" | Tutorial["status"];

export default function MyTutorials() {
  const { state, meId, actions } = useStore();
  const { t, num, relative, cat } = useI18n();
  const toast = useToast();
  const router = useRouter();
  const sp = useSearchParams();
  const d = state!.data;
  const tab = (sp.get("tab") as Tab) || "all";
  const [del, setDel] = useState<Tutorial | null>(null);
  const mine = useMemo(() => d.tutorials.filter((x) => x.authorId === meId).sort((a, b) => (b.updatedAt ?? b.createdAt).localeCompare(a.updatedAt ?? a.createdAt)), [d.tutorials, meId]);
  const list = tab === "all" ? mine : mine.filter((x) => x.status === tab);
  const count = (v: Tab) => (v === "all" ? mine.length : mine.filter((x) => x.status === v).length);
  const saves = (id: string) => d.favorites.filter((f) => f.type === "tutorial" && f.id === id).length;

  return (
    <div>
      <PageHeader title={t("tut.mine.title")} subtitle={t("tut.mine.subtitle")} actions={<ButtonLink href="/dashboard/tutorials/new"><Plus className="size-4" /> {t("tut.mine.create")}</ButtonLink>} />
      <Tabs
        className="mb-4"
        value={tab}
        onChange={(v) => router.replace(v === "all" ? "/dashboard/tutorials" : `/dashboard/tutorials?tab=${v}`)}
        items={(["all", "published", "draft", "hidden"] as Tab[]).map((v) => ({ value: v, label: t(`tut.mine.tab.${v}`), count: count(v) }))}
      />
      {list.length === 0 ? (
        <EmptyState icon={<BookOpen className="size-6" />} title={t("tut.mine.empty")} text={t("tut.mine.emptyText")} action={<ButtonLink href="/dashboard/tutorials/new">{t("tut.mine.create")}</ButtonLink>} />
      ) : (
        <>
          <ul className="space-y-3">
            {list.map((x) => (
              <li key={x.id}>
                <Card className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
                  <Link href={`/learn/tutorial/${x.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                    <span className="relative h-16 w-24 shrink-0 overflow-hidden rounded-xl bg-line/50">
                      {x.cover && <Image src={x.cover} alt="" fill sizes="96px" unoptimized={x.cover.startsWith("data:")} className="object-cover" />}
                    </span>
                    <span className="min-w-0">
                      <span className="flex flex-wrap gap-1.5">
                        <Badge tone={x.status === "published" ? "success" : x.status === "hidden" ? "dark" : "warn"}>{t(`tut.status.${x.status}`)}</Badge>
                        <Badge>{cat(x.category)}</Badge>
                      </span>
                      <span className="mt-1 block truncate font-bold text-ink">{x.title || "—"}</span>
                      <span className="block text-xs text-muted">{t(`level.${x.level}`)} · {relative(x.updatedAt ?? x.createdAt)}</span>
                    </span>
                  </Link>
                  <div className="flex shrink-0 items-center gap-4 text-sm text-muted sm:px-2">
                    <span className="nums inline-flex items-center gap-1" title={t("sell.mine.views")}><Eye className="size-4" /> {num(x.views ?? 0)}</span>
                    <span className="nums inline-flex items-center gap-1" title={t("sell.mine.saves")}><Bookmark className="size-4" /> {num(saves(x.id))}</span>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-1.5">
                    <ButtonLink href={`/dashboard/tutorials/${x.id}`} size="sm" variant="soft"><Pencil className="size-3.5" /> {t("common.edit")}</ButtonLink>
                    {x.status === "published" && (
                      <Button size="sm" variant="ghost" onClick={() => { actions.setTutorialStatus(x.id, "hidden"); toast({ text: t("tut.toast.unpublished"), tone: "info" }); }}>
                        <EyeOff className="size-3.5" /> {t("tut.mine.unpublish")}
                      </Button>
                    )}
                    {x.status === "hidden" && (
                      <Button size="sm" variant="ghost" onClick={() => { actions.setTutorialStatus(x.id, "published"); toast({ text: t("tut.toast.published") }); }}>
                        <Send className="size-3.5" /> {t("common.publish")}
                      </Button>
                    )}
                    <ButtonLink href={`/learn/tutorial/${x.id}`} size="sm" variant="ghost" aria-label={t("sell.mine.view")}><ExternalLink className="size-3.5" /></ButtonLink>
                    <Button size="sm" variant="ghost" className="text-rose-deep" onClick={() => setDel(x)} aria-label={t("common.delete")}><Trash className="size-3.5" /></Button>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
          <DemoNote className="mt-4">{t("sell.mine.analyticsNote")}</DemoNote>
        </>
      )}
      <Modal
        open={!!del}
        onClose={() => setDel(null)}
        title={t("tut.del.title")}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDel(null)}>{t("common.cancel")}</Button>
            <Button variant="danger" onClick={() => { if (del) actions.deleteTutorial(del.id); setDel(null); toast({ text: t("tut.toast.deleted"), tone: "info" }); }}>{t("common.delete")}</Button>
          </>
        }
      >
        <div className="space-y-2 p-5 text-sm">
          <p className="font-bold text-ink">{del?.title}</p>
          <p className="text-muted">{t("tut.del.text")}</p>
        </div>
      </Modal>
    </div>
  );
}
