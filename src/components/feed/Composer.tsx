"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ImagePlus, X } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea, Chip, DemoNote } from "@/components/ui/primitives";
import { useI18n } from "@/i18n/I18nProvider";
import { useStore } from "@/lib/store";
import { useToast } from "@/components/ui/toast";
import { downscale } from "@/lib/image";
import { CATEGORIES } from "@/i18n/content";
import type { CategoryId, PostKind } from "@/lib/types";

const KINDS: PostKind[] = ["finished", "process", "tools", "tip", "experiment"];

export function Composer({ open, onClose, prefill }: { open: boolean; onClose: () => void; prefill?: { title?: string; body?: string } }) {
  const { t, cat } = useI18n();
  const { actions, me } = useStore();
  const toast = useToast();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [kind, setKind] = useState<PostKind>("finished");
  const [category, setCategory] = useState<CategoryId | "">("");
  const [image, setImage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      setTitle(prefill?.title ?? "");
      setBody(prefill?.body ?? "");
      setErrors({});
    }
  }, [open, prefill]);

  const reset = () => {
    setTitle("");
    setBody("");
    setKind("finished");
    setCategory(me?.interests[0] ?? "");
    setImage(null);
    setErrors({});
  };

  const submit = () => {
    const e: Record<string, string> = {};
    if (!image) e.image = t("composer.errImage");
    if (title.trim().length < 3) e.title = t("validation.minLength", { count: 3 });
    if (title.trim().length > 90) e.title = t("validation.maxLength", { count: 90 });
    if (body.trim().length < 10) e.body = t("validation.minLength", { count: 10 });
    setErrors(e);
    if (Object.keys(e).length) return;
    const id = actions.createPost({ kind, title: title.trim(), body: body.trim(), category: category || undefined, images: [image!] });
    toast({ text: t("composer.published"), action: { label: t("common.open"), href: `/post/${id}` } });
    reset();
    onClose();
    router.push(`/post/${id}`);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("composer.title")}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button onClick={submit} variant="accent">
            {t("composer.publish")}
          </Button>
        </>
      }
    >
      <div className="grid gap-5 p-5 sm:grid-cols-[220px_1fr]">
        <div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={async (ev) => {
              const f = ev.target.files?.[0];
              if (!f) return;
              setBusy(true);
              try {
                setImage(await downscale(f));
                setErrors((x) => ({ ...x, image: "" }));
              } catch {
                setErrors((x) => ({ ...x, image: t("composer.errRead") }));
              } finally {
                setBusy(false);
              }
            }}
          />
          {image ? (
            <div className="relative overflow-hidden rounded-2xl border border-line">
              <Image src={image} alt="" width={440} height={440} unoptimized className="aspect-square w-full object-cover" />
              <button onClick={() => setImage(null)} className="absolute end-2 top-2 rounded-full bg-white/90 p-1.5 text-ink shadow" aria-label={t("common.remove")}>
                <X className="size-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileRef.current?.click()}
              data-invalid={!!errors.image || undefined}
              aria-describedby={errors.image ? "composer-image-error" : undefined}
              className="flex aspect-square w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-line bg-bg text-sm font-semibold text-muted transition-colors hover:border-teal hover:text-ink data-[invalid]:border-rose"
            >
              <ImagePlus className="size-8" />
              {busy ? t("common.loading") : t("composer.addPhoto")}
            </button>
          )}
          {errors.image && <p id="composer-image-error" className="mt-1.5 text-xs font-semibold text-rose-deep">{errors.image}</p>}
          <p className="mt-2 text-xs text-faint">{t("composer.photoHint")}</p>
        </div>
        <div className="min-w-0 space-y-4">
          <div>
            <p className="mb-1.5 text-[13px] font-semibold text-ink">{t("composer.kind")}</p>
            <div className="flex flex-wrap gap-2">
              {KINDS.map((k) => (
                <Chip key={k} active={kind === k} onClick={() => setKind(k)} className="h-8 text-xs">
                  {t(`postKind.${k}`)}
                </Chip>
              ))}
            </div>
          </div>
          <Field label={t("composer.fTitle")} error={errors.title}>
            {(id, desc) => <Input id={id} aria-describedby={desc} aria-invalid={!!errors.title} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} />}
          </Field>
          <Field label={t("composer.fBody")} error={errors.body} hint={t("composer.bodyHint")}>
            {(id, desc) => <Textarea id={id} aria-describedby={desc} aria-invalid={!!errors.body} rows={5} value={body} onChange={(e) => setBody(e.target.value)} />}
          </Field>
          <Field label={t("composer.fCategory")}>
            {(id) => (
              <Select id={id} value={category} onChange={(e) => setCategory(e.target.value as CategoryId)}>
                <option value="">{t("composer.noCategory")}</option>
                {CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {cat(c.id)}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <DemoNote>{t("composer.demoNote")}</DemoNote>
        </div>
      </div>
    </Modal>
  );
}
