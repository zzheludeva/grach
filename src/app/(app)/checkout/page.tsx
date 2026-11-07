"use client";
import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, MapPin, Plus } from "lucide-react";
import { useStore } from "@/lib/store";
import { useI18n } from "@/i18n/I18nProvider";
import { cartGroups } from "@/lib/cart";
import { sumByCurrency } from "@/lib/selectors";
import { applyPhoneMask, deliveryCost, formatAddressLines, region } from "@/lib/regions";
import { Card, DemoNote, EmptyState, Field, Input, PageHeader } from "@/components/ui/primitives";
import { Button, ButtonLink } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import type { Order } from "@/lib/types";

type Step = 0 | 1 | 2 | 3;

export default function Checkout() {
  const { state, meId, me, settings, actions } = useStore();
  const { t, money, date } = useI18n();
  const toast = useToast();
  const router = useRouter();
  const d = state!.data;
  const country = settings.country;
  const r = region(country);
  const groups = cartGroups(d, meId, country).filter((g) => g.checkoutable.length);
  const saved = d.addresses.filter((a) => a.userId === meId && a.country === country);

  const [step, setStep] = useState<Step>(0);
  const [addrId, setAddrId] = useState<string | "new">(saved[0]?.id ?? "new");
  const [fields, setFields] = useState<Record<string, string>>({ city: settings.city });
  const [contact, setContact] = useState({ recipient: saved[0]?.recipient ?? me!.name, phone: saved[0]?.phone ?? "", email: saved[0]?.email ?? me!.email ?? "" });
  const [saveAddr, setSaveAddr] = useState(true);
  const [method, setMethod] = useState(r.delivery[0].id);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [placing, setPlacing] = useState(false);

  const address = addrId === "new" ? fields : saved.find((a) => a.id === addrId)?.fields ?? {};
  const shipping = useMemo(
    () => groups.map((g) => ({ g, cost: deliveryCost(country, method, g.currency) })),
    [groups, country, method],
  );
  const totals = sumByCurrency(shipping.flatMap(({ g, cost }) => [{ amount: g.subtotal, currency: g.currency }, { amount: step >= 2 ? cost ?? 0 : 0, currency: g.currency }]));
  const unknownShipping = shipping.some((s) => s.cost === null);

  if (groups.length === 0 && !placing)
    return <EmptyState title={t("checkout.nothing")} text={t("checkout.nothingText")} action={<ButtonLink href="/cart">{t("nav.cart")}</ButtonLink>} />;

  const validateAddress = () => {
    const e: Record<string, string> = {};
    if (addrId === "new") {
      r.addressFields.forEach((f) => {
        const v = (fields[f.key] ?? "").trim();
        if (f.required && !v) e[f.key] = t("validation.required");
        else if (v && f.pattern && !f.pattern.test(v)) e[f.key] = t(`validation.addr.${f.key}`);
      });
    }
    setErrors(e);
    return !Object.keys(e).length;
  };
  const validateContact = () => {
    const e: Record<string, string> = {};
    if (contact.recipient.trim().length < 2) e.recipient = t("validation.required");
    if (!r.phone.pattern.test(contact.phone)) e.phone = t("validation.phone", { example: r.phone.placeholder });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email)) e.email = t("validation.email");
    setErrors(e);
    return !Object.keys(e).length;
  };

  const next = () => {
    if (step === 0 && !validateAddress()) return;
    if (step === 1 && !validateContact()) return;
    setStep((s) => Math.min(3, s + 1) as Step);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const place = () => {
    setPlacing(true);
    const addr: Order["address"] = { country, fields: address, recipient: contact.recipient.trim(), phone: contact.phone, email: contact.email };
    if (addrId === "new" && saveAddr) actions.saveAddress(addr);
    const ids = actions.placeOrder({
      address: addr,
      deliveryMethod: method,
      groups: shipping.map(({ g, cost }) => ({
        sellerId: g.seller.id,
        items: g.checkoutable.map((l) => ({ productId: l.product.id, title: l.product.title, image: l.product.images[0], qty: l.item.qty, unitPrice: l.product.price })),
        shipping: { amount: cost ?? 0, currency: g.currency },
      })),
    });
    toast({ text: t("checkout.placed") });
    setTimeout(() => router.push(`/orders/${ids[0]}?placed=${ids.length}`), 50);
  };

  const steps = [t("checkout.sAddress"), t("checkout.sContact"), t("checkout.sDelivery"), t("checkout.sReview")];
  const deliveryDays = r.delivery.find((m) => m.id === method)!.days;

  return (
    <div className="mx-auto max-w-5xl">
      <Link href="/cart" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink">
        <ArrowLeft className="size-4" /> {t("nav.cart")}
      </Link>
      <PageHeader title={t("checkout.title")} />
      <ol className="mb-6 grid grid-cols-4 gap-2">
        {steps.map((s, i) => (
          <li key={s}>
            <button onClick={() => i < step && setStep(i as Step)} disabled={i > step} className="w-full text-start">
              <span className={cn("block h-1.5 rounded-full", i <= step ? "bg-ink" : "bg-line")} />
              <span className={cn("mt-2 flex items-center gap-1 truncate text-xs font-semibold", i === step ? "text-ink" : "text-faint")}>
                {i < step && <Check className="size-3.5 shrink-0 text-teal" />}
                <span className="truncate">{s}</span>
              </span>
            </button>
          </li>
        ))}
      </ol>
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card className="p-5 sm:p-6">
          {step === 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-ink">{t("checkout.addressTitle", { country: t(`countries.${country}`) })}</h2>
              {saved.length > 0 && (
                <div className="space-y-2">
                  {saved.map((a) => (
                    <label key={a.id} className={cn("flex cursor-pointer gap-3 rounded-2xl border p-4", addrId === a.id ? "border-ink bg-ink-soft/40" : "border-line")}>
                      <input type="radio" name="addr" checked={addrId === a.id} onChange={() => { setAddrId(a.id); setContact({ recipient: a.recipient, phone: a.phone, email: a.email }); }} className="mt-1 accent-ink" />
                      <span className="min-w-0 text-sm">
                        <span className="block font-bold text-ink">{a.recipient}</span>
                        {formatAddressLines(a.country, a.fields).map((l) => (
                          <span key={l} className="block text-muted">{l}</span>
                        ))}
                      </span>
                    </label>
                  ))}
                  <label className={cn("flex cursor-pointer items-center gap-3 rounded-2xl border p-4 text-sm font-semibold", addrId === "new" ? "border-ink bg-ink-soft/40" : "border-line")}>
                    <input type="radio" name="addr" checked={addrId === "new"} onChange={() => setAddrId("new")} className="accent-ink" />
                    <Plus className="size-4" /> {t("checkout.newAddress")}
                  </label>
                </div>
              )}
              {addrId === "new" && (
                <div className="grid grid-cols-2 gap-4">
                  {r.addressFields.map((f) => (
                    <Field key={f.key} label={`${t(`address.${country}.${f.key}`)}${f.required ? "" : ` (${t("common.optional")})`}`} error={errors[f.key]} className={f.half ? "col-span-2 sm:col-span-1" : "col-span-2"}>
                      {(id, desc) => (
                        <Input
                          id={id}
                          aria-describedby={desc}
                          aria-invalid={!!errors[f.key]}
                          placeholder={f.placeholder}
                          inputMode={f.key === "postalCode" || f.key === "cep" ? "numeric" : undefined}
                          value={fields[f.key] ?? ""}
                          onChange={(e) => {
                            let v = e.target.value;
                            if (f.key === "cep") v = v.replace(/\D/g, "").slice(0, 8).replace(/^(\d{5})(\d)/, "$1-$2");
                            if (f.key === "postalCode") v = v.replace(/\D/g, "").slice(0, 6);
                            if (f.key === "state") v = v.toUpperCase().slice(0, 2);
                            setFields({ ...fields, [f.key]: v });
                          }}
                        />
                      )}
                    </Field>
                  ))}
                  <label className="col-span-2 inline-flex items-center gap-2 text-sm font-semibold text-ink">
                    <input type="checkbox" checked={saveAddr} onChange={(e) => setSaveAddr(e.target.checked)} className="size-4 accent-ink" />
                    {t("checkout.saveAddress")}
                  </label>
                </div>
              )}
              <p className="text-xs text-faint">{t("checkout.countryHint")}</p>
            </div>
          )}
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-ink">{t("checkout.contactTitle")}</h2>
              <Field label={t("checkout.recipient")} error={errors.recipient}>
                {(id, desc) => <Input id={id} autoComplete="name" aria-describedby={desc} aria-invalid={!!errors.recipient} value={contact.recipient} onChange={(e) => setContact({ ...contact, recipient: e.target.value })} />}
              </Field>
              <Field label={t("checkout.phone")} error={errors.phone} hint={t("checkout.phoneHint", { example: r.phone.placeholder })}>
                {(id, desc) => (
                  <Input
                    id={id}
                    type="tel"
                    autoComplete="tel"
                    aria-describedby={desc}
                    aria-invalid={!!errors.phone}
                    placeholder={r.phone.placeholder}
                    value={contact.phone}
                    onChange={(e) => setContact({ ...contact, phone: e.target.value.length < r.phone.prefix.length ? "" : applyPhoneMask(e.target.value, r.phone.mask, r.phone.prefix) })}
                    onFocus={() => !contact.phone && setContact({ ...contact, phone: r.phone.prefix + " " })}
                  />
                )}
              </Field>
              <Field label={t("onb.email")} error={errors.email}>
                {(id, desc) => <Input id={id} type="email" autoComplete="email" aria-describedby={desc} aria-invalid={!!errors.email} value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} />}
              </Field>
            </div>
          )}
          {step === 2 && (
            <div className="space-y-3">
              <h2 className="text-lg font-bold text-ink">{t("checkout.deliveryTitle")}</h2>
              {r.delivery.map((m) => (
                <label key={m.id} className={cn("flex cursor-pointer items-center gap-3 rounded-2xl border p-4", method === m.id ? "border-ink bg-ink-soft/40" : "border-line")}>
                  <input type="radio" name="m" checked={method === m.id} onChange={() => setMethod(m.id)} className="accent-ink" />
                  <span className="min-w-0 flex-1">
                    <span className="block font-bold text-ink">{t(`delivery.${country}.${m.id}`)}</span>
                    <span className="block text-sm text-muted">{t("delivery.days", { from: m.days[0], to: m.days[1] })}</span>
                  </span>
                  <span className="nums text-end text-sm font-semibold text-ink">
                    {[...new Set(groups.map((g) => g.currency))].map((c) => {
                      const v = m.cost[c];
                      return <span key={c} className="block">{v !== undefined ? money({ amount: v, currency: c }) : t("delivery.costUnknown")}</span>;
                    })}
                  </span>
                </label>
              ))}
              {groups.length > 1 && <p className="text-sm text-muted">{t("checkout.perShipment", { count: groups.length })}</p>}
              <DemoNote>{t("delivery.demoNote")}</DemoNote>
            </div>
          )}
          {step === 3 && (
            <div className="space-y-5">
              <h2 className="text-lg font-bold text-ink">{t("checkout.reviewTitle")}</h2>
              <div className="grid gap-3 rounded-2xl bg-bg p-4 text-sm sm:grid-cols-2">
                <div>
                  <p className="mb-1 flex items-center gap-1.5 text-xs font-bold uppercase text-faint">
                    <MapPin className="size-3.5" /> {t("checkout.sAddress")}
                  </p>
                  {formatAddressLines(country, address).map((l) => (
                    <p key={l} className="text-ink">{l}</p>
                  ))}
                </div>
                <div>
                  <p className="mb-1 text-xs font-bold uppercase text-faint">{t("checkout.sContact")}</p>
                  <p className="text-ink">{contact.recipient}</p>
                  <p className="nums text-ink">{contact.phone}</p>
                  <p className="text-ink">{contact.email}</p>
                </div>
              </div>
              {shipping.map(({ g, cost }, i) => (
                <div key={g.seller.id} className="rounded-2xl border border-line">
                  <p className="border-b border-line px-4 py-2.5 text-sm font-bold text-ink">
                    {t("checkout.shipmentN", { n: i + 1, total: shipping.length })} · {g.seller.name}
                  </p>
                  <ul className="divide-y divide-line">
                    {g.checkoutable.map((l) => (
                      <li key={l.product.id} className="flex items-center gap-3 px-4 py-2.5">
                        <Image src={l.product.images[0]} alt="" width={44} height={44} className="size-11 rounded-lg object-cover" />
                        <span className="min-w-0 flex-1 truncate text-sm text-ink" lang={l.product.lang}>{l.product.title}</span>
                        <span className="nums text-sm text-muted">×{l.item.qty}</span>
                        <span className="nums text-sm font-semibold">{money({ amount: l.product.price.amount * l.item.qty, currency: g.currency })}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="space-y-1 border-t border-line px-4 py-2.5 text-sm">
                    <p className="flex justify-between"><span className="text-muted">{t(`delivery.${country}.${method}`)}</span><span className="nums">{cost !== null ? money({ amount: cost, currency: g.currency }) : t("delivery.costUnknown")}</span></p>
                    <p className="flex justify-between font-bold"><span>{t("checkout.shipmentTotal")}</span><span className="nums">{money({ amount: g.subtotal + (cost ?? 0), currency: g.currency })}</span></p>
                    <p className="text-xs text-faint">{t("checkout.eta", { date: date(new Date(Date.now() + (deliveryDays[1] + Math.max(0, ...g.checkoutable.map((l) => (l.product.availability === "made_to_order" ? l.product.makeDays ?? 0 : 0)))) * 86400000).toISOString(), "long") })}</p>
                  </div>
                </div>
              ))}
              <DemoNote>{t("common.noPayment")}</DemoNote>
            </div>
          )}
          <div className="mt-6 flex items-center justify-between gap-3 border-t border-line pt-5">
            {step > 0 ? (
              <Button variant="ghost" onClick={() => setStep((s) => (s - 1) as Step)}>
                <ArrowLeft className="size-4" /> {t("common.back")}
              </Button>
            ) : (
              <span />
            )}
            {step < 3 ? (
              <Button onClick={next}>{t("common.next")}</Button>
            ) : (
              <Button variant="accent" size="lg" onClick={place} loading={placing} disabled={unknownShipping}>
                {t("checkout.confirm")}
              </Button>
            )}
          </div>
        </Card>
        <aside className="lg:sticky lg:top-20 lg:h-fit">
          <Card className="space-y-3 p-5">
            <p className="font-bold text-ink">{t("cart.summary")}</p>
            {shipping.map(({ g, cost }) => (
              <div key={g.seller.id} className="text-sm">
                <p className="truncate font-semibold text-ink">{g.seller.name}</p>
                <p className="flex justify-between text-muted"><span>{t("cart.subtotal")}</span><span className="nums">{money({ amount: g.subtotal, currency: g.currency })}</span></p>
                <p className="flex justify-between text-muted"><span>{t("cart.delivery")}</span><span className="nums">{step >= 2 ? (cost !== null ? money({ amount: cost, currency: g.currency }) : t("delivery.costUnknown")) : "—"}</span></p>
              </div>
            ))}
            <div className="border-t border-line pt-3">
              <p className="text-sm text-muted">{t("checkout.total")}</p>
              {totals.map((m) => (
                <p key={m.currency} className="nums text-2xl font-bold text-ink">{money(m)}</p>
              ))}
            </div>
            <p className="text-xs text-faint">{t("cart.feesNote")}</p>
          </Card>
        </aside>
      </div>
    </div>
  );
}
