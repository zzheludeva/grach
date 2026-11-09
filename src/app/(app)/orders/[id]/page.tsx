"use client";
import { use, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Check, Copy, MessageCircle, PartyPopper, RotateCcw, Star, ExternalLink, Truck, Camera } from "lucide-react";
import { useStore } from "@/lib/store";
import { useI18n } from "@/i18n/I18nProvider";
import { userById } from "@/lib/selectors";
import { canCancel, canConfirmReceived, pendingAck, sellerNext, STATUS_TONE } from "@/lib/orders";
import { OrderTimeline, SellerStepModal, RejectModal, PhotoViewer } from "@/components/orders/OrderFlow";
import { formatAddressLines } from "@/lib/regions";
import { Avatar, Badge, Card, DemoNote, EmptyState, Textarea } from "@/components/ui/primitives";
import { Button, ButtonLink } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { statusLabelKey } from "@/components/common/OrderStatusBadge";
import { cn } from "@/lib/utils";

export default function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const sp = useSearchParams();
  const { state, meId, actions } = useStore();
  const { t, money, date } = useI18n();
  const toast = useToast();
  const router = useRouter();
  const d = state!.data;
  const o = d.orders.find((x) => x.id === id);
  const [cancel, setCancel] = useState(false);
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
  const nxt = isSeller ? sellerNext(o.status) : null;
  const waiting = pendingAck(o);

  return (
    <div className="mx-auto max-w-5xl">
      <Link href="/orders" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink">
        <ArrowLeft className="size-4" /> {t("orders.title")}
      </Link>
      {placed && (
        <div className="mb-5 flex items-start gap-3 rounded-2xl bg-ink p-4 text-white">
          <PartyPopper className="mt-0.5 size-5 shrink-0 text-saffron" />
          <div>
            <p className="font-bold">{t("orders.placedTitle")}</p>
            <p className="text-sm text-white/80">{Number(placed) > 1 ? t("orders.placedMulti", { count: Number(placed) }) : t("orders.placedText")}</p>
          </div>
        </div>
      )}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <h1 className="nums font-display text-3xl text-ink">{t("orders.order", { number: o.number })}</h1>
        <Badge tone={STATUS_TONE[o.status]} className="text-sm">
          {t(statusLabelKey(o.status, o.deliveryMethod))}
        </Badge>
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0 space-y-6">
          {isBuyer && waiting && (
            <Card className="border-saffron/60 bg-saffron-soft/40 p-5">
              <p className="font-bold text-ink">{t("ord.ackTitle", { status: t(`orderStatus.${waiting.status}`) })}</p>
              <p className="mt-1 text-sm text-muted">{t("ord.ackText")}</p>
              {waiting.photo && (
                <button onClick={() => setViewPhoto(waiting.photo!)} className="relative mt-3 block size-28 overflow-hidden rounded-xl border border-line">
                  <Image src={waiting.photo} alt={t("ord.readyPhoto")} fill sizes="112px" unoptimized className="object-cover" />
                </button>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" onClick={() => { actions.ackOrderStep(o.id); toast({ text: t("ord.toast.acked") }); }}>
                  <Check className="size-4" /> {t("ord.ack")}
                </Button>
                <Button size="sm" variant="danger" onClick={() => setReject(true)}>{t("ord.reject")}</Button>
              </div>
            </Card>
          )}
          {isSeller && (
            <Card className="p-5">
              <p className="text-xs font-bold uppercase text-faint">{t("ord.sellerPanel")}</p>
              {nxt ? (
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <Button onClick={() => setStep(true)}>
                    {nxt === "ready" ? <Camera className="size-4" /> : nxt === "handed_over" ? <Truck className="size-4" /> : <Check className="size-4" />} {t(`ord.action.${nxt}`)}
                  </Button>
                  <span className="text-sm text-muted">{t(`ord.hint.${nxt}`)}</span>
                </div>
              ) : (
                <p className="mt-2 text-sm text-muted">{o.status === "cancelled" ? t("ord.closedCancelled") : o.status === "received" ? t("ord.closedReceived") : t("ord.buyerTurn")}</p>
              )}
              {waiting && <p className="mt-3 text-xs font-semibold text-rust">{t("ord.awaitingBuyer")}</p>}
              {buyer && (
                <ButtonLink href={`/messages/${buyer.username}`} variant="ghost" size="sm" className="mt-3">
                  <MessageCircle className="size-4" /> {t("ord.messageBuyer")}
                </ButtonLink>
              )}
            </Card>
          )}
          <Card className="p-5">
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
            {o.readyPhoto && (
              <div>
                <p className="text-xs font-bold uppercase text-faint">{t("ord.readyPhoto")}</p>
                <button onClick={() => setViewPhoto(o.readyPhoto!)} className="relative mt-1 block aspect-square w-full overflow-hidden rounded-xl border border-line" aria-label={t("ord.openPhoto")}>
                  <Image src={o.readyPhoto} alt={t("ord.readyPhoto")} fill sizes="300px" unoptimized className="object-cover" />
                </button>
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
                      className="rounded p-1 text-muted hover:text-ink"
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
              <ButtonLink href={`/messages/${seller.username}`} variant="secondary" className="mt-3 w-full">
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
                  <Check className="size-4" /> {t("orders.received")}
                </Button>
              )}
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
                <button key={n} onClick={() => setReview({ ...review, rating: n })} aria-label={`${n}`} className={cn("size-9 rounded-lg text-sm font-bold", n <= review.rating ? "bg-saffron text-ink-deep" : "bg-ink-soft text-muted")}>
                  {n}
                </button>
              ))}
            </div>
            <Textarea rows={3} value={review.text} onChange={(e) => setReview({ ...review, text: e.target.value })} placeholder={t("learn.reviewPlaceholder")} aria-label={t("learn.reviewPlaceholder")} />
          </div>
        )}
      </Modal>
    </div>
  );
}
