"use client";
import { useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Eye, ExternalLink, PlayCircle, Plus, Trash } from "lucide-react";
import { useStore, type TutorialInput } from "@/lib/store";
import { useI18n } from "@/i18n/I18nProvider";
import { CATEGORIES, techniqueName, techniquesFor } from "@/i18n/content";
import type { CategoryId, CurrencyCode, Level, Tutorial } from "@/lib/types";
import { Badge, Card, DemoNote, Field, Input, PageHeader, Select, Textarea } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { PhotoPicker } from "./PhotoPicker";
import { CURRENCIES } from "./ProductForm";

type Step = { title: string; text: string; image?: string };
type Errors = Partial<Record<"title" | "cover" | "summary" | "steps" | "video" | "links" | "price" | "duration", string>>;
const lines = (s: string) => s.split("\n").map((x) => x.trim()).filter(Boolean);
const isUrl = (u: string) => /^https?:\/\/\S+\.\S+/.test(u.trim());

/** Authoring form for a learning material (draft → preview → publish; edit later). */
export function TutorialForm({ tutorial }: { tutorial?: Tutorial }) {
  const { t, cat, locale } = useI18n();
  const { settings, actions } = useStore();
  const router = useRouter();
  const toast = useToast();
  const [title, setTitle] = useState(tutorial?.title ?? "");
  const [cover, setCover] = useState<string[]>(tutorial?.cover ? [tutorial.cover] : []);
  const [summary, setSummary] = useState(tutorial?.summary ?? "");
  const [content, setContent] = useState(tutorial?.content ?? "");
  const [category, setCategory] = useState<CategoryId>(tutorial?.category ?? "ceramics");
  const [direction, setDirection] = useState(tutorial?.direction ?? "");
  const [technique, setTechnique] = useState(tutorial?.technique ?? "");
  const [level, setLevel] = useState<Level>(tutorial?.level ?? "beginner");
  const [duration, setDuration] = useState(String(tutorial?.durationMin ?? 30));
  const [materials, setMaterials] = useState((tutorial?.materials ?? []).join("\n"));
  const [images, setImages] = useState<string[]>(tutorial?.images ?? []);
  const [video, setVideo] = useState(tutorial?.videoUrl ?? "");
  const [steps, setSteps] = useState<Step[]>(tutorial?.steps?.length ? tutorial.steps : [{ title: "", text: "" }]);
  const [links, setLinks] = useState<{ label: string; url: string }[]>(tutorial?.links ?? []);
  const [paid, setPaid] = useState(!!tutorial?.price);
  const [price, setPrice] = useState(tutorial?.price ? String(tutorial.price.amount) : "");
  const [currency, setCurrency] = useState<CurrencyCode>(tutorial?.price?.currency ?? settings.currency);
  const [errors, setErrors] = useState<Errors>({});
  const [preview, setPreview] = useState(false);
  const status = tutorial?.status ?? "draft";
  const techniques = useMemo(() => techniquesFor(category), [category]);

  const build = (): TutorialInput => ({
    title: title.trim(),
    cover: cover[0] ?? "",
    summary: summary.trim(),
    content: content.trim() || undefined,
    category,
    direction: direction.trim() || undefined,
    technique: technique || undefined,
    level,
    durationMin: Math.max(1, Math.floor(Number(duration || 0))),
    materials: lines(materials),
    images,
    videoUrl: video.trim() || undefined,
    steps: steps.filter((s) => s.title.trim() || s.text.trim()).map((s) => ({ title: s.title.trim(), text: s.text.trim(), image: s.image })),
    links: links.filter((l) => l.url.trim()).map((l) => ({ label: l.label.trim() || l.url.trim(), url: l.url.trim() })),
    price: paid ? { amount: Math.round(Number(price || 0) * 100) / 100, currency } : null,
  });

  const validate = (publishing: boolean): Errors => {
    const e: Errors = {};
    if (!title.trim()) e.title = t("ev.v.title");
    if (video.trim() && !isUrl(video)) e.video = t("tut.v.url");
    if (links.some((l) => l.url.trim() && !isUrl(l.url))) e.links = t("tut.v.url");
    if (paid && !(Number(price) > 0)) e.price = t("ev.v.price");
    if (!publishing) return e;
    if (!cover.length) e.cover = t("ev.v.cover");
    if (!summary.trim()) e.summary = t("sell.v.summary");
    if (!(Number(duration) >= 1)) e.duration = t("tut.v.duration");
    if (!steps.some((s) => s.title.trim() && s.text.trim())) e.steps = t("tut.v.steps");
    return e;
  };

  const save = (next: Tutorial["status"]) => {
    const e = validate(next === "published");
    setErrors(e);
    if (Object.keys(e).length) return toast({ text: t("ev.v.fix"), tone: "error" });
    const res = actions.saveTutorial(build(), { id: tutorial?.id, status: next });
    if ("error" in res) return toast({ text: res.error === "forbidden" ? t("common.forbidden") : t("errors.notFound"), tone: "error" });
    toast({ text: next === "draft" ? t("tut.toast.draft") : next === "hidden" ? t("tut.toast.saved") : status === "published" ? t("tut.toast.saved") : t("tut.toast.published") });
    router.push(next === "published" ? `/learn/tutorial/${res.id}` : "/dashboard/tutorials");
  };

  const setStep = (i: number, patch: Partial<Step>) => setSteps(steps.map((s, k) => (k === i ? { ...s, ...patch } : s)));
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= steps.length) return;
    const n = [...steps];
    [n[i], n[j]] = [n[j], n[i]];
    setSteps(n);
  };
  const draft = build();

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title={tutorial ? t("tut.form.editTitle") : t("tut.form.newTitle")}
        subtitle={t("tut.form.subtitle")}
        actions={tutorial && <Badge tone={status === "published" ? "success" : status === "hidden" ? "dark" : "warn"}>{t(`tut.status.${status}`)}</Badge>}
      />
      <form noValidate className="space-y-5" onSubmit={(e) => { e.preventDefault(); save(status === "hidden" ? "hidden" : "published"); }}>
        <Card className="space-y-4 p-5">
          <h2 className="text-lg font-bold text-ink">{t("ev.form.basics")}</h2>
          <Field label={t("ev.form.title")} error={errors.title}>
            {(id, dsc) => <Input id={id} aria-describedby={dsc} aria-invalid={!!errors.title} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} />}
          </Field>
          <div>
            <p className="mb-1.5 text-[13px] font-semibold text-ink">{t("ev.form.cover")}</p>
            <div className="max-w-md"><PhotoPicker single aspect="aspect-[16/10]" value={cover} onChange={setCover} invalid={!!errors.cover} onError={(m) => toast({ text: m, tone: "error" })} /></div>
            {errors.cover && <p className="mt-1 text-xs font-semibold text-rose-deep" role="alert">{errors.cover}</p>}
          </div>
          <Field label={t("sell.form.summary")} error={errors.summary}>
            {(id, dsc) => <Input id={id} aria-describedby={dsc} aria-invalid={!!errors.summary} value={summary} onChange={(e) => setSummary(e.target.value)} maxLength={200} />}
          </Field>
          <Field label={t("tut.form.content")} hint={t("tut.form.contentHint")}>
            {(id, dsc) => <Textarea id={id} aria-describedby={dsc} rows={6} value={content} onChange={(e) => setContent(e.target.value)} maxLength={8000} />}
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("ev.form.category")}>
              {(id) => (
                <Select id={id} value={category} onChange={(e) => { setCategory(e.target.value as CategoryId); setTechnique(""); }}>
                  {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{cat(c.id)}</option>)}
                </Select>
              )}
            </Field>
            <Field label={t("tut.form.direction")} hint={t("tut.form.directionHint")}>
              {(id, dsc) => <Input id={id} aria-describedby={dsc} value={direction} onChange={(e) => setDirection(e.target.value)} maxLength={60} />}
            </Field>
            <Field label={t("sell.form.technique")}>
              {(id) => (
                <Select id={id} value={technique} onChange={(e) => setTechnique(e.target.value)}>
                  <option value="">{t("sell.form.techniqueNone")}</option>
                  {techniques.map((x) => <option key={x.id} value={x.id}>{x.name[locale]}</option>)}
                </Select>
              )}
            </Field>
            <Field label={t("learn.level")}>
              {(id) => (
                <Select id={id} value={level} onChange={(e) => setLevel(e.target.value as Level)}>
                  {(["beginner", "intermediate", "advanced"] as Level[]).map((l) => <option key={l} value={l}>{t(`level.${l}`)}</option>)}
                </Select>
              )}
            </Field>
            <Field label={t("tut.form.duration")} error={errors.duration}>
              {(id, dsc) => <Input id={id} type="number" min={1} aria-describedby={dsc} aria-invalid={!!errors.duration} value={duration} onChange={(e) => setDuration(e.target.value)} />}
            </Field>
          </div>
          <Field label={t("ev.form.materials")} hint={t("ev.form.materialsHint")}>
            {(id, dsc) => <Textarea id={id} aria-describedby={dsc} rows={3} value={materials} onChange={(e) => setMaterials(e.target.value)} maxLength={1500} />}
          </Field>
        </Card>

        <Card className="space-y-4 p-5">
          <h2 className="text-lg font-bold text-ink">{t("tut.form.media")}</h2>
          <div>
            <p className="mb-1.5 text-[13px] font-semibold text-ink">{t("tut.form.images")}</p>
            <PhotoPicker value={images} onChange={setImages} onError={(m) => toast({ text: m, tone: "error" })} />
          </div>
          <Field label={t("tut.form.video")} hint={t("tut.form.videoHint")} error={errors.video}>
            {(id, dsc) => <Input id={id} type="url" placeholder="https://" aria-describedby={dsc} aria-invalid={!!errors.video} value={video} onChange={(e) => setVideo(e.target.value)} maxLength={400} />}
          </Field>
        </Card>

        <Card className="space-y-3 p-5">
          <h2 className="text-lg font-bold text-ink">{t("learn.steps")}</h2>
          {errors.steps && <p className="text-xs font-semibold text-rose-deep" role="alert">{errors.steps}</p>}
          <ol className="space-y-3">
            {steps.map((s, i) => (
              <li key={i} className="rounded-2xl border border-line p-3">
                <div className="mb-2 flex items-center gap-2">
                  <span className="nums font-bold text-rust">{i + 1}.</span>
                  <Input aria-label={t("tut.form.stepTitle")} placeholder={t("tut.form.stepTitle")} value={s.title} onChange={(e) => setStep(i, { title: e.target.value })} className="h-10" maxLength={120} />
                  <Button type="button" variant="ghost" size="sm" className="w-8 px-0" disabled={i === 0} onClick={() => move(i, -1)} aria-label={t("common.moveUp")}><ArrowUp className="size-4" /></Button>
                  <Button type="button" variant="ghost" size="sm" className="w-8 px-0" disabled={i === steps.length - 1} onClick={() => move(i, 1)} aria-label={t("common.moveDown")}><ArrowDown className="size-4" /></Button>
                  <Button type="button" variant="ghost" size="sm" className="w-8 px-0 text-rose-deep" disabled={steps.length === 1} onClick={() => setSteps(steps.filter((_, k) => k !== i))} aria-label={t("common.delete")}><Trash className="size-4" /></Button>
                </div>
                <Textarea aria-label={t("tut.form.stepText")} placeholder={t("tut.form.stepText")} rows={3} value={s.text} onChange={(e) => setStep(i, { text: e.target.value })} maxLength={3000} />
                <div className="mt-2 max-w-[180px]">
                  <PhotoPicker single aspect="aspect-[4/3]" value={s.image ? [s.image] : []} onChange={(v) => setStep(i, { image: v[0] })} onError={(m) => toast({ text: m, tone: "error" })} />
                </div>
              </li>
            ))}
          </ol>
          <Button type="button" variant="soft" size="sm" onClick={() => setSteps([...steps, { title: "", text: "" }])}><Plus className="size-4" /> {t("tut.form.addStep")}</Button>
        </Card>

        <Card className="space-y-3 p-5">
          <h2 className="text-lg font-bold text-ink">{t("tut.form.links")}</h2>
          {errors.links && <p className="text-xs font-semibold text-rose-deep" role="alert">{errors.links}</p>}
          {links.map((l, i) => (
            <div key={i} className="flex flex-col gap-2 sm:flex-row">
              <Input aria-label={t("tut.form.linkLabel")} placeholder={t("tut.form.linkLabel")} value={l.label} onChange={(e) => setLinks(links.map((x, k) => (k === i ? { ...x, label: e.target.value } : x)))} />
              <Input aria-label="URL" placeholder="https://" type="url" value={l.url} onChange={(e) => setLinks(links.map((x, k) => (k === i ? { ...x, url: e.target.value } : x)))} />
              <Button type="button" variant="ghost" className="w-11 shrink-0 px-0" onClick={() => setLinks(links.filter((_, k) => k !== i))} aria-label={t("common.delete")}><Trash className="size-4" /></Button>
            </div>
          ))}
          <Button type="button" variant="soft" size="sm" onClick={() => setLinks([...links, { label: "", url: "" }])}><Plus className="size-4" /> {t("tut.form.addLink")}</Button>
        </Card>

        <Card className="space-y-3 p-5">
          <label className="inline-flex items-center gap-2 text-sm font-semibold text-ink">
            <input type="checkbox" checked={paid} onChange={(e) => setPaid(e.target.checked)} className="size-4 accent-[var(--color-ink)]" />
            {t("tut.form.paid")}
          </label>
          {paid && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t("sell.form.priceLabel")} error={errors.price}>
                {(id, dsc) => <Input id={id} type="number" min={0} step="0.01" aria-describedby={dsc} aria-invalid={!!errors.price} value={price} onChange={(e) => setPrice(e.target.value)} />}
              </Field>
              <Field label={t("sell.form.currency")}>
                {(id) => <Select id={id} value={currency} onChange={(e) => setCurrency(e.target.value as CurrencyCode)}>{CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}</Select>}
              </Field>
            </div>
          )}
          {paid && <DemoNote>{t("common.noPayment")}</DemoNote>}
        </Card>

        <div className="sticky bottom-20 z-10 flex flex-wrap items-center justify-end gap-2 rounded-2xl border border-line bg-surface/95 p-3 shadow-lg backdrop-blur lg:bottom-4">
          <Button type="button" variant="ghost" className="me-auto" onClick={() => setPreview(true)}><Eye className="size-4" /> {t("tut.form.preview")}</Button>
          <Button type="button" variant="ghost" onClick={() => router.back()}>{t("common.cancel")}</Button>
          {status === "draft" && <Button type="button" variant="secondary" onClick={() => save("draft")}>{t("common.saveDraft")}</Button>}
          <Button type="submit">{status === "draft" ? t("common.publish") : t("ev.form.saveChanges")}</Button>
        </div>
      </form>

      <Modal open={preview} onClose={() => setPreview(false)} title={t("tut.form.preview")} size="xl">
        <div className="max-h-[75vh] overflow-y-auto p-5">
          <DemoNote className="mb-4">{t("tut.form.previewNote")}</DemoNote>
          {draft.cover && (
            <div className="relative aspect-[16/9] overflow-hidden rounded-2xl bg-line">
              <Image src={draft.cover} alt="" fill sizes="700px" unoptimized={draft.cover.startsWith("data:")} className="object-cover" />
            </div>
          )}
          <div className="mt-4 flex flex-wrap gap-1.5">
            <Badge>{cat(draft.category)}</Badge>
            {draft.direction && <Badge>{draft.direction}</Badge>}
            {draft.technique && <Badge tone="warn">{techniqueName(draft.technique, locale)}</Badge>}
            <Badge tone="info">{t(`level.${draft.level}`)}</Badge>
          </div>
          <h2 className="mt-3 font-display text-3xl text-ink">{draft.title || "—"}</h2>
          <p className="mt-2 text-muted">{draft.summary}</p>
          {draft.content && <p className="mt-4 whitespace-pre-line text-[15px] leading-relaxed text-text/90">{draft.content}</p>}
          {draft.videoUrl && (
            <a href={draft.videoUrl} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-ink px-4 py-2 text-sm font-semibold text-white">
              <PlayCircle className="size-4" /> {t("tut.page.watch")}
            </a>
          )}
          {draft.materials.length > 0 && (
            <ul className="mt-4 list-inside list-disc text-sm text-text/85">{draft.materials.map((m) => <li key={m}>{m}</li>)}</ul>
          )}
          <ol className="mt-5 space-y-3">
            {draft.steps.map((s, i) => (
              <li key={i} className="rounded-2xl border border-line p-3">
                <p className="font-bold text-ink"><span className="me-2 text-rust">{i + 1}.</span>{s.title}</p>
                <p className="mt-1 whitespace-pre-line text-sm text-text/85">{s.text}</p>
                {s.image && <div className="relative mt-2 aspect-[4/3] w-48 overflow-hidden rounded-xl"><Image src={s.image} alt="" fill sizes="192px" unoptimized className="object-cover" /></div>}
              </li>
            ))}
          </ol>
          {draft.links && draft.links.length > 0 && (
            <ul className="mt-4 space-y-1 text-sm">{draft.links.map((l, i) => <li key={i}><a className="inline-flex items-center gap-1 font-semibold text-teal hover:underline" href={l.url} target="_blank" rel="noopener noreferrer"><ExternalLink className="size-3.5" />{l.label}</a></li>)}</ul>
          )}
        </div>
      </Modal>
    </div>
  );
}
