"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Ban, Bell, ExternalLink, Trash } from "lucide-react";
import { useStore, type WorkshopInput } from "@/lib/store";
import { useI18n } from "@/i18n/I18nProvider";
import { CATEGORIES } from "@/i18n/content";
import { REGIONS } from "@/lib/regions";
import type { CategoryId, CurrencyCode, Level, Workshop, WorkshopKind } from "@/lib/types";
import { eventAudience, isoToWall, significantChanges, wallToIso, workshopPhase, type WorkshopChange } from "@/lib/workshops";
import { Badge, Card, Chip, DemoNote, Field, Input, PageHeader, Select, Textarea } from "@/components/ui/primitives";
import { Button, ButtonLink } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { PhotoPicker } from "./PhotoPicker";
import { CURRENCIES, SHIP_COUNTRIES } from "./ProductForm";
import { ChangeList } from "@/components/common/ChangeList";

const EXTRA_TZ = ["Europe/Madrid", "Europe/Lisbon", "Europe/London"];
export const TIME_ZONES = [...new Set([...REGIONS.RU.timeZones, ...REGIONS.BR.timeZones, ...EXTRA_TZ])];
const COUNTRY_TZ: Record<string, string> = { RU: "Europe/Moscow", BR: "America/Sao_Paulo", ES: "Europe/Madrid", PT: "Europe/Lisbon", GB: "Europe/London" };

type Errors = Partial<Record<"title" | "cover" | "description" | "start" | "end" | "url" | "city" | "venue" | "price" | "seats", string>>;
const lines = (s: string) => s.split("\n").map((x) => x.trim()).filter(Boolean);

