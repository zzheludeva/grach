"use client";
import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FolderKanban, Lock, Plus, Search, WandSparkles } from "lucide-react";
import { useStore } from "@/lib/store";
import { useI18n } from "@/i18n/I18nProvider";
import { Badge, Card, EmptyState, Field, Input, PageHeader, Select, Textarea } from "@/components/ui/primitives";
import { Button, ButtonLink } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { Mosaic } from "@/components/ui/mosaic";
import { norm } from "@/lib/utils";
import type { ProjectStatus } from "@/lib/types";
import { PROJECT_STATUSES, PROJECT_TONE } from "@/lib/projects";

export default function MyProjects() {
  const { state, meId, actions } = useStore();
  const { t, relative } = useI18n();
  const router = useRouter();
  const toast = useToast();
  const d = state!.data;
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<ProjectStatus | "">("");
  const [sort, setSort] = useState<"updated" | "created">("updated");
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [idea, setIdea] = useState("");
  // Projects are private: only the owner's are ever listed.
  const mine = useMemo(() => d.projects.filter((p) => p.userId === meId), [d.projects, meId]);
  const list = useMemo(() => {
    const nq = norm(q.trim());
    return mine
      .filter((p) => (!status || p.status === status) && (!nq || norm(p.title).includes(nq)))
      .sort((a, b) => (sort === "created" ? b.createdAt.localeCompare(a.createdAt) : b.updatedAt.localeCompare(a.updatedAt)));
  }, [mine, q, status, sort]);

  const create = () => {
    if (!title.trim()) return;
    const id = actions.createProject({ title: title.trim(), idea: idea.trim(), description: idea.trim() });
    setCreating(false);
    toast({ text: t("prj.toast.created") });
    router.push(`/dashboard/projects/${id}`);
  };

  return (
    <div>
      <PageHeader
        title={t("prj.list.title")}
        subtitle={t("prj.list.subtitle")}
        actions={
          <>
            <ButtonLink href="/studio" variant="secondary"><WandSparkles className="size-4" /> {t("prj.list.openStudio")}</ButtonLink>
            <Button onClick={() => { setTitle(""); setIdea(""); setCreating(true); }}><Plus className="size-4" /> {t("prj.list.new")}</Button>
          </>
        }
      />
      {mine.length === 0 ? (
        <EmptyState icon={<FolderKanban className="size-6" />} title={t("prj.list.empty")} text={t("prj.list.emptyText")} action={<ButtonLink href="/studio">{t("prj.list.openStudio")}</ButtonLink>} />
      ) : (
        <>
          <div className="mb-4 grid gap-2 sm:grid-cols-[1fr_auto_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-faint" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("prj.list.search")} aria-label={t("prj.list.search")} className="ps-10" />
            </div>
            <Select value={status} onChange={(e) => setStatus(e.target.value as ProjectStatus | "")} aria-label={t("sx.f.projectStatus")}>
              <option value="">{t("prj.list.allStatuses")}</option>
              {PROJECT_STATUSES.map((s) => <option key={s} value={s}>{t(`prj.status.${s}`)}</option>)}
            </Select>
            <Select value={sort} onChange={(e) => setSort(e.target.value as "updated" | "created")} aria-label={t("sx.sort.label")}>
              <option value="updated">{t("prj.list.sortUpdated")}</option>
              <option value="created">{t("prj.list.sortCreated")}</option>
            </Select>
          </div>
          {list.length === 0 ? (
            <EmptyState title={t("prj.list.noResults")} text={t("prj.list.noResultsText")} action={<Button variant="secondary" onClick={() => { setQ(""); setStatus(""); }}>{t("sx.resetAll")}</Button>} />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {list.map((p) => {
                const done = p.checklist.filter((c) => c.done).length;
                const cover = p.cover ?? p.photos.find((x) => x.final)?.src ?? p.photos[0]?.src;
                return (
                  <Link key={p.id} href={`/dashboard/projects/${p.id}`} className="group">
                    <Card className="h-full overflow-hidden transition hover:-translate-y-0.5 hover:border-ink/30">
                      <div className="relative aspect-[16/9] bg-line/40">
                        {cover ? (
                          <Image src={cover} alt="" fill sizes="(max-width: 640px) 100vw, 33vw" unoptimized={cover.startsWith("data:")} className="object-cover" />
                        ) : (
                          <Mosaic seed={p.id} cols={10} rows={4} className="absolute inset-0 size-full opacity-80" />
                        )}
                        <span className="absolute start-2 top-2 flex gap-1">
                          <Badge tone={PROJECT_TONE[p.status]}>{t(`prj.status.${p.status}`)}</Badge>
                          <Badge tone="glass"><Lock className="size-3" /> {t("prj.list.private")}</Badge>
                        </span>
                      </div>
                      <div className="p-4">
                        <p className="line-clamp-1 font-bold text-ink group-hover:underline">{p.title}</p>
                        <p className="mt-0.5 line-clamp-2 min-h-10 text-sm text-muted">{p.description || p.idea || t("common.notSet")}</p>
                        {p.checklist.length > 0 && (
                          <div className="mt-3">
                            <div className="h-1.5 overflow-hidden rounded-full bg-line">
                              <div className="h-full rounded-full bg-teal" style={{ width: `${(done / p.checklist.length) * 100}%` }} />
                            </div>
                            <p className="nums mt-1 text-xs text-muted">{t("prj.list.progress", { done, total: p.checklist.length })}</p>
                          </div>
                        )}
                        <p className="mt-2 text-xs text-faint">{t("prj.list.updated", { when: relative(p.updatedAt) })}</p>
                      </div>
                    </Card>
                  </Link>
                );
              })}
            </div>
          )}
        </>
      )}
      <Modal
        open={creating}
        onClose={() => setCreating(false)}
        title={t("prj.create.title")}
        footer={
          <>
            <Button variant="ghost" onClick={() => setCreating(false)}>{t("common.cancel")}</Button>
            <Button disabled={!title.trim()} onClick={create}>{t("common.create")}</Button>
          </>
        }
      >
        <form className="space-y-4 p-5" onSubmit={(e) => { e.preventDefault(); create(); }}>
          <Field label={t("prj.create.name")}>{(id) => <Input id={id} autoFocus value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} />}</Field>
          <Field label={t("prj.create.idea")} hint={t("prj.create.ideaHint")}>{(id, dsc) => <Textarea id={id} aria-describedby={dsc} rows={3} value={idea} onChange={(e) => setIdea(e.target.value)} maxLength={1500} />}</Field>
        </form>
      </Modal>
    </div>
  );
}
