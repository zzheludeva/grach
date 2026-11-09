"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useStore, type WorkshopInput } from "@/lib/store";
import { useI18n } from "@/i18n/I18nProvider";
import { CATEGORIES, techniquesFor } from "@/i18n/content";
import { REGIONS } from "@/lib/regions";
import type { CategoryId, CurrencyCode, Level, Workshop } from "@/lib/types";
import { templateDiffForSessions, type ApplyMode } from "@/lib/workshops";
import { Badge, Card, Chip, DemoNote, Field, Input, PageHeader, Select, Textarea } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { PhotoPicker } from "./PhotoPicker";
import { CURRENCIES, SHIP_COUNTRIES } from "./ProductForm";
import { cn } from "@/lib/utils";

const EXTRA_TZ = ["Europe/Madrid", "Europe/Lisbon", "Europe/London"];
export const TIME_ZONES = [...new Set([...REGIONS.RU.timeZones, ...REGIONS.BR.timeZones, ...EXTRA_TZ])];
export const COUNTRY_TZ: Record<string, string> = { RU: "Europe/Moscow", BR: "America/Sao_Paulo", ES: "Europe/Madrid", PT: "Europe/Lisbon", GB: "Europe/London" };

type Errors = Partial<Record<"title" | "cover" | "description" | "duration" | "price" | "city" | "venue", string>>;
const lines = (s: string) => s.split("\n").map((x) => x.trim()).filter(Boolean);