export function EventForm({ workshop }: { workshop?: Workshop }) {
  const { t, cat } = useI18n();
  const { state, settings, actions } = useStore();
  const router = useRouter();
  const toast = useToast();
  const d = state!.data;
  const tz0 = workshop?.timeZone ?? settings.timeZone;
  const [kind, setKind] = useState<WorkshopKind>(workshop?.kind ?? "workshop");
  const [title, setTitle] = useState(workshop?.title ?? "");
  const [cover, setCover] = useState<string[]>(workshop?.cover ? [workshop.cover] : []);
  const [category, setCategory] = useState<CategoryId>(workshop?.category ?? "ceramics");
  const [description, setDescription] = useState(workshop?.description ?? "");
  const [format, setFormat] = useState<Workshop["format"]>(workshop?.format ?? "offline");
  const [timeZone, setTimeZone] = useState(tz0);
  const [start, setStart] = useState(workshop ? isoToWall(workshop.startsAt, tz0) : "");
  const [end, setEnd] = useState(workshop ? isoToWall(workshop.endsAt, tz0) : "");
  const [country, setCountry] = useState(workshop?.country ?? settings.country);
  const [city, setCity] = useState(workshop?.city ?? settings.city);
  const [venue, setVenue] = useState(workshop?.venue ?? "");
  const [onlineUrl, setOnlineUrl] = useState(workshop?.onlineUrl ?? "");
  const [free, setFree] = useState(workshop ? !workshop.price : false);
  const [price, setPrice] = useState(workshop?.price ? String(workshop.price.amount) : "");
  const [currency, setCurrency] = useState<CurrencyCode>(workshop?.price?.currency ?? settings.currency);
  const [seats, setSeats] = useState(String(workshop?.seatsTotal ?? 10));
  const [level, setLevel] = useState<Level | "any">(workshop?.level ?? "any");
  const [materials, setMaterials] = useState((workshop?.materials ?? []).join("\n"));
  const [program, setProgram] = useState((workshop?.program ?? []).join("\n"));
  const [terms, setTerms] = useState(workshop?.terms ?? "");
  const [errors, setErrors] = useState<Errors>({});
  const [confirm, setConfirm] = useState<{ changes: WorkshopChange[]; audience: number } | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);

  const status = workshop?.status ?? "draft";
  const phase = workshop ? workshopPhase(workshop) : "draft";
  const audience = useMemo(() => (workshop ? eventAudience(d, workshop).length : 0), [d, workshop]);
  const cities = country === "RU" || country === "BR" ? REGIONS[country].cities : [];

  const build = (): WorkshopInput => ({
    kind,
    title: title.trim(),
    cover: cover[0] ?? "",
    category,
    description: description.trim(),
    format,
    timeZone,
    startsAt: wallToIso(start, timeZone),
    endsAt: wallToIso(end, timeZone),
    country,
    city: format === "offline" ? city.trim() : undefined,
    venue: format === "offline" ? venue.trim() : undefined,
    onlineUrl: format === "online" ? onlineUrl.trim() : undefined,
    price: free ? null : { amount: Math.round(Number(price || 0) * 100) / 100, currency },
    seatsTotal: Math.max(1, Math.floor(Number(seats || 0))),
    level,
    materials: lines(materials),
    program: lines(program),
    terms: terms.trim() || undefined,
  });

  const validate = (publishing: boolean): Errors => {
    const e: Errors = {};
    if (!title.trim()) e.title = t("ev.v.title");
    if (!publishing) return e;
    if (!cover.length) e.cover = t("ev.v.cover");
    if (!description.trim()) e.description = t("ev.v.description");
    if (!start) e.start = t("ev.v.start");
    else if (status === "draft" && new Date(wallToIso(start, timeZone)).getTime() < Date.now()) e.start = t("ev.v.startPast");
    if (!end || (start && new Date(wallToIso(end, timeZone)) <= new Date(wallToIso(start, timeZone)))) e.end = t("ev.v.end");
    if (format === "online") {
      if (!onlineUrl.trim()) e.url = t("ev.v.url");
      else if (!/^https:\/\/\S+\.\S+/.test(onlineUrl.trim())) e.url = t("ev.v.urlInvalid");
    } else {
      if (!city.trim()) e.city = t("ev.v.city");
      if (!venue.trim()) e.venue = t("ev.v.venue");
    }
    if (!free && !(Number(price) > 0)) e.price = t("ev.v.price");
    const n = Math.floor(Number(seats));
    if (!(n >= 1)) e.seats = t("ev.v.seats");
    else if (workshop && n < workshop.seatsTaken) e.seats = t("ev.v.seatsTaken", { count: workshop.seatsTaken });
    return e;
  };

  const commit = (publish: boolean) => {
    const res = actions.saveWorkshop(build(), { id: workshop?.id, publish });
    if ("error" in res) return toast({ text: res.error === "forbidden" ? t("common.forbidden") : t("errors.notFound"), tone: "error" });
    if (!publish && status === "draft") {
      toast({ text: t("ev.toast.draft") });
      router.push("/dashboard/events?tab=draft");
      return;
    }
    if (res.notified > 0) toast({ text: t("ev.toast.notified", { count: res.notified }) });
    else toast({ text: status === "published" ? t("ev.toast.saved") : t("ev.toast.published") });
    router.push(`/learn/workshop/${res.id}`);
  };

  const submit = (publish: boolean) => {
    const e = validate(publish || status === "published");
    setErrors(e);
    if (Object.keys(e).length) return toast({ text: t("ev.v.fix"), tone: "error" });
    // Editing a published event: show the author how many people will be notified BEFORE saving.
    if (workshop && status === "published") {
      const draft = { ...workshop, ...build() } as Workshop;
      const changes = significantChanges(workshop, draft);
      if (changes.length) return setConfirm({ changes, audience });
      toast({ text: t("ev.notify.minor"), tone: "info" });
    }
    commit(publish);
  };

  const field = (k: keyof Errors) => ({ "aria-invalid": !!errors[k] });

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title={workshop ? t("ev.form.editTitle") : t("ev.form.newTitle")}
        subtitle={t("ev.form.subtitle")}
        actions={
          workshop && (
            <>
              <Badge tone={phase === "published" ? "success" : phase === "cancelled" ? "danger" : phase === "draft" ? "warn" : "neutral"}>{t(`ev.phase.${phase}`)}</Badge>
              <ButtonLink href={`/learn/workshop/${workshop.id}`} size="sm" variant="ghost">
                <ExternalLink className="size-3.5" /> {t("ev.form.openPage")}
              </ButtonLink>
            </>
          )
        }
      />
      {status === "published" && audience > 0 && (
        <DemoNote className="mb-4">
          <Bell className="me-1 inline size-3.5" /> {t("ev.notify.text", { count: audience })}
        </DemoNote>
      )}
      <form
        noValidate
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          submit(true);
        }}
      >
        <Card className="space-y-4 p-5">
          <h2 className="text-lg font-bold text-ink">{t("ev.form.basics")}</h2>
          <fieldset>
            <legend className="mb-1.5 text-[13px] font-semibold text-ink">{t("ev.form.kind")}</legend>
            <div className="flex flex-wrap gap-2">
              {(["workshop", "event"] as WorkshopKind[]).map((k) => (
                <Chip key={k} active={kind === k} onClick={() => setKind(k)}>{t(`ev.kind.${k}`)}</Chip>
              ))}
            </div>
          </fieldset>
          <Field label={t("ev.form.title")} error={errors.title}>
            {(id, dsc) => <Input id={id} aria-describedby={dsc} {...field("title")} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} />}
          </Field>
          <div>
            <p className="mb-1.5 text-[13px] font-semibold text-ink">{t("ev.form.cover")}</p>
            <div className="max-w-md">
              <PhotoPicker single aspect="aspect-[16/9]" value={cover} onChange={setCover} invalid={!!errors.cover} onError={(m) => toast({ text: m, tone: "error" })} />
            </div>
            {errors.cover && <p className="mt-1 text-xs font-semibold text-rose-deep" role="alert">{errors.cover}</p>}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("ev.form.category")}>
              {(id) => (
                <Select id={id} value={category} onChange={(e) => setCategory(e.target.value as CategoryId)}>
                  {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{cat(c.id)}</option>)}
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
            {(id, dsc) => <Textarea id={id} aria-describedby={dsc} {...field("description")} rows={4} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={3000} />}
          </Field>
          <Field label={t("ev.form.program")} hint={t("ev.form.programHint")}>
            {(id, dsc) => <Textarea id={id} aria-describedby={dsc} rows={4} value={program} onChange={(e) => setProgram(e.target.value)} maxLength={2000} />}
          </Field>
        </Card>

        <Card className="space-y-4 p-5">
          <h2 className="text-lg font-bold text-ink">{t("ev.form.when")}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("ev.form.startsAt")} error={errors.start}>
              {(id, dsc) => (
                <Input
                  id={id}
                  type="datetime-local"
                  aria-describedby={dsc}
                  {...field("start")}
                  value={start}
                  onChange={(e) => {
                    const v = e.target.value;
                    // Wall-clock strings are compared as UTC: keeps the previous duration when moving the start.
                    const ms = (x: string) => Date.parse(`${x}:00Z`);
                    const wall = (n: number) => new Date(n).toISOString().slice(0, 16);
                    if (v && start && end && ms(end) > ms(start)) setEnd(wall(ms(v) + ms(end) - ms(start)));
                    else if (v && !end) setEnd(wall(ms(v) + 2 * 3600000));
                    setStart(v);
                  }}
                />
              )}
            </Field>
            <Field label={t("ev.form.endsAt")} error={errors.end}>
              {(id, dsc) => <Input id={id} type="datetime-local" aria-describedby={dsc} {...field("end")} value={end} min={start} onChange={(e) => setEnd(e.target.value)} />}
            </Field>
          </div>
          <Field label={t("ev.form.timeZone")} hint={t("ev.form.timeZoneHint")}>
            {(id, dsc) => (
              <Select id={id} aria-describedby={dsc} value={timeZone} onChange={(e) => setTimeZone(e.target.value)}>
                {TIME_ZONES.map((z) => <option key={z} value={z}>{z.replace(/_/g, " ")}</option>)}
              </Select>
            )}
          </Field>
        </Card>

        <Card className="space-y-4 p-5">
          <h2 className="text-lg font-bold text-ink">{t("ev.form.where")}</h2>
          <fieldset>
            <legend className="mb-1.5 text-[13px] font-semibold text-ink">{t("ev.form.format")}</legend>
            <div className="flex gap-2">
              {(["offline", "online"] as const).map((f) => (
                <Chip key={f} active={format === f} onClick={() => setFormat(f)}>{t(`workshop.${f}`)}</Chip>
              ))}
            </div>
          </fieldset>
          <Field label={t("ev.form.country")}>
            {(id) => (
              <Select
                id={id}
                value={country}
                onChange={(e) => {
                  setCountry(e.target.value);
                  if (!workshop) setTimeZone(COUNTRY_TZ[e.target.value] ?? timeZone);
                  const r = e.target.value === "RU" || e.target.value === "BR" ? REGIONS[e.target.value].cities : [];
                  setCity(r[0] ?? "");
                }}
              >
                {SHIP_COUNTRIES.map((c) => <option key={c} value={c}>{t(`countryName.${c}`)}</option>)}
              </Select>
            )}
          </Field>
          {format === "offline" ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t("ev.form.city")} error={errors.city}>
                {(id, dsc) => (
                  <>
                    <Input id={id} aria-describedby={dsc} {...field("city")} list={`${id}-cities`} value={city} onChange={(e) => setCity(e.target.value)} maxLength={80} />
                    <datalist id={`${id}-cities`}>{cities.map((c) => <option key={c} value={c} />)}</datalist>
                  </>
                )}
              </Field>
              <Field label={t("ev.form.venue")} error={errors.venue}>
                {(id, dsc) => <Input id={id} aria-describedby={dsc} {...field("venue")} value={venue} onChange={(e) => setVenue(e.target.value)} maxLength={200} />}
              </Field>
            </div>
          ) : (
            <Field label={t("ev.form.onlineUrl")} hint={t("ev.form.onlineUrlHint")} error={errors.url}>
              {(id, dsc) => <Input id={id} type="url" inputMode="url" placeholder="https://" aria-describedby={dsc} {...field("url")} value={onlineUrl} onChange={(e) => setOnlineUrl(e.target.value)} maxLength={400} />}
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
                {(id, dsc) => <Input id={id} type="number" min={0} step="0.01" aria-describedby={dsc} {...field("price")} value={price} onChange={(e) => setPrice(e.target.value)} />}
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
          <Field label={t("ev.form.seats")} error={errors.seats} className="max-w-xs">
            {(id, dsc) => <Input id={id} type="number" min={Math.max(1, workshop?.seatsTaken ?? 1)} step={1} aria-describedby={dsc} {...field("seats")} value={seats} onChange={(e) => setSeats(e.target.value)} />}
          </Field>
          <Field label={t("ev.form.materials")} hint={t("ev.form.materialsHint")}>
            {(id, dsc) => <Textarea id={id} aria-describedby={dsc} rows={3} value={materials} onChange={(e) => setMaterials(e.target.value)} maxLength={1500} />}
          </Field>
          <Field label={t("ev.form.terms")} hint={t("ev.form.termsHint")}>
            {(id, dsc) => <Textarea id={id} aria-describedby={dsc} rows={3} value={terms} onChange={(e) => setTerms(e.target.value)} maxLength={1500} />}
          </Field>
          {!free && <DemoNote>{t("common.noPayment")}</DemoNote>}
        </Card>

        <div className="sticky bottom-20 z-10 flex flex-wrap items-center justify-end gap-2 rounded-2xl border border-line bg-surface/95 p-3 shadow-lg backdrop-blur lg:bottom-4">
          {status === "published" && (
            <Button type="button" variant="danger" className="me-auto" onClick={() => setCancelOpen(true)}>
              <Ban className="size-4" /> {t("ev.cancel.action")}
            </Button>
          )}
          {status === "draft" && workshop && (
            <Button
              type="button"
              variant="ghost"
              className="me-auto text-rose-deep"
              onClick={() => {
                actions.deleteWorkshopDraft(workshop.id);
                toast({ text: t("ev.toast.deleted"), tone: "info" });
                router.push("/dashboard/events");
              }}
            >
              <Trash className="size-4" /> {t("ev.page.deleteDraft")}
            </Button>
          )}
          <Button type="button" variant="ghost" onClick={() => router.back()}>{t("common.cancel")}</Button>
          {status === "draft" && <Button type="button" variant="secondary" onClick={() => submit(false)}>{t("common.saveDraft")}</Button>}
          <Button type="submit">{status === "draft" ? t("common.publish") : t("ev.form.saveChanges")}</Button>
        </div>
      </form>

      <Modal
        open={!!confirm}
        onClose={() => setConfirm(null)}
        title={t("ev.notify.title")}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirm(null)}>{t("common.cancel")}</Button>
            <Button
              onClick={() => {
                setConfirm(null);
                commit(false);
              }}
            >
              {confirm && confirm.audience > 0 ? t("ev.notify.confirm") : t("ev.form.saveChanges")}
            </Button>
          </>
        }
      >
        {confirm && (
          <div className="space-y-3 p-5 text-sm">
            <p className="font-semibold text-ink">{confirm.audience > 0 ? t("ev.notify.text", { count: confirm.audience }) : t("ev.notify.nobody")}</p>
            {confirm.audience > 0 && <p className="text-muted">{t("ev.notify.once")}</p>}
            <p className="pt-1 text-xs font-bold uppercase tracking-wider text-faint">{t("ev.notify.what")}</p>
            <ChangeList changes={confirm.changes} />
          </div>
        )}
      </Modal>

      <Modal
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        title={t("ev.cancel.title")}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setCancelOpen(false)}>{t("ev.cancel.keep")}</Button>
            <Button
              variant="danger"
              onClick={() => {
                if (!workshop) return;
                const n = actions.cancelWorkshop(workshop.id);
                setCancelOpen(false);
                toast({ text: n > 0 ? `${t("ev.toast.cancelled")} · ${t("ev.cancel.text", { count: n })}` : t("ev.toast.cancelled"), tone: "info" });
                router.push(`/learn/workshop/${workshop.id}`);
              }}
            >
              {t("ev.cancel.action")}
            </Button>
          </>
        }
      >
        <div className="space-y-2 p-5 text-sm">
          <p className="font-semibold text-ink">{audience > 0 ? t("ev.cancel.text", { count: audience }) : t("ev.cancel.textNobody")}</p>
          <p className="text-muted">{t("ev.cancel.irreversible")}</p>
        </div>
      </Modal>
    </div>
  );
}
