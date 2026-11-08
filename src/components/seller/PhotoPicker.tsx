"use client";
import { useRef, useState } from "react";
import Image from "next/image";
import { ArrowLeft, ArrowRight, ImagePlus, Star, X } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";
import { downscale } from "@/lib/image";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/primitives";

/**
 * Photo list with upload, reorder and "make cover". The first photo is the cover.
 * Photos are downscaled in the browser (demo storage); with Supabase they go to Storage.
 */
export function PhotoPicker({
  value,
  onChange,
  max = 6,
  invalid,
  onError,
  single = false,
  aspect = "aspect-square",
}: {
  value: string[];
  onChange: (v: string[]) => void;
  max?: number;
  invalid?: boolean;
  onError?: (msg: string) => void;
  single?: boolean;
  aspect?: string;
}) {
  const { t } = useI18n();
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const limit = single ? 1 : max;

  const add = async (files: FileList | null) => {
    if (!files?.length) return;
    const room = single ? 1 : limit - value.length;
    if (room <= 0) return onError?.(t("sell.v.tooMany"));
    setBusy(true);
    try {
      const picked = [...files].slice(0, room);
      const urls = await Promise.all(picked.map((f) => downscale(f, single ? 1400 : 1000)));
      onChange(single ? urls : [...value, ...urls]);
      if (files.length > room) onError?.(t("sell.v.tooMany"));
    } catch {
      onError?.(t("sell.v.photoError"));
    } finally {
      setBusy(false);
      if (ref.current) ref.current.value = "";
    }
  };
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= value.length) return;
    const next = [...value];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  const makeCover = (i: number) => onChange([value[i], ...value.filter((_, k) => k !== i)]);

  return (
    <div>
      <div className={cn("grid gap-2", single ? "grid-cols-1" : "grid-cols-3 sm:grid-cols-4 md:grid-cols-6")}>
        {value.map((src, i) => (
          <div key={`${i}-${src.slice(-24)}`} className={cn("group relative overflow-hidden rounded-xl border border-line bg-line/40", aspect)}>
            <Image src={src} alt="" fill sizes="160px" unoptimized={src.startsWith("data:")} className="object-cover" />
            {!single && i === 0 && (
              <span className="absolute start-1.5 top-1.5 inline-flex items-center gap-1 rounded-md bg-ink px-1.5 py-0.5 text-[10px] font-bold text-white">
                <Star className="size-3 fill-saffron text-saffron" /> {t("ev.form.cover")}
              </span>
            )}
            <button
              type="button"
              onClick={() => onChange(value.filter((_, k) => k !== i))}
              className="absolute end-1.5 top-1.5 flex size-7 items-center justify-center rounded-lg bg-white/90 text-ink shadow-sm hover:bg-white"
              aria-label={t("sell.form.removePhoto")}
              title={t("sell.form.removePhoto")}
            >
              <X className="size-4" />
            </button>
            {!single && value.length > 1 && (
              <div className="absolute inset-x-1.5 bottom-1.5 flex justify-between gap-1">
                <button type="button" disabled={i === 0} onClick={() => move(i, -1)} className="flex size-7 items-center justify-center rounded-lg bg-white/90 text-ink disabled:opacity-0" aria-label={t("common.moveUp")}>
                  <ArrowLeft className="size-3.5 rtl:rotate-180" />
                </button>
                {i > 0 && (
                  <button type="button" onClick={() => makeCover(i)} className="rounded-lg bg-white/90 px-1.5 text-[10px] font-bold text-ink" title={t("sell.form.makeCover")} aria-label={t("sell.form.makeCover")}>
                    <Star className="size-3.5" />
                  </button>
                )}
                <button type="button" disabled={i === value.length - 1} onClick={() => move(i, 1)} className="flex size-7 items-center justify-center rounded-lg bg-white/90 text-ink disabled:opacity-0" aria-label={t("common.moveDown")}>
                  <ArrowRight className="size-3.5 rtl:rotate-180" />
                </button>
              </div>
            )}
          </div>
        ))}
        {(single ? value.length === 0 : value.length < limit) && (
          <button
            type="button"
            onClick={() => ref.current?.click()}
            disabled={busy}
            aria-invalid={invalid}
            className={cn(
              "flex flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed text-sm font-semibold text-muted transition-colors hover:border-ink/40 hover:text-ink",
              aspect,
              invalid ? "border-rose" : "border-line",
            )}
          >
            {busy ? <Spinner /> : <ImagePlus className="size-6" />}
            <span className="px-2 text-center text-xs">{t("sell.form.addPhoto")}</span>
          </button>
        )}
      </div>
      {single && value.length > 0 && (
        <button type="button" onClick={() => ref.current?.click()} className="mt-2 text-sm font-semibold text-teal hover:underline">
          {t("ev.form.changeCover")}
        </button>
      )}
      <input ref={ref} type="file" accept="image/*" multiple={!single} hidden onChange={(e) => add(e.target.files)} />
    </div>
  );
}
