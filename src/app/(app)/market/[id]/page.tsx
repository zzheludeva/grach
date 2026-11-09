"use client";
import { use, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Hammer, MessageCircle, Minus, Plus, Ruler, Truck, MapPin, ShoppingCart, PackageCheck, Pencil, Brush, ListChecks, Tag } from "lucide-react";
import { useStore } from "@/lib/store";
import { BackLink } from "@/components/common/BackLink";
import { useI18n } from "@/i18n/I18nProvider";
import { canShipTo, cartOf, rating, userById } from "@/lib/selectors";
import { Avatar, Badge, Card, EmptyState, Stars, DemoNote } from "@/components/ui/primitives";
import { Button, ButtonLink } from "@/components/ui/button";
import { FollowButton, SaveButton } from "@/components/common/actions";
import { Price, ProductCard } from "@/components/common/cards";
import { useToast } from "@/components/ui/toast";
import { region } from "@/lib/regions";
import { cn } from "@/lib/utils";
import { useTranslation, TranslateBar } from "@/components/common/Translatable";
import { techniqueName } from "@/i18n/content";

export default function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { state, meId, settings, actions } = useStore();
  const { t, cat, money, relative, langName, locale } = useI18n();
  const toast = useToast();
  const router = useRouter();
  const d = state!.data;
  const p = d.products.find((x) => x.id === id);
  const [img, setImg] = useState(0);
  const [qty, setQty] = useState(1);
  const tr = useTranslation(p?.lang ?? "ru");
  useEffect(() => {
    if (p) actions.viewProduct(p.id);
    // count one view per visit
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);
  // Drafts and hidden products are visible to their seller only.
  if (p && p.status !== "published" && p.sellerId !== meId) return <EmptyState title={t("sell.page.notAvailable")} action={<ButtonLink href="/market">{t("nav.market")}</ButtonLink>} />;
  if (!p) return <EmptyState title={t("errors.notFound")} action={<ButtonLink href="/market">{t("nav.market")}</ButtonLink>} />;
  const seller = userById(d, p.sellerId)!;
  const ships = canShipTo(p, settings.country);
  const inCart = cartOf(d, meId).find((c) => c.productId === p.id);
  const isMine = p.sellerId === meId;
  const max = p.availability === "in_stock" ? p.stock : 10;
  const reviews = d.productReviews.filter((r) => r.productId === p.id);
  const r = rating(reviews);
  const pub = d.products.filter((x) => x.status === "published" && x.id !== p.id);
  const similar = pub.filter((x) => x.category === p.category).concat(pub.filter((x) => x.sellerId === p.sellerId && x.category !== p.category)).slice(0, 4);
  const buyable = p.status === "published";
  const delivery = region(settings.country).delivery;
  const sameCountry = p.shipsFrom === settings.country;

  const add = () => {
    actions.addToCart(p.id, qty);
    toast({ text: t("cart.added"), action: { label: t("cart.goToCart"), href: "/cart" } });
  };

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <BackLink fallback={isMine ? "/dashboard/products" : "/market"} fallbackLabel={isMine ? t("nav.myProducts") : t("nav.market")} />
        {isMine && (
          <ButtonLink href={`/dashboard/products/${p.id}`} size="sm" variant="soft">
            <Pencil className="size-3.5" /> {t("sell.page.edit")}
          </ButtonLink>
        )}
      </div>
      {p.status !== "published" && <DemoNote className="mb-4">{p.status === "draft" ? t("sell.page.draft") : t("sell.page.hidden")}</DemoNote>}
      <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr]">
        <div className="min-w-0">
          <div className="relative aspect-square overflow-hidden rounded-3xl bg-line">
            <Image src={p.images[img] ?? p.images[0]} alt={p.title} fill priority sizes="(max-width: 1024px) 100vw, 600px" className={cn("object-cover", p.availability === "sold_out" && "grayscale-[50%]")} />
            <SaveButton type="product" id={p.id} variant="glass" className="absolute end-3 top-3" />
          </div>
          {p.images.length > 1 && (
            <div className="mt-3 flex gap-2">
              {p.images.map((src, i) => (
                <button key={`${i}-${src.slice(-20)}`} onClick={() => setImg(i)} aria-label={t("product.photo", { n: i + 1 })} aria-pressed={img === i} className={cn("relative size-20 overflow-hidden rounded-xl border-2", img === i ? "border-ink" : "border-transparent opacity-70 hover:opacity-100")}>
                  <Image src={src} alt="" fill sizes="80px" className="object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap gap-1.5">
            <Badge>{cat(p.category)}</Badge>
            {p.saleType === "personalized" && <Badge tone="info">{t("sell.saleType.personalized")}</Badge>}
            {p.availability === "in_stock" && <Badge tone="success">{t("product.inStockCount", { count: p.stock })}</Badge>}
            {p.availability === "made_to_order" && <Badge tone="warn">{t("product.madeToOrderDays", { count: p.makeDays ?? 0 })}</Badge>}
            {p.availability === "sold_out" && <Badge tone="dark">{t("product.soldOut")}</Badge>}
          </div>
          <h1 className="mt-3 font-display text-3xl leading-tight text-ink sm:text-4xl" lang={p.lang}>
            {p.title}
          </h1>
          <Link href={`/profile/${seller.username}`} className="mt-1 inline-block text-sm font-semibold text-muted hover:text-ink">
            {t("product.by", { name: seller.name })}
          </Link>
          {r !== null && (
            <p className="mt-1 flex items-center gap-1.5 text-sm text-muted">
              <Stars value={r} /> <span className="nums">{r}</span> · {t("learn.reviewsCount", { count: reviews.length })}
            </p>
          )}
          <Price value={p.price} className="mt-4 flex text-3xl font-bold text-ink" />
          {p.price.currency !== settings.currency && <p className="mt-1 text-xs text-muted">{t("money.noConversion")}</p>}
          <p className="mt-4 text-[15px] leading-relaxed text-text/90" lang={p.lang}>
            {p.summary}
          </p>
          <div className="mt-1">
            <TranslateBar contentLang={p.lang} state={tr} />
          </div>

          {!ships && (
            <div className="mt-4 rounded-2xl border border-rust/30 bg-rust-soft px-4 py-3 text-sm text-rust">
              <p className="font-bold">{t("product.noShipTitle", { country: t(`countries.${settings.country}`) })}</p>
              <p className="mt-0.5">{t("product.noShipText")}</p>
            </div>
          )}

          {p.saleType === "personalized" && <p className="mt-3 text-sm text-muted">{t("sell.page.personalized")}</p>}
          {!isMine && buyable && p.availability !== "sold_out" && ships && (
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <div className="flex items-center rounded-xl border border-line bg-surface">
                <button onClick={() => setQty(Math.max(1, qty - 1))} className="flex size-11 items-center justify-center text-ink disabled:opacity-30" disabled={qty <= 1} aria-label={t("cart.less")}>
                  <Minus className="size-4" />
                </button>
                <span className="nums w-8 text-center font-bold" aria-live="polite">
                  {qty}
                </span>
                <button onClick={() => setQty(Math.min(max, qty + 1))} className="flex size-11 items-center justify-center text-ink disabled:opacity-30" disabled={qty >= max} aria-label={t("cart.more")}>
                  <Plus className="size-4" />
                </button>
              </div>
              <Button size="lg" variant="accent" onClick={add} className="flex-1">
                <ShoppingCart className="size-4" /> {t("product.addToCart")}
              </Button>
            </div>
          )}
          {inCart && (
            <p className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-teal">
              <Check className="size-4" /> {t("product.inCart", { count: inCart.qty })}{" "}
              <Link href="/cart" className="text-ink underline">
                {t("cart.goToCart")}
              </Link>
            </p>
          )}
          {p.availability === "sold_out" && <DemoNote className="mt-4">{t("product.soldOutText")}</DemoNote>}
          {isMine && <DemoNote className="mt-4">{t("product.yours")}</DemoNote>}
          <div className="mt-4 flex flex-wrap gap-2">
            <SaveButton type="product" id={p.id} variant="button" />
            {!isMine && (
              <ButtonLink href={`/messages/${seller.username}`} variant="secondary">
                <MessageCircle className="size-4" /> {t("product.askSeller")}
              </ButtonLink>
            )}
          </div>

          <dl className="mt-6 grid grid-cols-1 gap-3 rounded-2xl border border-line bg-surface p-4 text-sm sm:grid-cols-2">
            {p.materials.length > 0 && <div className="flex gap-2.5">
              <Hammer className="mt-0.5 size-4 shrink-0 text-rust" />
              <div>
                <dt className="text-xs font-semibold text-faint">{t("product.materials")}</dt>
                <dd className="text-ink" lang={p.lang}>
                  {p.materials.join(", ")}
                </dd>
              </div>
            </div>}
            {p.dimensions && <div className="flex gap-2.5">
              <Ruler className="mt-0.5 size-4 shrink-0 text-rust" />
              <div>
                <dt className="text-xs font-semibold text-faint">{t("product.dimensions")}</dt>
                <dd className="text-ink" lang={p.lang}>
                  {p.dimensions}
                </dd>
              </div>
            </div>}
            {p.technique && (
              <div className="flex gap-2.5">
                <Brush className="mt-0.5 size-4 shrink-0 text-rust" />
                <div>
                  <dt className="text-xs font-semibold text-faint">{t("sell.page.technique")}</dt>
                  <dd className="text-ink">{techniqueName(p.technique, locale)}</dd>
                </div>
              </div>
            )}
            <div className="flex gap-2.5">
              <Tag className="mt-0.5 size-4 shrink-0 text-rust" />
              <div>
                <dt className="text-xs font-semibold text-faint">{t("sell.page.saleType")}</dt>
                <dd className="text-ink">{t(`sell.saleType.${p.saleType}`)}</dd>
              </div>
            </div>
            <div className="flex gap-2.5">
              <PackageCheck className="mt-0.5 size-4 shrink-0 text-rust" />
              <div>
                <dt className="text-xs font-semibold text-faint">{t("product.leadTime")}</dt>
                <dd className="text-ink">{p.availability === "made_to_order" ? t("product.makeDays", { count: p.makeDays ?? 0 }) : p.availability === "in_stock" ? t("product.shipsIn") : "—"}</dd>
              </div>
            </div>
            <div className="flex gap-2.5">
              <MapPin className="mt-0.5 size-4 shrink-0 text-rust" />
              <div>
                <dt className="text-xs font-semibold text-faint">{t("product.shipsFrom")}</dt>
                <dd className="text-ink">
                  {t(`countryName.${p.shipsFrom}`)} → {p.shipsTo.map((c) => t(`countryName.${c}`)).join(", ")}
                </dd>
              </div>
            </div>
          </dl>
          {!!p.specs?.length && (
            <div className="mt-3 rounded-2xl border border-line bg-surface p-4 text-sm">
              <p className="mb-2 flex items-center gap-2 font-bold text-ink">
                <ListChecks className="size-4 text-rust" /> {t("sell.page.specs")}
              </p>
              <dl className="divide-y divide-line">
                {p.specs.map((sp, i) => (
                  <div key={i} className="flex justify-between gap-3 py-1.5" lang={p.lang}>
                    <dt className="text-muted">{sp.label}</dt>
                    <dd className="text-end font-semibold text-ink">{sp.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
          {ships && p.shipping && p.shipping.mode !== "region" ? (
            <div className="mt-3 rounded-2xl border border-line bg-surface p-4 text-sm">
              <p className="mb-1 flex items-center gap-2 font-bold text-ink">
                <Truck className="size-4 text-rust" /> {t("sell.page.sellerShipping")}
              </p>
              <p className="nums text-text/85">
                {p.shipping.mode === "free" ? t("sell.page.freeShipping") : t("sell.page.fixedCost", { cost: money({ amount: p.shipping.cost ?? 0, currency: p.price.currency }) })}
              </p>
              {p.shipping.terms && (
                <p className="mt-2 text-text/85" lang={p.lang}>
                  <span className="font-semibold text-ink">{t("sell.page.terms")}:</span> {p.shipping.terms}
                </p>
              )}
              <p className="mt-2 text-xs text-faint">{t("delivery.demoNote")}</p>
            </div>
          ) : ships && (
            <div className="mt-3 rounded-2xl border border-line bg-surface p-4 text-sm">
              <p className="mb-2 flex items-center gap-2 font-bold text-ink">
                <Truck className="size-4 text-rust" /> {t("product.deliveryTo", { country: t(`countries.${settings.country}`) })}
              </p>
              <ul className="space-y-1">
                {delivery.map((m) => {
                  const cost = m.cost[p.price.currency];
                  return (
                    <li key={m.id} className="flex flex-wrap justify-between gap-2 text-text/85">
                      <span>
                        {t(`delivery.${settings.country}.${m.id}`)} · {t("delivery.days", { from: m.days[0], to: m.days[1] })}
                      </span>
                      <span className="nums font-semibold">{cost !== undefined ? money({ amount: cost, currency: p.price.currency }) : t("delivery.costUnknown")}</span>
                    </li>
                  );
                })}
              </ul>
              {!sameCountry && <p className="mt-2 text-xs text-faint">{t("delivery.intlNote")}</p>}
              {p.shipping?.terms && (
                <p className="mt-2 text-text/85" lang={p.lang}>
                  <span className="font-semibold text-ink">{t("sell.page.terms")}:</span> {p.shipping.terms}
                </p>
              )}
              <p className="mt-2 text-xs text-faint">{t("delivery.demoNote")}</p>
            </div>
          )}
        </div>
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-[1.4fr_1fr] [&>*]:min-w-0">
        <Card className="overflow-hidden">
          <div className="grout px-5 py-4">
            <p className="font-display text-2xl text-white">{t("product.story")}</p>
          </div>
          <div className="space-y-4 p-5">
            {p.story && (
              <p className="text-[15px] italic leading-relaxed text-text/90" lang={p.lang}>
                “{p.story}”
              </p>
            )}
            <p className="text-[15px] leading-relaxed text-text/85" lang={p.lang}>
              {p.description}
            </p>
            <p className="text-xs text-faint">{t("translate.original", { lang: langName(p.lang) })}</p>
          </div>
        </Card>
        <Card className="p-5">
          <p className="mb-3 text-xs font-bold uppercase tracking-wider text-faint">{t("product.aboutMaker")}</p>
          <div className="flex items-center gap-3">
            <Avatar name={seller.name} color={seller.avatarColor} size={56} href={`/profile/${seller.username}`} />
            <Link href={`/profile/${seller.username}`} className="min-w-0 flex-1">
              <span className="block truncate text-lg font-bold text-ink hover:underline">{seller.name}</span>
              <span className="block truncate text-sm text-muted">
                {t(`status.${seller.status}`)} · {seller.city}
              </span>
            </Link>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-text/85" lang={seller.contentLang}>
            {seller.bio}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <FollowButton userId={seller.id} size="md" />
            <ButtonLink href={`/profile/${seller.username}`} variant="secondary">
              {t("product.viewProfile")}
            </ButtonLink>
          </div>
        </Card>
      </div>

      {reviews.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-4 font-display text-2xl text-ink">{t("learn.reviews")}</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {reviews.map((rv, i) => {
              const u = userById(d, rv.authorId);
              if (!u) return null;
              return (
                <Card key={i} className="flex gap-3 p-4">
                  <Avatar name={u.name} color={u.avatarColor} size={36} />
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-ink">
                      {u.name} <Stars value={rv.rating} className="ms-1 align-middle" />
                    </p>
                    <p className="text-sm text-text/85">{rv.text}</p>
                    <p className="text-xs text-faint">{relative(rv.at)}</p>
                  </div>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      {similar.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-4 font-display text-2xl text-ink">{t("product.similar")}</h2>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
            {similar.map((x) => (
              <ProductCard key={x.id} p={x} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
