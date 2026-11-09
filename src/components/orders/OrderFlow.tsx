"use client";
import { useState } from "react";
import Image from "next/image";
import { Check, CornerUpLeft, ExternalLink, X } from "lucide-react";
import { useStore } from "@/lib/store";
import { useI18n } from "@/i18n/I18nProvider";
import { userById } from "@/lib/selectors";
import type { Order, OrderStatus } from "@/lib/types";
import { Badge, DemoNote, Field, Input, Textarea } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { PhotoPicker } from "@/components/seller/PhotoPicker";
import { statusLabelKey } from "@/components/common/OrderStatusBadge";
import { cn } from "@/lib/utils";
import { MAX_READY_PHOTOS } from "@/lib/orders";

/** Status history with who did what, attached proof and the buyer's response. */
export function OrderTimeline({ order, onPhoto }: { order: Order; onPhoto: (src: string) => void }) {
  const { state, meId } = useStore();
  const { t, date } = useI18n();
  const d = state!.data;
  const list = [...order.history].reverse();
  return (
    <ol className="relative">
      {list.map((h, i) => {
        const actor = h.by ? userById(d, h.by) : undefined;
        const role = h.by ? (h.by === order.sellerId ? t("ord.roleSeller") : t("ord.roleBuyer")) : t("ord.roleSystem");
        const current = i === 0;
        const isStatus = !h.kind;
        return (
          <li key={`${h.status}-${h.at}-${i}`} className="relative flex gap-4 pb-5 last:pb-0">
            {i < list.length - 1 && <span className="absolute start-[11px] top-6 h-[calc(100%-16px)] w-0.5 bg-line" />}
            <span
              className={cn(
                "relative z-10 mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border-2",
                h.status === "cancelled" ? "border-rose bg-rose text-white" : h.revert ? "border-saffron bg-saffron text-ink-deep" : h.kind === "readyReminder" ? "border-line bg-surface text-muted" : current ? "border-ink bg-ink text-saffron" : "border-teal bg-teal text-white",
              )}
            >
              {h.revert ? <CornerUpLeft className="size-3.5" /> : h.status === "cancelled" ? <X className="size-3.5" /> : <Check className="size-3.5" />}
            </span>
            <div className="min-w-0 flex-1 text-sm">
              <p className="font-semibold text-ink">
                {h.kind ? (
                  t(`ordx.kind.${h.kind}`)
                ) : (
                  <>
                    {h.from && <span className="font-normal text-muted">{t(statusLabelKey(h.from, order.deliveryMethod))} → </span>}
                    {h.status === "ready" ? t("ordx.readyRequest") : t(statusLabelKey(h.status, order.deliveryMethod))}
                  </>
                )}
                {current && isStatus && <span className="ms-2 text-xs font-bold text-rust">{t("orders.current")}</span>}
              </p>
              <p className="nums text-xs text-muted">
                {date(h.at, "datetime")} · {actor ? `${actor.id === meId ? t("ord.you") : actor.name} (${role})` : role}
              </p>
              {h.revert && <p className="mt-1 text-xs font-semibold text-rust">{t("ordx.reverted")}</p>}
              {h.comment && <p className="mt-1 whitespace-pre-line rounded-lg bg-bg px-2.5 py-1.5 text-text/85">{h.comment}</p>}
              {(h.photos ?? (h.photo ? [h.photo] : [])).length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {(h.photos ?? [h.photo!]).map((src, k) => (
                    <button key={k} onClick={() => onPhoto(src)} className="relative block size-20 overflow-hidden rounded-lg border border-line" aria-label={t("ord.openPhoto")}>
                      <Image src={src} alt="" fill sizes="80px" unoptimized className="object-cover" />
                    </button>
                  ))}
                </div>
              )}
              {(h.trackingNumber || h.trackingUrl) && (
                <p className="mt-1 text-xs text-ink">
                  {h.carrier && <b>{h.carrier}: </b>}
                  {h.trackingNumber && <span className="nums">{h.trackingNumber}</span>}
                  {h.trackingUrl && (
                    <a href={h.trackingUrl} target="_blank" rel="noopener noreferrer" className="ms-2 inline-flex items-center gap-1 font-semibold text-teal hover:underline">
                      <ExternalLink className="size-3" /> {t("ord.track")}
                    </a>
                  )}
                </p>
              )}
              {h.ack && h.status === "ready" && !h.kind && (
                <Badge tone={h.ack === "confirmed" ? "success" : h.ack === "rejected" ? "danger" : "warn"} className="mt-1.5">
                  {t(`ordx.ackState.${h.ack}`)}
                </Badge>
              )}
              {h.ack === "rejected" && h.rejectReason && <p className="mt-1 text-xs text-muted">{t("ord.reason")}: {h.rejectReason}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/** Seller's step with mandatory proof: photo for "ready", tracking number or link for "handed_over". */
export function SellerStepModal({ order, to, onClose }: { order: Order; to: OrderStatus; onClose: () => void }) {
  const { t } = useI18n();
  const { actions } = useStore();
  const toast = useToast();
  const [photos, setPhotos] = useState<string[]>([]);
  const [comment, setComment] = useState("");
  const [carrier, setCarrier] = useState("");
  const [number, setNumber] = useState("");
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    const res = actions.transitionOrder(
      order.id,
      to,
      { comment, photos, carrier, trackingNumber: number, trackingUrl: url },
      to === "ready" ? t("ordx.photoMessage", { number: order.number }) : "",
    );
    if ("error" in res) return setError(t(res.error === "readyNotConfirmed" || res.error === "tooManyPhotos" ? `ordx.err.${res.error}` : `ord.err.${res.error}`));
    toast({ text: to === "ready" ? t("ordx.toast.requested") : t("ord.toast.moved", { status: t(`orderStatus.${to}`) }) });
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={to === "ready" ? t("ordx.action.ready") : t(`ord.action.${to}`)}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>{t("common.cancel")}</Button>
          <Button onClick={submit}>{to === "ready" ? t("ordx.sendRequest") : t("ord.confirmStep")}</Button>
        </>
      }
    >
      <div className="space-y-4 p-5">
        <p className="text-sm text-muted">{to === "ready" ? t("ordx.hint.ready") : t(`ord.hint.${to}`)}</p>
        {to === "ready" && order.readyRejection && (
          <p className="rounded-xl bg-rose-soft px-3 py-2 text-sm text-rose-deep">
            <b>{t("ordx.lastRejection")}:</b> {order.readyRejection.reason}
          </p>
        )}
        {to === "ready" && (
          <div>
            <p className="mb-1.5 text-[13px] font-semibold text-ink">{t("ordx.readyPhotos")} *</p>
            <PhotoPicker max={MAX_READY_PHOTOS} value={photos} onChange={(v) => { setPhotos(v); setError(null); }} invalid={!!error && !photos.length} onError={(m) => setError(m)} />
            <p className="mt-1 text-xs text-muted">{t("ordx.photoSentNote", { max: MAX_READY_PHOTOS })}</p>
          </div>
        )}
        {to === "handed_over" && (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={t("ord.carrier")}>{(id) => <Input id={id} value={carrier} onChange={(e) => setCarrier(e.target.value)} placeholder={t("ord.carrierPh")} maxLength={80} />}</Field>
              <Field label={t("ord.trackingNumber")}>{(id) => <Input id={id} value={number} onChange={(e) => setNumber(e.target.value)} maxLength={60} autoCapitalize="characters" autoCorrect="off" spellCheck={false} />}</Field>
            </div>
            <p className="text-center text-xs font-bold uppercase text-faint">{t("ord.or")}</p>
            <Field label={t("ord.trackingUrl")}>{(id) => <Input id={id} type="url" inputMode="url" autoCapitalize="off" placeholder="https://" value={url} onChange={(e) => setUrl(e.target.value)} maxLength={400} />}</Field>
            <DemoNote>{t("ord.noAutoTracking")}</DemoNote>
          </>
        )}
        <Field label={`${t("ord.comment")} (${t("common.optional")})`}>
          {(id) => <Textarea id={id} rows={2} value={comment} onChange={(e) => setComment(e.target.value)} maxLength={1000} />}
        </Field>
        {error && <p role="alert" className="text-sm font-semibold text-rose-deep">{error}</p>}
      </div>
    </Modal>
  );
}

/** Buyer rejects readiness: a comment is required; the order goes back to the seller to fix the remarks. */
export function RejectModal({ open, order, onClose }: { open: boolean; order: Order; onClose: () => void }) {
  const { t } = useI18n();
  const { actions } = useStore();
  const toast = useToast();
  const [reason, setReason] = useState("");
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("ordx.rejectReady")}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>{t("common.cancel")}</Button>
          <Button
            variant="danger"
            disabled={reason.trim().length < 3}
            onClick={() => {
              if (actions.rejectReady(order.id, reason)) toast({ text: t("ordx.toast.rejected"), tone: "info" });
              setReason("");
              onClose();
            }}
          >
            {t("ordx.rejectReady")}
          </Button>
        </>
      }
    >
      <div className="space-y-2 p-5">
        <p className="text-sm text-muted">{t("ordx.rejectText")}</p>
        <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t("ordx.reasonPh")} aria-label={t("ord.reason")} maxLength={600} />
      </div>
    </Modal>
  );
}

