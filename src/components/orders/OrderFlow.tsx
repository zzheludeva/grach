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
        return (
          <li key={`${h.status}-${h.at}-${i}`} className="relative flex gap-4 pb-5 last:pb-0">
            {i < list.length - 1 && <span className="absolute start-[11px] top-6 h-[calc(100%-16px)] w-0.5 bg-line" />}
            <span
              className={cn(
                "relative z-10 mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border-2",
                h.status === "cancelled" ? "border-rose bg-rose text-white" : h.revert ? "border-saffron bg-saffron text-ink-deep" : current ? "border-ink bg-ink text-saffron" : "border-teal bg-teal text-white",
              )}
            >
              {h.revert ? <CornerUpLeft className="size-3.5" /> : h.status === "cancelled" ? <X className="size-3.5" /> : <Check className="size-3.5" />}
            </span>
            <div className="min-w-0 flex-1 text-sm">
              <p className="font-semibold text-ink">
                {h.from && <span className="font-normal text-muted">{t(statusLabelKey(h.from, order.deliveryMethod))} → </span>}
                {t(statusLabelKey(h.status, order.deliveryMethod))}
                {current && <span className="ms-2 text-xs font-bold text-rust">{t("orders.current")}</span>}
              </p>
              <p className="nums text-xs text-muted">
                {date(h.at, "datetime")} · {actor ? `${actor.id === meId ? t("ord.you") : actor.name} (${role})` : role}
              </p>
              {h.revert && <p className="mt-1 text-xs font-semibold text-rust">{t("ord.reverted")}</p>}
              {h.comment && <p className="mt-1 whitespace-pre-line rounded-lg bg-bg px-2.5 py-1.5 text-text/85">{h.comment}</p>}
              {h.photo && (
                <button onClick={() => onPhoto(h.photo!)} className="relative mt-2 block size-20 overflow-hidden rounded-lg border border-line" aria-label={t("ord.openPhoto")}>
                  <Image src={h.photo} alt="" fill sizes="80px" unoptimized className="object-cover" />
                </button>
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
              {h.ack && (
                <Badge tone={h.ack === "confirmed" ? "success" : h.ack === "rejected" ? "danger" : "warn"} className="mt-1.5">
                  {t(`ord.ackState.${h.ack}`)}
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
  const [photo, setPhoto] = useState<string[]>([]);
  const [comment, setComment] = useState("");
  const [carrier, setCarrier] = useState("");
  const [number, setNumber] = useState("");
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    const res = actions.transitionOrder(
      order.id,
      to,
      { comment, photo: photo[0], carrier, trackingNumber: number, trackingUrl: url },
      to === "ready" ? t("ord.photoMessage", { number: order.number }) : "",
    );
    if ("error" in res) return setError(t(`ord.err.${res.error}`));
    toast({ text: t("ord.toast.moved", { status: t(`orderStatus.${to}`) }) });
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={t(`ord.action.${to}`)}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>{t("common.cancel")}</Button>
          <Button onClick={submit}>{t("ord.confirmStep")}</Button>
        </>
      }
    >
      <div className="space-y-4 p-5">
        <p className="text-sm text-muted">{t(`ord.hint.${to}`)}</p>
        {to === "ready" && (
          <div>
            <p className="mb-1.5 text-[13px] font-semibold text-ink">{t("ord.readyPhoto")} *</p>
            <div className="max-w-xs">
              <PhotoPicker single value={photo} onChange={(v) => { setPhoto(v); setError(null); }} invalid={!!error && !photo.length} onError={(m) => setError(m)} />
            </div>
            <p className="mt-1 text-xs text-muted">{t("ord.photoSentNote")}</p>
          </div>
        )}
        {to === "handed_over" && (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={t("ord.carrier")}>{(id) => <Input id={id} value={carrier} onChange={(e) => setCarrier(e.target.value)} placeholder={t("ord.carrierPh")} maxLength={80} />}</Field>
              <Field label={t("ord.trackingNumber")}>{(id) => <Input id={id} value={number} onChange={(e) => setNumber(e.target.value)} maxLength={60} />}</Field>
            </div>
            <p className="text-center text-xs font-bold uppercase text-faint">{t("ord.or")}</p>
            <Field label={t("ord.trackingUrl")}>{(id) => <Input id={id} type="url" placeholder="https://" value={url} onChange={(e) => setUrl(e.target.value)} maxLength={400} />}</Field>
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

/** Buyer rejects the latest step: a reason is required; the order returns to the previous status. */
export function RejectModal({ open, order, onClose }: { open: boolean; order: Order; onClose: () => void }) {
  const { t } = useI18n();
  const { actions } = useStore();
  const toast = useToast();
  const [reason, setReason] = useState("");
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("ord.reject")}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>{t("common.cancel")}</Button>
          <Button
            variant="danger"
            disabled={reason.trim().length < 3}
            onClick={() => {
              if (actions.rejectOrderStep(order.id, reason)) toast({ text: t("ord.toast.rejected"), tone: "info" });
              setReason("");
              onClose();
            }}
          >
            {t("ord.reject")}
          </Button>
        </>
      }
    >
      <div className="space-y-2 p-5">
        <p className="text-sm text-muted">{t("ord.rejectText")}</p>
        <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t("ord.reasonPh")} aria-label={t("ord.reason")} maxLength={600} />
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
