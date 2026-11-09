"use client";
import Image from "next/image";
import Link from "next/link";
import { AlertTriangle, Minus, Plus, ShoppingCart, Trash, Store, Info } from "lucide-react";
import { useStore } from "@/lib/store";
import { useI18n } from "@/i18n/I18nProvider";
import { cartGroups } from "@/lib/cart";
import { sumByCurrency } from "@/lib/selectors";
import { Avatar, Badge, Card, DemoNote, EmptyState, PageHeader } from "@/components/ui/primitives";
import { Button, ButtonLink } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

export default function CartPage() {
  const { state, meId, settings, actions } = useStore();
  const { t, money, num } = useI18n();
  const toast = useToast();
  const d = state!.data;
  const groups = cartGroups(d, meId, settings.country);
  const totals = sumByCurrency(groups.filter((g) => g.checkoutable.length).map((g) => ({ amount: g.subtotal, currency: g.currency })));
  const issues = groups.flatMap((g) => g.lines).filter((l) => l.issue).length;
  const okCount = groups.reduce((s, g) => s + g.checkoutable.reduce((a, l) => a + l.item.qty, 0), 0);

  if (groups.length === 0)
    return (
      <div className="mx-auto max-w-3xl">
        <PageHeader title={t("cart.title")} />
        <EmptyState icon={<ShoppingCart className="size-6" />} title={t("cart.empty")} text={t("cart.emptyText")} action={<ButtonLink href="/market">{t("cart.toMarket")}</ButtonLink>} />
      </div>
    );

  return (
    <div>
      <PageHeader title={t("cart.title")} subtitle={t("cart.items", { count: groups.reduce((s, g) => s + g.lines.reduce((a, l) => a + l.item.qty, 0), 0) })} />
      {issues > 0 && (
        <div className="mb-5 flex items-start gap-3 rounded-2xl border border-saffron/50 bg-saffron-soft px-4 py-3 text-sm text-[#6b4300]" role="status">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <span>{t("cart.checkItems", { count: issues })}</span>
        </div>
      )}
      <div className="grid gap-6 lg:grid-cols-[1fr_340px] [&>*]:min-w-0">
        <div className="space-y-5">
          {groups.length > 1 && (
            <p className="flex items-start gap-2 text-sm text-muted">
              <Info className="mt-0.5 size-4 shrink-0" />
              {t("cart.multiSeller", { count: groups.length })}
            </p>
          )}
          {groups.map((g) => (
            <Card key={g.seller.id} className="overflow-hidden">
              <div className="flex items-center gap-3 border-b border-line bg-bg/60 px-4 py-3">
                <Store className="size-4 text-muted" />
                <Avatar name={g.seller.name} color={g.seller.avatarColor} size={26} />
                <Link href={`/profile/${g.seller.username}`} className="min-w-0 flex-1 truncate text-sm font-bold text-ink hover:underline">
                  {g.seller.name}
                </Link>
                <span className="text-xs text-faint">{t("cart.shipment")}</span>
              </div>
              <ul className="divide-y divide-line">
                {g.lines.map(({ item, product: p, issue, maxQty }) => (
                  <li key={p.id} className={cn("flex gap-3 p-4 sm:gap-4", issue === "unavailable" && "bg-bg/50")}>
                    <Link href={`/market/${p.id}`} className="relative size-20 shrink-0 overflow-hidden rounded-xl bg-line sm:size-24">
                      <Image src={p.images[0]} alt={p.title} fill sizes="96px" className={cn("object-cover", issue === "unavailable" && "grayscale")} />
                    </Link>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <Link href={`/market/${p.id}`} className="line-clamp-2 font-bold leading-snug text-ink hover:underline" lang={p.lang}>
                            {p.title}
                          </Link>
                          <Link href={`/profile/${g.seller.username}`} className="text-xs text-muted hover:text-ink">
                            {g.seller.name}
                          </Link>
                        </div>
                        <button
                          onClick={() => {
                            actions.removeFromCart(p.id);
                            toast({ text: t("cart.removed"), tone: "info", action: { label: t("common.undo"), onClick: () => actions.addToCart(p.id, item.qty) } });
                          }}
                          className="shrink-0 rounded-lg p-1.5 text-faint hover:bg-rose-soft hover:text-rose-deep"
                          aria-label={t("cart.remove")}
                        >
                          <Trash className="size-4" />
                        </button>
                      </div>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {p.availability === "in_stock" && !issue && <Badge tone="success">{t("product.inStock")}</Badge>}
                        {p.availability === "made_to_order" && <Badge tone="warn">{t("product.madeToOrderDays", { count: p.makeDays ?? 0 })}</Badge>}
                      </div>
                      {issue === "unavailable" && <p className="mt-2 text-sm font-semibold text-rose-deep">{t("cart.unavailable")}</p>}
                      {issue === "noShipping" && <p className="mt-2 text-sm font-semibold text-rust">{t("cart.noShipping", { country: t(`countries.${settings.country}`) })}</p>}
                      {issue === "priceChanged" && (
                        <div className="mt-2 rounded-xl bg-saffron-soft px-3 py-2 text-sm text-[#6b4300]">
                          <p>
                            {t("cart.priceChanged", { old: money(item.priceAtAdd), new: money(p.price) })}
                          </p>
                          <button onClick={() => actions.acceptPrice(p.id)} className="mt-1 font-bold underline">
                            {t("cart.acceptPrice")}
                          </button>
                        </div>
                      )}
                      {issue === "qtyReduced" && (
                        <div className="mt-2 rounded-xl bg-saffron-soft px-3 py-2 text-sm text-[#6b4300]">
                          {t("cart.qtyReduced", { count: maxQty })}{" "}
                          <button onClick={() => actions.setCartQty(p.id, maxQty)} className="font-bold underline">
                            {t("cart.fix")}
                          </button>
                        </div>
                      )}
                      {issue !== "unavailable" && (
                        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center rounded-lg border border-line">
                            <button onClick={() => actions.setCartQty(p.id, item.qty - 1)} disabled={item.qty <= 1} className="flex size-9 items-center justify-center disabled:opacity-30" aria-label={t("cart.less")}>
                              <Minus className="size-3.5" />
                            </button>
                            <span className="nums w-8 text-center text-sm font-bold">{item.qty}</span>
                            <button onClick={() => actions.setCartQty(p.id, item.qty + 1)} disabled={item.qty >= maxQty} className="flex size-9 items-center justify-center disabled:opacity-30" aria-label={t("cart.more")}>
                              <Plus className="size-3.5" />
                            </button>
                          </div>
                          <div className="text-end">
                            <p className="nums font-bold text-ink">{money({ amount: p.price.amount * item.qty, currency: p.price.currency })}</p>
                            {item.qty > 1 && <p className="nums text-xs text-faint">{t("cart.each", { price: money(p.price) })}</p>}
                          </div>
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
              {g.checkoutable.length > 0 && (
                <div className="flex justify-between border-t border-line px-4 py-3 text-sm">
                  <span className="text-muted">{t("cart.sellerSubtotal")}</span>
                  <span className="nums font-bold text-ink">{money({ amount: g.subtotal, currency: g.currency })}</span>
                </div>
              )}
            </Card>
          ))}
        </div>
        <aside className="lg:sticky lg:top-32 lg:h-fit">
          <Card className="space-y-3 p-5">
            <p className="text-lg font-bold text-ink">{t("cart.summary")}</p>
            <div className="flex justify-between text-sm">
              <span className="text-muted">{t("cart.readyItems")}</span>
              <span className="nums font-semibold">{num(okCount)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted">{t("cart.delivery")}</span>
              <span className="text-end text-muted">{t("cart.deliveryAtCheckout")}</span>
            </div>
            <div className="border-t border-line pt-3">
              <p className="text-sm text-muted">{t("cart.subtotal")}</p>
              {totals.length ? totals.map((m) => <p key={m.currency} className="nums text-2xl font-bold text-ink">{money(m)}</p>) : <p className="text-2xl font-bold text-ink">—</p>}
              {totals.length > 1 && <p className="mt-1 text-xs text-faint">{t("money.multiCurrency")}</p>}
            </div>
            <ButtonLink href="/checkout" variant="accent" size="lg" className={cn("w-full", okCount === 0 && "pointer-events-none opacity-50")} aria-disabled={okCount === 0}>
              {t("cart.checkout")}
            </ButtonLink>
            {issues > 0 && okCount > 0 && <p className="text-xs text-muted">{t("cart.issuesExcluded")}</p>}
            <DemoNote>{t("cart.feesNote")}</DemoNote>
          </Card>
        </aside>
      </div>
    </div>
  );
}
