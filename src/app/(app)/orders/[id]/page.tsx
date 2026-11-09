"use client";
import { use, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { BellRing, Check, Copy, Info, MessageCircle, PartyPopper, RotateCcw, Star, ExternalLink, Truck, Camera, X } from "lucide-react";
import { useStore } from "@/lib/store";
import { useI18n } from "@/i18n/I18nProvider";
import { userById } from "@/lib/selectors";
import { canCancel, canConfirmReceived, canRemindReady, canSellerCancel, nextStep, pendingReady, readyWaitingDays, READY_NO_RESPONSE_DAYS, READY_REMIND_COOLDOWN_H, sellerNext, STATUS_TONE } from "@/lib/orders";
import { OrderTimeline, SellerStepModal, RejectModal, PhotoViewer, SellerCancelModal } from "@/components/orders/OrderFlow";
import { BackLink } from "@/components/common/BackLink";
import { formatAddressLines } from "@/lib/regions";
import { Avatar, Badge, Card, DemoNote, EmptyState, Textarea } from "@/components/ui/primitives";
import { Button, ButtonLink } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { orderLabelKey } from "@/components/common/OrderStatusBadge";
import { cn } from "@/lib/utils";

export default function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const sp = useSearchParams();
  const { state, meId, actions } = useStore();
  const { t, money, date, relative } = useI18n();
  const toast = useToast();
  const router = useRouter();
  const d = state!.data;
  const o = d.orders.find((x) => x.id === id);
  const [cancel, setCancel] = useState(false);
  const [sellerCancel, setSellerCancel] = useState(false);
  const [review, setReview] = useState<{ productId: string; rating: number; text: string } | null>(null);
  const [step, setStep] = useState(false);
  const [reject, setReject] = useState(false);
  const [viewPhoto, setViewPhoto] = useState<string | null>(null);
  if (!o || (o.buyerId !== meId && o.sellerId !== meId)) return <EmptyState title={t("errors.notFound")} action={<ButtonLink href="/orders">{t("nav.orders")}</ButtonLink>} />;
  const seller = userById(d, o.sellerId)!;
  const siblings = d.orders.filter((x) => x.groupId === o.groupId && x.id !== o.id);
  const placed = sp.get("placed");
  const isBuyer = o.buyerId === meId;
  const isSeller = o.sellerId === meId;
  const buyer = userById(d, o.buyerId);
  const nxt = isSeller ? sellerNext(o) : null;
  const waiting = pendingReady(o);
  const ns = nextStep(o);
  const waitDays = readyWaitingDays(o);
  const noResponse = !!waiting && waitDays >= READY_NO_RESPONSE_DAYS;
  const photos = o.readyPhotos?.length ? o.readyPhotos : o.readyPhoto ? [o.readyPhoto] : [];

  return (
    <div className="mx-auto max-w-5xl">
      <BackLink fallback={isSeller ? "/orders?role=seller" : "/orders"} fallbackLabel={isSeller ? t("nav2.sales") : t("nav2.purchases")} className="mb-3" />
      {placed && (
        <div className="mb-5 flex items-start gap-3 rounded-2xl bg-ink p-4 text-white">
          <PartyPopper className="mt-0.5 size-5 shrink-0 text-saffron" />
          <div>
            <p className="font-bold">{t("orders.placedTitle")}</p>
            <p className="text-sm text-white/80">{Number(placed) > 1 ? t("orders.placedMulti", { count: Number(placed) }) : t("orders.placedText")}</p>
          </div>
        </div>
      )}
      <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2">
        <h1 className="nums font-display text-2xl leading-tight text-ink min-[380px]:text-[28px] sm:text-3xl">{t("orders.order", { number: o.number })}</h1>
        <Badge tone={STATUS_TONE[o.status]} className="text-sm">{t(orderLabelKey(o))}</Badge>
        <span className="text-xs font-semibold text-muted">{isSeller ? t("nav2.youSell") : t("nav2.youBuy")}</span>
      </div>
      {/* Who acts next — the same card for both sides, worded for the viewer. */}
      <div
        className={cn(
          "mb-5 flex items-start gap-3 rounded-2xl border p-4 text-sm",
          ns.who === "none" ? "border-line bg-surface" : (ns.who === "seller") === isSeller ? "border-teal/50 bg-teal-soft/50" : "border-line bg-surface",
        )}
      >
        <Info className="mt-0.5 size-4 shrink-0 text-teal" />
        <div className="min-w-0">
          <p className="font-bold text-ink">
            {ns.who === "none" ? t(`ordx.next.${ns.key}`) : (ns.who === "seller") === isSeller ? t(`ordx.next.you.${ns.key}`) : t(`ordx.next.other.${ns.key}`)}
          </p>
          <p className="mt-0.5 text-muted">{t(`ordx.nextHint.${ns.key}`)}</p>
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_340px] [&>*]:min-w-0">
        <div className="min-w-0 space-y-6">
          {isBuyer && waiting && (
            <Card className="border-saffron/60 bg-saffron-soft/40 p-4 sm:p-5">
              <p className="font-bold text-ink">{t("ordx.askTitle")}</p>
              <p className="mt-1 text-sm text-muted">{t("ordx.askText")}</p>
              {photos.length > 0 && (
                <div className="mt-3 grid grid-cols-3 gap-2 sm:flex sm:flex-wrap">
                  {photos.map((src, i) => (
                    <button key={i} onClick={() => setViewPhoto(src)} className="relative block aspect-square overflow-hidden rounded-xl border border-line sm:size-28" aria-label={t("ord.openPhoto")}>
                      <Image src={src} alt={t("ord.readyPhoto")} fill sizes="112px" unoptimized className="object-cover" />
                    </button>
                  ))}
                </div>
              )}
              {waiting.comment && <p className="mt-3 whitespace-pre-line rounded-xl bg-surface px-3 py-2 text-sm text-text/90">{waiting.comment}</p>}
              <div className="mt-4 grid gap-2 sm:flex sm:flex-wrap">
                <Button onClick={() => { if (actions.confirmReady(o.id)) toast({ text: t("ordx.toast.confirmed") }); }}>
                  <Check className="size-4" /> {t("ordx.confirmReady")}
                </Button>
                <Button variant="secondary" onClick={() => setReject(true)}>{t("ordx.rejectReady")}</Button>
              </div>
            </Card>
          )}
          {isSeller && (
            <Card className="p-4 sm:p-5">
              <p className="text-xs font-bold uppercase text-faint">{t("ord.sellerPanel")}</p>
              {o.status === "preparing" && o.readyRejection && (
                <div className="mt-2 rounded-xl bg-rose-soft px-3 py-2 text-sm text-rose-deep">
                  <p className="font-bold">{t("ordx.rejectedTitle")}</p>
                  <p className="whitespace-pre-line">{o.readyRejection.reason}</p>
                </div>
              )}
              {nxt ? (
                <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
                  <Button onClick={() => setStep(true)} className="w-full sm:w-auto">
                    {nxt === "ready" ? <Camera className="size-4" /> : nxt === "handed_over" ? <Truck className="size-4" /> : <Check className="size-4" />}{" "}
                    {nxt === "ready" ? (o.readyRejection ? t("ordx.action.resend") : t("ordx.action.ready")) : t(`ord.action.${nxt}`)}
                  </Button>
                  <span className="text-sm text-muted">{nxt === "ready" ? t("ordx.hint.ready") : t(`ord.hint.${nxt}`)}</span>
                </div>
              ) : waiting ? (
                <div className="mt-2 space-y-2 text-sm">
                  <p className="font-semibold text-ink">{t("ordx.waitingBuyer", { when: relative(o.readyRequestedAt!) })}</p>
                  <p className="text-muted">{t("ordx.cantShipYet")}</p>
                  {noResponse && <p className="rounded-xl bg-saffron-soft/60 px-3 py-2 text-ink">{t("ordx.noResponse", { count: waitDays })}</p>}
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button size="sm" variant="soft" disabled={!canRemindReady(o)} onClick={() => { if (actions.remindReady(o.id)) toast({ text: t("ordx.toast.reminded") }); }}>
                      <BellRing className="size-3.5" /> {t("ordx.remind")}
                    </Button>
                    {!canRemindReady(o) && <span className="self-center text-xs text-faint">{t("ordx.remindLimit", { hours: READY_REMIND_COOLDOWN_H })}</span>}
                  </div>
                </div>
              ) : (
                <p className="mt-2 text-sm text-muted">{o.status === "cancelled" ? t("ord.closedCancelled") : o.status === "received" || o.status === "delivered" ? t("ordx.closedReceived") : t("ordx.buyerReceiptTurn")}</p>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                {buyer && (
                  <ButtonLink href={`/messages/${buyer.username}?order=${o.id}`} variant="ghost" size="sm">
                    <MessageCircle className="size-4" /> {t("ord.messageBuyer")}
                  </ButtonLink>
                )}
                {canSellerCancel(o.status) && (
                  <Button variant="ghost" size="sm" className="text-rose-deep" onClick={() => setSellerCancel(true)}>
                    <X className="size-4" /> {t("orders.cancel")}
                  </Button>
                )}
              </div>
            </Card>
          )}
          {o.status === "cancelled" && o.cancelReason && (
            <Card className="p-4 text-sm">
              <p className="font-bold text-ink">{o.cancelledBy === o.sellerId ? t("ordx.cancelledBySeller") : t("ordx.cancelledByBuyer")}</p>
              <p className="mt-1 text-muted">{t("ord.reason")}: {o.cancelReason}</p>
            </Card>
          )}
          <Card className="p-4 sm:p-5">
            <h2 className="mb-4 font-bold text-ink">{t("orders.timeline")}</h2>
            <OrderTimeline order={o} onPhoto={setViewPhoto} />
          </Card>

          <Card className="overflow-hidden">
            <p className="border-b border-line px-5 py-3 font-bold text-ink">{t("orders.items")}</p>
            <ul className="divide-y divide-line">
              {o.items.map((i) => {
                const product = d.products.find((p) => p.id === i.productId);
                const repeatable = product && product.availability !== "sold_out" && product.shipsTo.includes(o.address.country);
                return (
                  <li key={i.productId} className="flex flex-wrap items-center gap-3 px-5 py-3">
                    <Link href={`/market/${i.productId}`} className="shrink-0">
                      <Image src={i.image} alt="" width={64} height={64} className="size-16 rounded-xl object-cover" />
                    </Link>
                    <div className="min-w-0 flex-1">
                      <Link href={`/market/${i.productId}`} className="line-clamp-2 font-semibold text-ink hover:underline">
                        {i.title}
                      </Link>
                      <p className="nums text-xs text-muted">
                        {i.qty} × {money(i.unitPrice)}
                      </p>
                    </div>
                    <span className="nums font-bold text-ink">{money({ amount: i.unitPrice.amount * i.qty, currency: i.unitPrice.currency })}</span>
                    {isBuyer && (o.status === "received" || o.status === "delivered") && (
                      <div className="flex w-full flex-wrap gap-2 sm:w-auto">
                        {!o.reviewed && (
                          <Button size="sm" variant="secondary" onClick={() => setReview({ productId: i.productId, rating: 5, text: "" })}>
                            <Star className="size-3.5" /> {t("orders.review")}
                          </Button>
                        )}
                        {repeatable && (
                          <Button
                            size="sm"
                            variant="soft"
                            onClick={() => {
                              actions.addToCart(i.productId, i.qty);
                              toast({ text: t("cart.added"), action: { label: t("cart.goToCart"), href: "/cart" } });
                            }}
                          >
                            <RotateCcw className="size-3.5" /> {t("orders.repeat")}
                          </Button>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
            <div className="space-y-1 border-t border-line px-5 py-3 text-sm">
              <p className="flex justify-between text-muted"><span>{t("cart.subtotal")}</span><span className="nums">{money(o.subtotal)}</span></p>
              <p className="flex justify-between text-muted"><span>{t("cart.delivery")}</span><span className="nums">{money(o.shipping)}</span></p>
              <p className="flex justify-between text-base font-bold text-ink"><span>{t("checkout.total")}</span><span className="nums">{money(o.total)}</span></p>
              <p className="text-xs text-faint">{t("cart.feesNote")}</p>
            </div>
          </Card>
          {siblings.length > 0 && (
            <Card className="p-4 text-sm">
              <p className="mb-2 font-bold text-ink">{t("orders.sameCheckout")}</p>
              {siblings.map((s) => (
                <Link key={s.id} href={`/orders/${s.id}`} className="nums block font-semibold text-teal hover:underline">
                  {s.number} · {userById(d, s.sellerId)?.name} · {money(s.total)}
                </Link>
              ))}
            </Card>
          )}
        </div>

        <aside className="space-y-4">
          <Card className="space-y-4 p-5 text-sm">
            {photos.length > 0 && (
              <div>
                <p className="text-xs font-bold uppercase text-faint">{t("ordx.readyPhotos")}</p>
                <div className={cn("mt-1 grid gap-2", photos.length > 1 ? "grid-cols-2" : "grid-cols-1")}>
                  {photos.map((src, i) => (
                    <button key={i} onClick={() => setViewPhoto(src)} className="relative block aspect-square w-full overflow-hidden rounded-xl border border-line" aria-label={t("ord.openPhoto")}>
                      <Image src={src} alt={t("ord.readyPhoto")} fill sizes="300px" unoptimized className="object-cover" />
                    </button>
                  ))}
                </div>
                {o.readyConfirmedAt && <p className="mt-1 text-xs font-semibold text-teal">{t("ordx.readyConfirmedAt", { date: date(o.readyConfirmedAt, "datetime") })}</p>}
              </div>
            )}
            {o.shipment ? (
              <div>
                <p className="text-xs font-bold uppercase text-faint">{t("ord.shipment")}</p>
                {o.shipment.carrier && <p className="font-semibold text-ink">{o.shipment.carrier}</p>}
                {o.shipment.number && (
                  <p className="nums mt-0.5 flex items-center gap-2 font-bold text-ink">
                    {o.shipment.number}
                    <button
                      onClick={() => { navigator.clipboard?.writeText(o.shipment!.number!).catch(() => {}); toast({ text: t("orders.copied") }); }}
                      aria-label={t("orders.copy")}
                      className="inline-flex size-9 items-center justify-center rounded-lg text-muted hover:bg-ink-soft hover:text-ink"
                    >
                      <Copy className="size-3.5" />
                    </button>
                  </p>
                )}
                {o.shipment.url && (
                  <a href={o.shipment.url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex h-9 items-center gap-1.5 rounded-lg bg-ink px-3 text-[13px] font-semibold text-white hover:bg-ink-deep">
                    <ExternalLink className="size-3.5" /> {t("ord.track")}
                  </a>
                )}
                <p className="mt-1 text-xs text-faint">{t("ord.noAutoTracking")}</p>
              </div>
            ) : (
              o.tracking && ["in_transit", "arrived", "delivered", "received"].includes(o.status) && (
                <div>
                  <p className="text-xs font-bold uppercase text-faint">{t("orders.tracking")}</p>
                  <p className="nums mt-0.5 font-bold text-ink">{o.tracking}</p>
                  <p className="text-xs text-faint">{t("orders.trackingDemo")}</p>
                </div>
              )
            )}
            {o.eta && (
              <div>
                <p className="text-xs font-bold uppercase text-faint">{t("orders.etaLabel")}</p>
                <p className="font-semibold text-ink">{date(o.eta, "long")}</p>
              </div>
            )}
            <div>
              <p className="text-xs font-bold uppercase text-faint">{t("orders.delivery")}</p>
              <p className="font-semibold text-ink">{t(`delivery.${o.address.country}.${o.deliveryMethod}`)}</p>
              <p className="mt-1 text-ink">{o.address.recipient}</p>
              {formatAddressLines(o.address.country, o.address.fields).map((l) => (
                <p key={l} className="text-muted">{l}</p>
              ))}
              <p className="nums text-muted">{o.address.phone}</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase text-faint">{t("orders.placedAt")}</p>
              <p className="nums text-ink">{date(o.createdAt, "datetime")}</p>
            </div>
          </Card>
          <Card className="p-5">
            <p className="mb-3 text-xs font-bold uppercase text-faint">{t("orders.seller")}</p>
            <div className="flex items-center gap-3">
              <Avatar name={seller.name} color={seller.avatarColor} size={44} href={`/profile/${seller.username}`} />
              <Link href={`/profile/${seller.username}`} className="min-w-0 flex-1">
                <span className="block truncate font-bold text-ink hover:underline">{seller.name}</span>
                <span className="block truncate text-xs text-muted">{seller.city}</span>
              </Link>
            </div>
            {isBuyer && (
              <ButtonLink href={`/messages/${seller.username}?order=${o.id}`} variant="secondary" className="mt-3 w-full">
                <MessageCircle className="size-4" /> {t("orders.contactSeller")}
              </ButtonLink>
            )}
          </Card>
          {isBuyer && (canCancel(o.status) || canConfirmReceived(o.status)) && (
            <Card className="space-y-2 p-5">
              {canConfirmReceived(o.status) && (
                <Button
                  className="w-full"
                  onClick={() => {
                    actions.confirmReceived(o.id);
                    toast({ text: t("orders.receivedToast") });
                  }}
                >
                  <Check className="size-4" /> {t("ordx.confirmReceived")}
                </Button>
              )}
              {canConfirmReceived(o.status) && <p className="text-xs text-muted">{t("ordx.receivedNote")}</p>}
              {canCancel(o.status) && (
                <Button variant="danger" className="w-full" onClick={() => setCancel(true)}>
                  {t("orders.cancel")}
                </Button>
              )}
            </Card>
          )}
        </aside>
      </div>

      {isSeller && nxt && step && <SellerStepModal order={o} to={nxt} onClose={() => setStep(false)} />}
      <RejectModal open={reject} order={o} onClose={() => setReject(false)} />
      {isSeller && <SellerCancelModal open={sellerCancel} order={o} onClose={() => setSellerCancel(false)} />}
      <PhotoViewer src={viewPhoto} onClose={() => setViewPhoto(null)} />
      <Modal
        open={cancel}
        onClose={() => setCancel(false)}
        title={t("orders.cancelTitle", { number: o.number })}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setCancel(false)}>
              {t("common.keep")}
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                actions.cancelOrder(o.id);
                setCancel(false);
                toast({ text: t("orders.cancelledToast"), tone: "info" });
              }}
            >
              {t("orders.cancel")}
            </Button>
          </>
        }
      >
        <p className="p-5 text-sm text-muted">{t("orders.cancelText")}</p>
      </Modal>
      <Modal
        open={!!review}
        onClose={() => setReview(null)}
        title={t("orders.review")}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setReview(null)}>
              {t("common.cancel")}
            </Button>
            <Button
              disabled={!review || review.text.trim().length < 3}
              onClick={() => {
                if (!review) return;
                actions.addProductReview(o.id, review.productId, review.rating, review.text.trim());
                setReview(null);
                toast({ text: t("learn.reviewThanks") });
                router.refresh();
              }}
            >
              {t("learn.submitReview")}
            </Button>
          </>
        }
      >
        {review && (
          <div className="space-y-3 p-5">
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} onClick={() => setReview((r) => (r ? { ...r, rating: n } : r))} aria-label={`${n}`} className={cn("size-11 rounded-lg text-sm font-bold", n <= review.rating ? "bg-saffron text-ink-deep" : "bg-ink-soft text-muted")}>
                  {n}
                </button>
              ))}
            </div>
            <Textarea rows={4} value={review.text} onChange={(e) => { const text = e.target.value; setReview((r) => (r ? { ...r, text } : r)); }} maxLength={2000} placeholder={t("learn.reviewPlaceholder")} aria-label={t("learn.reviewPlaceholder")} />
          </div>
        )}
      </Modal>
    </div>
  );
}
