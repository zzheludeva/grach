"use client";
import { use, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, CheckCircle2, ExternalLink, FileText, FolderKanban, ImagePlus, Lightbulb, ListChecks, Lock, MessageSquare, NotebookPen,
  Pencil, Send, Sparkles, Store, Trash, Wrench, X,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { useI18n } from "@/i18n/I18nProvider";
import { CATEGORIES, TECHNIQUES, techniqueName } from "@/i18n/content";
import { PROJECT_STATUSES, PROJECT_TONE } from "@/lib/projects";
import type { CategoryId, Project, ProjectStatus } from "@/lib/types";
import { Badge, Card, DemoNote, EmptyState, Field, Input, SectionTitle, Select, Textarea } from "@/components/ui/primitives";
import { Button, ButtonLink } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { Mosaic } from "@/components/ui/mosaic";
import { PhotoPicker } from "@/components/seller/PhotoPicker";
import { ItemList, TagList } from "@/components/projects/ItemList";
import { downscale } from "@/lib/image";
import { uid } from "@/lib/utils";

export default function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { state, meId, actions } = useStore();
  const { t, date, relative, cat, locale } = useI18n();
  const router = useRouter();
  const toast = useToast();
  const d = state!.data;
  const p = d.projects.find((x) => x.id === id);
  const [editing, setEditing] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [note, setNote] = useState("");

  // Private: only the owner can open a project.
  if (!p || p.userId !== meId)
    return <EmptyState icon={<FolderKanban className="size-6" />} title={t("prj.page.notFound")} action={<ButtonLink href="/dashboard/projects">{t("prj.page.back")}</ButtonLink>} />;

  const save = (patch: Partial<Project> | ((x: Project) => Partial<Project>)) => actions.updateProject(p.id, patch);
  const conv = p.conversationId ? d.conversations.find((c) => c.id === p.conversationId) : undefined;
  const post = p.publishedPostId ? d.posts.find((x) => x.id === p.publishedPostId) : undefined;
  const product = p.productId ? d.products.find((x) => x.id === p.productId) : undefined;
  const processPhotos = p.photos.filter((x) => !x.final);
  const finalPhotos = p.photos.filter((x) => x.final);
  const done = p.checklist.filter((c) => c.done).length;

  const addPhotos = async (files: FileList | null, final: boolean) => {
    if (!files?.length) return;
    try {
      const urls = await Promise.all([...files].slice(0, 6).map((f) => downscale(f)));
      save((x) => ({ photos: [...x.photos, ...urls.map((src) => ({ id: uid("ph"), src, at: new Date().toISOString(), final }))] }));
    } catch {
      toast({ text: t("sell.v.photoError"), tone: "error" });
    }
  };

  const Photos = ({ list, final }: { list: Project["photos"]; final: boolean }) => (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
      {list.map((ph) => (
        <div key={ph.id} className="group relative aspect-square overflow-hidden rounded-xl bg-line/40">
          <Image src={ph.src} alt="" fill sizes="160px" unoptimized={ph.src.startsWith("data:")} className="object-cover" />
          <button
            onClick={() => save((x) => ({ photos: x.photos.filter((y) => y.id !== ph.id) }))}
            className="absolute end-1.5 top-1.5 flex size-7 items-center justify-center rounded-lg bg-white/90 text-ink shadow-sm"
            aria-label={t("sell.form.removePhoto")}
          >
            <X className="size-4" />
          </button>
        </div>
      ))}
      <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-line text-xs font-semibold text-muted hover:border-ink/40 hover:text-ink">
        <ImagePlus className="size-5" />
        {t("prj.page.addPhoto")}
        <input type="file" accept="image/*" multiple hidden onChange={(e) => { addPhotos(e.target.files, final); e.target.value = ""; }} />
      </label>
    </div>
  );

  return (
    <div className="mx-auto max-w-6xl">
      <Link href="/dashboard/projects" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink">
        <ArrowLeft className="size-4 rtl:rotate-180" /> {t("prj.page.back")}
      </Link>

      <div className="mb-6 grid gap-5 md:grid-cols-[320px_1fr]">
        <div className="relative aspect-[4/3] overflow-hidden rounded-3xl bg-line/40">
          {p.cover ? (
            <Image src={p.cover} alt="" fill priority sizes="320px" unoptimized={p.cover.startsWith("data:")} className="object-cover" />
          ) : (
            <Mosaic seed={p.id} cols={10} rows={6} className="absolute inset-0 size-full" />
          )}
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge tone={PROJECT_TONE[p.status]}>{t(`prj.status.${p.status}`)}</Badge>
            <Badge><Lock className="size-3" /> {t("prj.list.private")}</Badge>
            {p.category && <Badge>{cat(p.category)}</Badge>}
            {p.technique && <Badge tone="rust">{techniqueName(p.technique, locale)}</Badge>}
          </div>
          <h1 className="mt-2 font-display text-3xl leading-tight text-ink sm:text-4xl">{p.title}</h1>
          <p className="mt-2 whitespace-pre-line text-[15px] text-text/90">{p.description || <span className="text-muted">{t("common.notSet")} · {t("prj.page.emptyHint")}</span>}</p>
          {p.idea && p.idea !== p.description && (
            <p className="mt-3 rounded-xl border-s-4 border-saffron bg-saffron-soft/40 px-3 py-2 text-sm text-text/85">
              <span className="block text-xs font-bold uppercase tracking-wider text-faint">{t("prj.page.idea")}</span>
              {p.idea}
            </p>
          )}
          <p className="mt-3 text-xs text-faint">
            {t("prj.page.created", { date: date(p.createdAt, "long") })} · {t("prj.list.updated", { when: relative(p.updatedAt) })}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <ButtonLink href={`/studio?project=${p.id}`} variant="accent">
              <Sparkles className="size-4" /> {t("prj.page.continueAI")}
            </ButtonLink>
            <Button variant="secondary" onClick={() => setEditing(true)}>
              <Pencil className="size-4" /> {t("prj.page.editInfo")}
            </Button>
            <label className="inline-flex items-center gap-2 text-sm font-semibold text-ink">
              <span className="sr-only sm:not-sr-only">{t("prj.page.status")}</span>
              <Select
                value={p.status}
                onChange={(e) => {
                  save({ status: e.target.value as ProjectStatus });
                  toast({ text: t("prj.toast.saved") });
                }}
                className="h-10 w-auto"
                aria-label={t("prj.page.status")}
              >
                {PROJECT_STATUSES.map((s) => <option key={s} value={s}>{t(`prj.status.${s}`)}</option>)}
              </Select>
            </label>
          </div>
          {conv && (
            <p className="mt-3 flex items-center gap-1.5 text-sm text-muted">
              <MessageSquare className="size-4" /> {t("prj.page.fromChat")} ·{" "}
              <Link href={`/studio?conv=${conv.id}`} className="font-semibold text-teal hover:underline">{t("prj.page.openChat")}</Link>
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="p-5">
          <SectionTitle>{t("prj.page.plan")}</SectionTitle>
          <ItemList items={p.plan} numbered onChange={(plan) => save({ plan })} addLabel={t("prj.page.addStep")} empty={t("prj.page.planEmpty")} />
          {p.plan.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-2"
              onClick={() => {
                save((x) => ({ checklist: [...x.checklist, ...x.plan.filter((s) => !x.checklist.some((c) => c.text === s.text)).map((s) => ({ ...s, id: uid("c"), done: false }))] }));
                toast({ text: t("prj.toast.saved") });
              }}
            >
              <ListChecks className="size-4" /> {t("prj.page.toChecklist")}
            </Button>
          )}
        </Card>
        <Card className="p-5">
          <SectionTitle action={p.checklist.length > 0 && <span className="nums text-sm text-muted">{done}/{p.checklist.length}</span>}>{t("prj.page.checklist")}</SectionTitle>
          {p.checklist.length > 0 && (
            <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-line">
              <div className="h-full rounded-full bg-teal transition-all" style={{ width: `${(done / p.checklist.length) * 100}%` }} />
            </div>
          )}
          <ItemList items={p.checklist} checkable onChange={(checklist) => save({ checklist })} addLabel={t("prj.page.addStage")} empty={t("prj.page.checklistEmpty")} />
        </Card>

        <Card className="p-5">
          <SectionTitle><span className="inline-flex items-center gap-2"><Wrench className="size-4 text-rust" />{t("prj.page.materials")}</span></SectionTitle>
          <TagList values={p.materials} onChange={(materials) => save({ materials })} addLabel={t("prj.page.addMaterial")} />
          <p className="mb-2 mt-5 text-sm font-bold text-ink">{t("prj.page.tools")}</p>
          <TagList values={p.tools} onChange={(tools) => save({ tools })} addLabel={t("prj.page.addTool")} />
        </Card>

        <Card className="p-5">
          <SectionTitle><span className="inline-flex items-center gap-2"><Lightbulb className="size-4 text-saffron" />{t("prj.page.recs")}</span></SectionTitle>
          {p.recommendations.length === 0 ? (
            <p className="text-sm text-muted">{t("prj.page.recsEmpty")}</p>
          ) : (
            <ul className="space-y-2">
              {p.recommendations.map((r) => (
                <li key={r.id} className="group flex gap-2 rounded-xl border border-saffron/30 bg-saffron-soft/30 p-3 text-sm">
                  <p className="min-w-0 flex-1 whitespace-pre-line text-text/90">{r.text}</p>
                  <button onClick={() => save((x) => ({ recommendations: x.recommendations.filter((y) => y.id !== r.id) }))} className="self-start text-faint hover:text-rose-deep" aria-label={t("common.delete")}>
                    <X className="size-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-5 lg:col-span-2">
          <SectionTitle><span className="inline-flex items-center gap-2"><NotebookPen className="size-4 text-teal" />{t("prj.page.notes")}</span></SectionTitle>
          <form
            className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end"
            onSubmit={(e) => {
              e.preventDefault();
              if (!note.trim()) return;
              save((x) => ({ notes: [{ id: uid("n"), text: note.trim(), at: new Date().toISOString() }, ...x.notes] }));
              setNote("");
            }}
          >
            <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("prj.page.notePlaceholder")} aria-label={t("prj.page.notes")} className="min-h-16" maxLength={2000} />
            <Button type="submit" variant="soft" disabled={!note.trim()} className="shrink-0">{t("prj.page.addNote")}</Button>
          </form>
          {p.notes.length > 0 && (
            <ul className="divide-y divide-line">
              {p.notes.map((n) => (
                <li key={n.id} className="group flex gap-2 py-2.5 text-sm">
                  <div className="min-w-0 flex-1">
                    <p className="whitespace-pre-line text-text/90">{n.text}</p>
                    <p className="text-xs text-faint">{relative(n.at)}</p>
                  </div>
                  <button onClick={() => save((x) => ({ notes: x.notes.filter((y) => y.id !== n.id) }))} className="self-start text-faint hover:text-rose-deep" aria-label={t("common.delete")}>
                    <Trash className="size-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-5 lg:col-span-2">
          <SectionTitle>{t("prj.page.photos")}</SectionTitle>
          <Photos list={processPhotos} final={false} />
        </Card>

        <Card className="overflow-hidden lg:col-span-2">
          <div className="grout px-5 py-4">
            <p className="font-display text-2xl text-white">{t("prj.page.finishTitle")}</p>
            <p className="mt-1 max-w-2xl text-sm text-white/75">{t("prj.page.finishText")}</p>
          </div>
          <div className="space-y-4 p-5">
            <div>
              <p className="mb-2 text-sm font-bold text-ink">{t("prj.page.finalPhotos")}</p>
              <Photos list={finalPhotos} final />
            </div>
            <div className="flex flex-wrap gap-2">
              {p.status !== "done" && (
                <Button variant="secondary" onClick={() => { save({ status: "done" }); toast({ text: t("prj.toast.done") }); }}>
                  <CheckCircle2 className="size-4" /> {t("prj.page.markDone")}
                </Button>
              )}
              {post ? (
                <ButtonLink href={`/post/${post.id}`} variant="soft"><ExternalLink className="size-4" /> {t("prj.page.openPost")}</ButtonLink>
              ) : (
                <Button onClick={() => (p.photos.length ? setPublishing(true) : toast({ text: t("prj.page.needPhoto"), tone: "info" }))}>
                  <Send className="size-4" /> {t("prj.page.publish")}
                </Button>
              )}
              {product ? (
                <ButtonLink href={`/market/${product.id}`} variant="soft"><Store className="size-4" /> {t("prj.page.openProduct")}</ButtonLink>
              ) : (
                <ButtonLink href={`/dashboard/products/new?project=${p.id}`} variant="secondary"><Store className="size-4" /> {t("prj.page.toProduct")}</ButtonLink>
              )}
              {!post && (
                <Button variant="ghost" onClick={() => toast({ text: t("prj.page.keptPrivate"), tone: "info" })}>
                  <Lock className="size-4" /> {t("prj.page.keepPrivate")}
                </Button>
              )}
            </div>
            {post && <p className="flex items-center gap-1.5 text-sm font-semibold text-teal"><CheckCircle2 className="size-4" /> {t("prj.page.published")}</p>}
            {product && <p className="flex items-center gap-1.5 text-sm font-semibold text-teal"><CheckCircle2 className="size-4" /> {t("prj.page.productLinked")}: {product.title} · {t(`sell.status.${product.status}`)}</p>}
          </div>
        </Card>
      </div>

      <div className="mt-8 flex justify-end">
        <Button variant="danger" onClick={() => setDeleting(true)}><Trash className="size-4" /> {t("prj.page.delete")}</Button>
      </div>

      <EditInfo key={editing ? `e-${p.updatedAt}` : "e"} open={editing} onClose={() => setEditing(false)} project={p} onSave={(patch) => { save(patch); setEditing(false); toast({ text: t("prj.toast.saved") }); }} />

      <PublishModal
        key={publishing ? "p1" : "p0"}
        open={publishing}
        project={p}
        onClose={() => setPublishing(false)}
        onPublish={(title, body) => {
          const images = [...finalPhotos, ...processPhotos].slice(0, 1).map((x) => x.src);
          const postId = actions.createPost({ kind: "finished", title, body, images, category: p.category, technique: p.technique });
          save({ publishedPostId: postId });
          setPublishing(false);
          toast({ text: t("prj.toast.published"), action: { label: t("prj.page.openPost"), href: `/post/${postId}` } });
        }}
      />

      <Modal
        open={deleting}
        onClose={() => setDeleting(false)}
        title={t("prj.page.delete")}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleting(false)}>{t("common.cancel")}</Button>
            <Button variant="danger" onClick={() => { actions.deleteProject(p.id); toast({ text: t("prj.toast.deleted"), tone: "info" }); router.push("/dashboard/projects"); }}>
              {t("common.delete")}
            </Button>
          </>
        }
      >
        <p className="p-5 text-sm text-muted">{t("prj.page.deleteText")}</p>
      </Modal>
    </div>
  );
}

function EditInfo({ open, onClose, project, onSave }: { open: boolean; onClose: () => void; project: Project; onSave: (p: Partial<Project>) => void }) {
  const { t, cat, locale } = useI18n();
  const toast = useToast();
  const [title, setTitle] = useState(project.title);
  const [description, setDescription] = useState(project.description);
  const [idea, setIdea] = useState(project.idea);
  const [cover, setCover] = useState<string[]>(project.cover ? [project.cover] : []);
  const [category, setCategory] = useState<CategoryId | "">(project.category ?? "");
  const [technique, setTechnique] = useState(project.technique ? techniqueName(project.technique, locale) : "");
  const listId = `tech-${project.id}`;
  const submit = () => {
    if (!title.trim()) return;
    // Known technique names are stored by id (translatable); anything else as typed.
    const known = TECHNIQUES.find((x) => Object.values(x.name).some((n) => n.toLowerCase() === technique.trim().toLowerCase()));
    onSave({ title: title.trim(), description: description.trim(), idea: idea.trim(), cover: cover[0], category: category || undefined, technique: known?.id ?? (technique.trim() || undefined) });
  };
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("prj.page.info")}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>{t("common.cancel")}</Button>
          <Button disabled={!title.trim()} onClick={submit}>{t("common.save")}</Button>
        </>
      }
    >
      <div className="grid gap-4 p-5 sm:grid-cols-[200px_1fr]">
        <div>
          <p className="mb-1.5 text-[13px] font-semibold text-ink">{t("prj.page.cover")}</p>
          <PhotoPicker single aspect="aspect-[4/3]" value={cover} onChange={setCover} onError={(m) => toast({ text: m, tone: "error" })} />
        </div>
        <div className="space-y-4">
          <Field label={t("prj.page.title")}>{(id) => <Input id={id} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} />}</Field>
          <Field label={t("prj.page.description")}>{(id) => <Textarea id={id} rows={3} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={2000} />}</Field>
          <Field label={t("prj.page.idea")}>{(id) => <Textarea id={id} rows={2} value={idea} onChange={(e) => setIdea(e.target.value)} maxLength={1500} />}</Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("prj.page.category")}>
              {(id) => (
                <Select id={id} value={category} onChange={(e) => setCategory(e.target.value as CategoryId | "")}>
                  <option value="">—</option>
                  {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{cat(c.id)}</option>)}
                </Select>
              )}
            </Field>
            <Field label={t("prj.page.technique")} hint={t("prj.page.techniqueHint")}>
              {(id, dsc) => (
                <>
                  <Input id={id} aria-describedby={dsc} list={listId} value={technique} onChange={(e) => setTechnique(e.target.value)} maxLength={80} />
                  <datalist id={listId}>{TECHNIQUES.filter((x) => !category || x.cats.includes(category)).map((x) => <option key={x.id} value={x.name[locale]} />)}</datalist>
                </>
              )}
            </Field>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function PublishModal({ open, onClose, project, onPublish }: { open: boolean; onClose: () => void; project: Project; onPublish: (title: string, body: string) => void }) {
  const { t } = useI18n();
  const [title, setTitle] = useState(project.title);
  const [body, setBody] = useState(project.description || project.idea);
  const img = project.photos.find((x) => x.final)?.src ?? project.photos[0]?.src;
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("prj.publish.title")}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>{t("common.cancel")}</Button>
          <Button disabled={!title.trim() || !img} onClick={() => onPublish(title.trim(), body.trim())}>
            <FileText className="size-4" /> {t("prj.publish.action")}
          </Button>
        </>
      }
    >
      <div className="space-y-4 p-5">
        <DemoNote>{t("prj.publish.text")}</DemoNote>
        {img && (
          <div className="relative aspect-[4/3] max-w-xs overflow-hidden rounded-xl">
            <Image src={img} alt="" fill sizes="320px" unoptimized={img.startsWith("data:")} className="object-cover" />
          </div>
        )}
        <Field label={t("prj.publish.postTitle")}>{(id) => <Input id={id} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} />}</Field>
        <Field label={t("prj.publish.postBody")}>{(id) => <Textarea id={id} rows={4} value={body} onChange={(e) => setBody(e.target.value)} maxLength={2000} />}</Field>
      </div>
    </Modal>
  );
}