/** Template of a workshop: everything that does not change from one date to another. */
export function WorkshopForm({ workshop }: { workshop?: Workshop }) {
  const { t, cat, locale } = useI18n();
  const { state, settings, actions } = useStore();
  const router = useRouter();
  const toast = useToast();
  const d = state!.data;
  const [title, setTitle] = useState(workshop?.title ?? "");
  const [cover, setCover] = useState<string[]>(workshop?.cover ? [workshop.cover] : []);
  const [photos, setPhotos] = useState<string[]>(workshop?.photos ?? []);
  const [category, setCategory] = useState<CategoryId>(workshop?.category ?? "ceramics");
  const [technique, setTechnique] = useState(workshop?.technique ?? "");
  const [level, setLevel] = useState<Level | "any">(workshop?.level ?? "any");
  const [description, setDescription] = useState(workshop?.description ?? "");
  const [program, setProgram] = useState((workshop?.program ?? []).join("\n"));
  const [materials, setMaterials] = useState((workshop?.materials ?? []).join("\n"));
  const [format, setFormat] = useState<Workshop["format"]>(workshop?.format ?? "offline");
  const [free, setFree] = useState(workshop ? !workshop.price : false);
  const [price, setPrice] = useState(workshop?.price ? String(workshop.price.amount) : "");
  const [currency, setCurrency] = useState<CurrencyCode>(workshop?.price?.currency ?? settings.currency);
  const [duration, setDuration] = useState(String(workshop?.durationMin ?? 120));
  const [terms, setTerms] = useState(workshop?.terms ?? "");
  const [country, setCountry] = useState(workshop?.country ?? settings.country);
  const [city, setCity] = useState(workshop?.city ?? settings.city);
  const [venue, setVenue] = useState(workshop?.venue ?? "");
  const [onlineInfo, setOnlineInfo] = useState(workshop?.onlineInfo ?? "");
  const [errors, setErrors] = useState<Errors>({});
  const [apply, setApply] = useState<{ publish: boolean } | null>(null);
  const [mode, setMode] = useState<ApplyMode>("empty");

  const status = workshop?.status ?? "draft";
  const techniques = useMemo(() => techniquesFor(category), [category]);
  const cities = country === "RU" || country === "BR" ? REGIONS[country].cities : [];
  const future = workshop ? d.sessions.filter((s) => s.workshopId === workshop.id && s.status === "scheduled" && new Date(s.startsAt).getTime() > Date.now()) : [];
  const bookedFuture = future.filter((s) => d.enrollments.some((e) => e.sessionId === s.id));

  const build = (): WorkshopInput => ({
    title: title.trim(),
    cover: cover[0] ?? "",
    photos,
    category,
    technique: technique || undefined,
    level,
    description: description.trim(),
    program: lines(program),
    materials: lines(materials),
    format,
    price: free ? null : { amount: Math.round(Number(price || 0) * 100) / 100, currency },
    durationMin: Math.max(15, Math.floor(Number(duration || 0))),
    terms: terms.trim() || undefined,
    country,
    city: format === "offline" ? city.trim() : undefined,
    venue: format === "offline" ? venue.trim() : undefined,
    onlineInfo: format === "online" ? onlineInfo.trim() || undefined : undefined,
  });

  const validate = (publishing: boolean): Errors => {
    const e: Errors = {};
    if (!title.trim()) e.title = t("ev.v.title");
    if (!publishing) return e;
    if (!cover.length) e.cover = t("ev.v.cover");
    if (!description.trim()) e.description = t("ev.v.description");
    if (!(Number(duration) >= 15)) e.duration = t("ws.v.duration");
    if (!free && !(Number(price) > 0)) e.price = t("ev.v.price");
    if (format === "offline") {
      if (!city.trim()) e.city = t("ev.v.city");
      if (!venue.trim()) e.venue = t("ev.v.venue");
    }
    return e;
  };

  const commit = (publish: boolean, applyMode?: ApplyMode) => {
    const res = actions.saveWorkshop(build(), { id: workshop?.id, publish, applyMode });
    if ("error" in res) return toast({ text: res.error === "forbidden" ? t("common.forbidden") : t("errors.notFound"), tone: "error" });
    const msg = res.notified > 0 ? t("ws.toast.appliedNotified", { count: res.updatedSessions, people: res.notified }) : res.updatedSessions > 0 ? t("ws.toast.applied", { count: res.updatedSessions }) : publish && status === "draft" ? t("ws.toast.published") : t("ws.toast.saved");
    toast({ text: msg });
    router.push(`/dashboard/workshops/${res.id}`);
  };

  const submit = (publish: boolean) => {
    const e = validate(publish || status !== "draft");
    setErrors(e);
    if (Object.keys(e).length) return toast({ text: t("ev.v.fix"), tone: "error" });
    // Changing price, terms or venue: ask how to treat already scheduled sessions (never silently overwritten).
    if (workshop && future.length) {
      const diff = templateDiffForSessions(workshop, { ...workshop, ...build() } as Workshop);
      if (diff.price || diff.terms || diff.place) return setApply({ publish });
    }
    commit(publish);
  };

  const fieldErr = (k: keyof Errors) => ({ "aria-invalid": !!errors[k] });

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title={workshop ? t("ws.form.editTitle") : t("ws.form.newTitle")}
        subtitle={t("ws.form.subtitle")}
        actions={workshop && <Badge tone={status === "published" ? "success" : status === "draft" ? "warn" : "neutral"}>{t(`ws.status.${status}`)}</Badge>}
      />
      <form noValidate className="space-y-5" onSubmit={(e) => { e.preventDefault(); submit(status === "draft"); }}>
        <Card className="space-y-4 p-5">
          <h2 className="text-lg font-bold text-ink">{t("ev.form.basics")}</h2>
          <Field label={t("ev.form.title")} error={errors.title}>
            {(id, dsc) => <Input id={id} aria-describedby={dsc} {...fieldErr("title")} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} />}
          </Field>
          <div>
            <p className="mb-1.5 text-[13px] font-semibold text-ink">{t("ev.form.cover")}</p>
            <div className="max-w-md">
              <PhotoPicker single aspect="aspect-[16/9]" value={cover} onChange={setCover} invalid={!!errors.cover} onError={(m) => toast({ text: m, tone: "error" })} />
            </div>
            {errors.cover && <p className="mt-1 text-xs font-semibold text-rose-deep" role="alert">{errors.cover}</p>}
          </div>
          <div>
            <p className="mb-1.5 text-[13px] font-semibold text-ink">{t("ws.form.photos")}</p>
            <PhotoPicker value={photos} onChange={setPhotos} onError={(m) => toast({ text: m, tone: "error" })} />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label={t("ev.form.category")}>
              {(id) => (
                <Select id={id} value={category} onChange={(e) => { setCategory(e.target.value as CategoryId); setTechnique(""); }}>
                  {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{cat(c.id)}</option>)}
                </Select>
              )}
            </Field>
            <Field label={t("sell.form.technique")}>
              {(id) => (
                <Select id={id} value={technique} onChange={(e) => setTechnique(e.target.value)}>
                  <option value="">{t("sell.form.techniqueNone")}</option>
                  {techniques.map((x) => <option key={x.id} value={x.id}>{x.name[locale]}</option>)}
                </Select>
              )}
            </Field>
            <Field label={t("ev.form.level")}>
              {(id) => (
                <Select id={id} value={level} onChange={(e) => setLevel(e.target.value as Level | "any")}>
                  <option value="any">{t("ev.form.levelAny")}</option>
                  {(["beginner", "intermediate", "advanced"] as Level[]).map((l) => <option key={l} value={l}>{t(`level.${l}`)}</option>)}
                </Select>
              )}
            </Field>
          </div>
          <Field label={t("ev.form.description")} error={errors.description}>
            {(id, dsc) => <Textarea id={id} aria-describedby={dsc} {...fieldErr("description")} rows={4} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={3000} />}
          </Field>
          <Field label={t("ev.form.program")} hint={t("ev.form.programHint")}>
            {(id, dsc) => <Textarea id={id} aria-describedby={dsc} rows={4} value={program} onChange={(e) => setProgram(e.target.value)} maxLength={2000} />}
          </Field>
          <Field label={t("ev.form.materials")} hint={t("ev.form.materialsHint")}>
            {(id, dsc) => <Textarea id={id} aria-describedby={dsc} rows={3} value={materials} onChange={(e) => setMaterials(e.target.value)} maxLength={1500} />}
          </Field>
        </Card>

        <Card className="space-y-4 p-5">
          <h2 className="text-lg font-bold text-ink">{t("ws.form.howHeld")}</h2>
          <fieldset>
            <legend className="mb-1.5 text-[13px] font-semibold text-ink">{t("ev.form.format")}</legend>
            <div className="flex gap-2">
              {(["offline", "online"] as const).map((f) => (
                <Chip key={f} active={format === f} onClick={() => setFormat(f)} disabled={!!workshop && future.length > 0 && workshop.format !== f}>
                  {t(`workshop.${f}`)}
                </Chip>
              ))}
            </div>
            {workshop && future.length > 0 && <p className="mt-1 text-xs text-muted">{t("ws.form.formatLocked")}</p>}
          </fieldset>
          <Field label={t("ws.form.duration")} error={errors.duration} className="max-w-xs">
            {(id, dsc) => <Input id={id} type="number" min={15} step={15} aria-describedby={dsc} {...fieldErr("duration")} value={duration} onChange={(e) => setDuration(e.target.value)} />}
          </Field>
          {format === "offline" ? (
            <>
              <Field label={t("ev.form.country")}>
                {(id) => (
                  <Select id={id} value={country} onChange={(e) => { setCountry(e.target.value); const r = e.target.value === "RU" || e.target.value === "BR" ? REGIONS[e.target.value].cities : []; setCity(r[0] ?? ""); }}>
                    {SHIP_COUNTRIES.map((c) => <option key={c} value={c}>{t(`countryName.${c}`)}</option>)}
                  </Select>
                )}
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={t("ev.form.city")} error={errors.city}>
                  {(id, dsc) => (
                    <>
                      <Input id={id} aria-describedby={dsc} {...fieldErr("city")} list={`${id}-c`} value={city} onChange={(e) => setCity(e.target.value)} maxLength={80} />
                      <datalist id={`${id}-c`}>{cities.map((c) => <option key={c} value={c} />)}</datalist>
                    </>
                  )}
                </Field>
                <Field label={t("ev.form.venue")} hint={t("ws.form.venueHint")} error={errors.venue}>
                  {(id, dsc) => <Input id={id} aria-describedby={dsc} {...fieldErr("venue")} value={venue} onChange={(e) => setVenue(e.target.value)} maxLength={200} />}
                </Field>
              </div>
            </>
          ) : (
            <Field label={t("ws.form.onlineInfo")} hint={t("ws.form.onlineInfoHint")}>
              {(id, dsc) => <Input id={id} aria-describedby={dsc} value={onlineInfo} onChange={(e) => setOnlineInfo(e.target.value)} maxLength={200} />}
            </Field>
          )}
        </Card>

        <Card className="space-y-4 p-5">
          <h2 className="text-lg font-bold text-ink">{t("ev.form.participation")}</h2>
          <label className="inline-flex items-center gap-2 text-sm font-semibold text-ink">
            <input type="checkbox" checked={free} onChange={(e) => setFree(e.target.checked)} className="size-4 accent-[var(--color-ink)]" />
            {t("ev.form.free")}
          </label>
          {!free && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t("ev.form.price")} error={errors.price}>
                {(id, dsc) => <Input id={id} type="number" min={0} step="0.01" aria-describedby={dsc} {...fieldErr("price")} value={price} onChange={(e) => setPrice(e.target.value)} />}
              </Field>
              <Field label={t("ev.form.currency")}>
                {(id) => (
                  <Select id={id} value={currency} onChange={(e) => setCurrency(e.target.value as CurrencyCode)}>
                    {CURRENCIES.map((c) => <option key={c} value={c}>{c} — {t(`currencies.${c}`)}</option>)}
                  </Select>
                )}
              </Field>
            </div>
          )}
          <Field label={t("ev.form.terms")} hint={t("ev.form.termsHint")}>
            {(id, dsc) => <Textarea id={id} aria-describedby={dsc} rows={3} value={terms} onChange={(e) => setTerms(e.target.value)} maxLength={1500} />}
          </Field>
          <DemoNote>{t("ws.form.snapshotNote")}</DemoNote>
        </Card>

        <div className="sticky bottom-20 z-10 flex flex-wrap items-center justify-end gap-2 rounded-2xl border border-line bg-surface/95 p-3 shadow-lg backdrop-blur lg:bottom-4">
          <Button type="button" variant="ghost" onClick={() => router.back()}>{t("common.cancel")}</Button>
          {status === "draft" && <Button type="button" variant="secondary" onClick={() => submit(false)}>{t("common.saveDraft")}</Button>}
          <Button type="submit">{status === "draft" ? t("common.publish") : t("ev.form.saveChanges")}</Button>
        </div>
      </form>

      <Modal
        open={!!apply}
        onClose={() => setApply(null)}
        title={t("ws.apply.title")}
        footer={
          <>
            <Button variant="ghost" onClick={() => setApply(null)}>{t("common.cancel")}</Button>
            <Button onClick={() => { const p = apply!.publish; setApply(null); commit(p, mode); }}>{t("ev.form.saveChanges")}</Button>
          </>
        }
      >
        <div className="space-y-3 p-5 text-sm">
          <p className="text-muted">{t("ws.apply.text", { count: future.length })}</p>
          {(["new", "empty", "all"] as ApplyMode[]).map((m) => (
            <label key={m} className={cn("flex cursor-pointer gap-3 rounded-xl border p-3", mode === m ? "border-ink bg-ink-soft/50" : "border-line")}>
              <input type="radio" name="apply" checked={mode === m} onChange={() => setMode(m)} className="mt-1 accent-[var(--color-ink)]" />
              <span>
                <span className="block font-bold text-ink">{t(`ws.apply.${m}`)}</span>
                <span className="block text-xs text-muted">
                  {m === "new" ? t("ws.apply.newHint") : m === "empty" ? t("ws.apply.emptyHint", { count: future.length - bookedFuture.length }) : t("ws.apply.allHint", { count: bookedFuture.length })}
                </span>
              </span>
            </label>
          ))}
        </div>
      </Modal>
    </div>
  );
}