export function PhotoViewer({ src, onClose }: { src: string | null; onClose: () => void }) {
  const { t } = useI18n();
  return (
    <Modal open={!!src} onClose={onClose} title={t("ord.readyPhoto")} size="lg">
      {src && (
        <div className="relative aspect-square w-full bg-ink-deep">
          <Image src={src} alt={t("ord.readyPhoto")} fill sizes="700px" unoptimized className="object-contain" />
        </div>
      )}
    </Modal>
  );
}

/** Seller cancels before shipping (e.g. the buyer doesn't answer or the item can't be made); a reason is required. */
export function SellerCancelModal({ open, order, onClose }: { open: boolean; order: Order; onClose: () => void }) {
  const { t } = useI18n();
  const { actions } = useStore();
  const toast = useToast();
  const [reason, setReason] = useState("");
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("orders.cancelTitle", { number: order.number })}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>{t("common.keep")}</Button>
          <Button
            variant="danger"
            disabled={reason.trim().length < 3}
            onClick={() => {
              if (actions.cancelOrder(order.id, reason)) toast({ text: t("orders.cancelledToast"), tone: "info" });
              setReason("");
              onClose();
            }}
          >
            {t("orders.cancel")}
          </Button>
        </>
      }
    >
      <div className="space-y-2 p-5">
        <p className="text-sm text-muted">{t("ordx.sellerCancelText")}</p>
        <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t("ordx.cancelReasonPh")} aria-label={t("ord.reason")} maxLength={600} />
      </div>
    </Modal>
  );
}
