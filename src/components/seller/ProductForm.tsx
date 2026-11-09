"use client";
import { mainDescription } from "@/lib/product-text";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash } from "lucide-react";
import { useStore, type ProductInput } from "@/lib/store";
import { useI18n } from "@/i18n/I18nProvider";
import { CATEGORIES, techniquesFor } from "@/i18n/content";
import type { CategoryId, CurrencyCode, Product, SaleType, ShippingMode } from "@/lib/types";
import { Card, Field, Input, Select, Textarea, Chip, DemoNote, PageHeader, Badge } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { PhotoPicker } from "./PhotoPicker";
import { cn } from "@/lib/utils";

export const SHIP_COUNTRIES = ["RU", "BR", "PT", "ES", "GB"] as const;
export const CURRENCIES: CurrencyCode[] = ["RUB", "BRL", "EUR", "GBP"];

export interface ProductPrefill {
  title?: string;
  description?: string;
  images?: string[];
  category?: CategoryId;
  technique?: string;
  materials?: string[];
}

type Errors = Partial<Record<"title" | "images" | "summary" | "price" | "stock" | "makeDays" | "shipsTo" | "shipCost", string>>;

export function ProductForm({ product, prefill, onSaved }: { product?: Product; prefill?: ProductPrefill; onSaved?: (id: string) => void }) {
  const { t, cat, locale } = useI18n();
  const { settings, actions } = useStore();
  const router = useRouter();
  const toast = useToast();
  const [title, setTitle] = useState(product?.title ?? prefill?.title ?? "");
  const [images, setImages] = useState<string[]>(product?.images ?? prefill?.images ?? []);
  // One main description (summary). An old separate description, if any, is folded into it.
  const [summary, setSummary] = useState(product ? mainDescription(product.summary, product.description) : prefill?.description ?? "");
  const [story, setStory] = useState(product?.story ?? "");
  const [category, setCategory] = useState<CategoryId>(product?.category ?? prefill?.category ?? "ceramics");
  const [technique, setTechnique] = useState(product?.technique ?? prefill?.technique ?? "");
  const [materials, setMaterials] = useState((product?.materials ?? prefill?.materials ?? []).join(", "));
  const [dimensions, setDimensions] = useState(product?.dimensions ?? "");
  const [specs, setSpecs] = useState<{ label: string; value: string }[]>(product?.specs ?? []);
  const [price, setPrice] = useState(product ? String(product.price.amount) : "");
  const [currency, setCurrency] = useState<CurrencyCode>(product?.price.currency ?? settings.currency);
  const [stock, setStock] = useState(product ? String(product.stock) : "1");
  const [saleType, setSaleType] = useState<SaleType>(product?.saleType ?? "ready");
  const [makeDays, setMakeDays] = useState(product?.makeDays ? String(product.makeDays) : "");
  const [shipsFrom, setShipsFrom] = useState(product?.shipsFrom ?? settings.country);
  const [shipsTo, setShipsTo] = useState<string[]>(product?.shipsTo ?? [settings.country]);
  const [shipMode, setShipMode] = useState<ShippingMode>(product?.shipping?.mode ?? "region");
  const [shipCost, setShipCost] = useState(product?.shipping?.cost !== undefined ? String(product.shipping.cost) : "");
  const [shipTerms, setShipTerms] = useState(product?.shipping?.terms ?? "");
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);

  const techniques = useMemo(() => techniquesFor(category), [category]);
  const status = product?.status ?? "draft";

  const validate = (publishing: boolean): Errors => {
    const e: Errors = {};
    if (!title.trim()) e.title = t("sell.v.title");
    if (publishing) {
      if (!images.length) e.images = t("sell.v.photo");
      if (!summary.trim()) e.summary = t("sell.v.summary");
      if (!(Number(price) > 0)) e.price = t("sell.v.price");
      if (saleType === "ready" && !(Number(stock) >= 0 && stock.trim() !== "")) e.stock = t("sell.v.stock");
      if (saleType !== "ready" && !(Number(makeDays) > 0)) e.makeDays = t("sell.v.makeDays");
      if (!shipsTo.length) e.shipsTo = t("sell.v.shipsTo");
      if (shipMode === "fixed" && !(Number(shipCost) >= 0 && shipCost.trim() !== "")) e.shipCost = t("sell.v.shipCost");
    } else {
      if (price && !(Number(price) > 0)) e.price = t("sell.v.price");
    }
    return e;
  };

  const save = (nextStatus: Product["status"]) => {
    const publishing = nextStatus !== "draft";
    const e = validate(publishing);
    setErrors(e);
    if (Object.keys(e).length) {
      toast({ text: t("sell.v.fix"), tone: "error" });
      return;
    }
    setBusy(true);
    const input: ProductInput = {
      title: title.trim(),
      images,
      summary: summary.trim(),
      description: "",
      story: story.trim(),
      category,
      technique: technique || undefined,
      materials: materials.split(",").map((m) => m.trim()).filter(Boolean),
      dimensions: dimensions.trim(),
      specs: specs.filter((s) => s.label.trim() && s.value.trim()).map((s) => ({ label: s.label.trim(), value: s.value.trim() })),
      price: { amount: Math.round(Number(price || 0) * 100) / 100, currency },
      stock: saleType === "ready" ? Math.max(0, Math.floor(Number(stock || 0))) : 0,
      saleType,
      makeDays: saleType !== "ready" ? Math.max(1, Math.floor(Number(makeDays || 0))) : undefined,
      shipsFrom,
      shipsTo,
      shipping: { mode: shipMode, cost: shipMode === "fixed" ? Number(shipCost) : undefined, terms: shipTerms.trim() || undefined },
    };
    const res = actions.saveProduct(input, { id: product?.id, status: nextStatus });
    setBusy(false);
    if ("error" in res) {
      toast({ text: res.error === "forbidden" ? t("common.forbidden") : t("errors.notFound"), tone: "error" });
      return;
    }
    toast({ text: nextStatus === "draft" ? t("sell.toast.draft") : product?.status === "published" || product?.status === "hidden" ? t("sell.toast.saved") : t("sell.toast.published") });
    onSaved?.(res.id);
    router.push(nextStatus === "draft" ? "/dashboard/products?tab=draft" : `/market/${res.id}`);
  };

  const toggleShip = (c: string) => setShipsTo((s) => (s.includes(c) ? s.filter((x) => x !== c) : [...s, c]));

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title={product ? t("sell.form.editTitle") : t("sell.form.newTitle")}
        subtitle={t("sell.form.subtitle")}
        actions={product && <Badge tone={status === "published" ? "success" : status === "hidden" ? "dark" : "warn"}>{t(`sell.status.${status}`)}</Badge>}
      />
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          save(status === "hidden" ? "hidden" : "published");
        }}
        className="space-y-5"
      >
        <Card className="space-y-4 p-5">
          <h2 className="text-lg font-bold text-ink">{t("sell.form.basics")}</h2>
          <Field label={t("sell.form.title")} error={errors.title}>
            {(id, d) => <Input id={id} aria-describedby={d} aria-invalid={!!errors.title} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} />}
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("sell.form.category")}>
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
                  {technique && !techniques.some((x) => x.id === technique) && <option value={technique}>{technique}</option>}
                </Select>
              )}
            </Field>
          </div>
        </Card>

        <Card className="space-y-3 p-5">
          <h2 className="text-lg font-bold text-ink">{t("sell.form.photos")}</h2>
          <p className="text-sm text-muted">{t("sell.form.photosHint")}</p>
          <PhotoPicker value={images} onChange={setImages} invalid={!!errors.images} onError={(m) => toast({ text: m, tone: "error" })} />
          {errors.images && <p className="text-xs font-semibold text-rose-deep" role="alert">{errors.images}</p>}
        </Card>

        <Card className="space-y-4 p-5">
          <h2 className="text-lg font-bold text-ink">{t("sell.form.details")}</h2>
          <Field label={t("sell.form.summary")} hint={t("sell.form.summaryHint")} error={errors.summary}>
            {(id, d) => <Textarea id={id} aria-describedby={d} aria-invalid={!!errors.summary} value={summary} onChange={(e) => setSummary(e.target.value)} rows={5} maxLength={3000} />}
          </Field>
          <Field label={`${t("sell.form.story")} (${t("common.optional")})`} hint={t("sell.form.storyHint")}>
            {(id, d) => <Textarea id={id} aria-describedby={d} value={story} onChange={(e) => setStory(e.target.value)} rows={4} maxLength={1500} />}
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("sell.form.materials")} hint={t("sell.form.materialsHint")}>
              {(id, d) => <Input id={id} aria-describedby={d} value={materials} onChange={(e) => setMaterials(e.target.value)} />}
            </Field>
            <Field label={t("sell.form.dimensions")}>
              {(id) => <Input id={id} value={dimensions} onChange={(e) => setDimensions(e.target.value)} maxLength={120} />}
            </Field>
          </div>
          <div>
            <p className="mb-1.5 text-[13px] font-semibold text-ink">{t("sell.form.specs")}</p>
            <div className="space-y-2">
              {specs.map((s, i) => (
                <div key={i} className="flex gap-2">
                  <Input aria-label={t("sell.form.specLabel")} placeholder={t("sell.form.specLabel")} value={s.label} onChange={(e) => setSpecs(specs.map((x, k) => (k === i ? { ...x, label: e.target.value } : x)))} />
                  <Input aria-label={t("sell.form.specValue")} placeholder={t("sell.form.specValue")} value={s.value} onChange={(e) => setSpecs(specs.map((x, k) => (k === i ? { ...x, value: e.target.value } : x)))} />
                  <Button type="button" variant="ghost" className="w-11 shrink-0 px-0" onClick={() => setSpecs(specs.filter((_, k) => k !== i))} aria-label={t("common.delete")}>
                    <Trash className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
            <Button type="button" variant="soft" size="sm" className="mt-2" onClick={() => setSpecs([...specs, { label: "", value: "" }])}>
              <Plus className="size-4" /> {t("sell.form.addSpec")}
            </Button>
          </div>
        </Card>

        <Card className="space-y-4 p-5">
          <h2 className="text-lg font-bold text-ink">{t("sell.form.price")}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("sell.form.priceLabel")} error={errors.price}>
              {(id, d) => <Input id={id} aria-describedby={d} aria-invalid={!!errors.price} inputMode="decimal" type="number" min={0} step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} />}
            </Field>
            <Field label={t("sell.form.currency")} hint={t("sell.form.currencyHint")}>
              {(id, d) => (
                <Select id={id} aria-describedby={d} value={currency} onChange={(e) => setCurrency(e.target.value as CurrencyCode)}>
                  {CURRENCIES.map((c) => <option key={c} value={c}>{c} — {t(`currencies.${c}`)}</option>)}
                </Select>
              )}
            </Field>
          </div>
          <fieldset>
            <legend className="mb-1.5 text-[13px] font-semibold text-ink">{t("sell.form.saleType")}</legend>
            <div className="grid gap-2 sm:grid-cols-3">
              {(["ready", "to_order", "personalized"] as SaleType[]).map((s) => (
                <label key={s} className={cn("cursor-pointer rounded-xl border p-3 text-sm", saleType === s ? "border-ink bg-ink-soft/50" : "border-line hover:border-ink/40")}>
                  <input type="radio" name="saleType" value={s} checked={saleType === s} onChange={() => setSaleType(s)} className="sr-only" />
                  <span className="block font-bold text-ink">{t(`sell.saleType.${s}`)}</span>
                  <span className="block text-xs text-muted">{t(`sell.saleTypeHint.${s}`)}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <div className="grid gap-4 sm:grid-cols-2">
            {saleType === "ready" ? (
              <Field label={t("sell.form.stock")} error={errors.stock}>
                {(id, d) => <Input id={id} aria-describedby={d} aria-invalid={!!errors.stock} type="number" min={0} step={1} value={stock} onChange={(e) => setStock(e.target.value)} />}
              </Field>
            ) : (
              <Field label={t("sell.form.makeDays")} error={errors.makeDays}>
                {(id, d) => <Input id={id} aria-describedby={d} aria-invalid={!!errors.makeDays} type="number" min={1} step={1} value={makeDays} onChange={(e) => setMakeDays(e.target.value)} />}
              </Field>
            )}
          </div>
        </Card>

        <Card className="space-y-4 p-5">
          <h2 className="text-lg font-bold text-ink">{t("sell.form.delivery")}</h2>
          <Field label={t("sell.form.shipsFrom")}>
            {(id) => (
              <Select id={id} value={shipsFrom} onChange={(e) => setShipsFrom(e.target.value)}>
                {SHIP_COUNTRIES.map((c) => <option key={c} value={c}>{t(`countryName.${c}`)}</option>)}
              </Select>
            )}
          </Field>
          <fieldset>
            <legend className="mb-1.5 text-[13px] font-semibold text-ink">{t("sell.form.shipsTo")}</legend>
            <div className="flex flex-wrap gap-2">
              {SHIP_COUNTRIES.map((c) => (
                <Chip key={c} active={shipsTo.includes(c)} onClick={() => toggleShip(c)}>
                  {t(`countryName.${c}`)}
                </Chip>
              ))}
            </div>
            {errors.shipsTo && <p className="mt-1 text-xs font-semibold text-rose-deep" role="alert">{errors.shipsTo}</p>}
          </fieldset>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("sell.form.shipMode")}>
              {(id) => (
                <Select id={id} value={shipMode} onChange={(e) => setShipMode(e.target.value as ShippingMode)}>
                  {(["region", "fixed", "free"] as ShippingMode[]).map((m) => <option key={m} value={m}>{t(`sell.shipMode.${m}`)}</option>)}
                </Select>
              )}
            </Field>
            {shipMode === "fixed" && (
              <Field label={`${t("sell.form.shipCost")}, ${currency}`} error={errors.shipCost}>
                {(id, d) => <Input id={id} aria-describedby={d} aria-invalid={!!errors.shipCost} type="number" min={0} step="0.01" value={shipCost} onChange={(e) => setShipCost(e.target.value)} />}
              </Field>
            )}
          </div>
          <Field label={t("sell.form.shipTerms")} hint={t("sell.form.shipTermsHint")}>
            {(id, d) => <Textarea id={id} aria-describedby={d} value={shipTerms} onChange={(e) => setShipTerms(e.target.value)} rows={2} maxLength={600} />}
          </Field>
          <DemoNote>{t("delivery.demoNote")}</DemoNote>
        </Card>

        <div className="sticky bottom-20 z-10 flex flex-wrap justify-end gap-2 rounded-2xl border border-line bg-surface/95 p-3 shadow-lg backdrop-blur lg:bottom-4">
          <Button type="button" variant="ghost" onClick={() => router.back()}>{t("common.cancel")}</Button>
          {status === "draft" && (
            <Button type="button" variant="secondary" loading={busy} onClick={() => save("draft")}>{t("common.saveDraft")}</Button>
          )}
          <Button type="submit" loading={busy}>
            {status === "draft" ? t("common.publish") : t("sell.form.saveChanges")}
          </Button>
        </div>
      </form>
    </div>
  );
}
