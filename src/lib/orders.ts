import type { Order, OrderEvent, OrderStatus } from "./types";

/**
 * Order lifecycle. Only two steps need the buyer's confirmation:
 *   1. readiness: the seller sends photos of the finished item ("ready"); the buyer confirms or rejects it.
 *      Until the buyer confirms, the seller cannot ship. A rejection returns the order to "preparing".
 *   2. receipt: after shipping ("handed_over", tracking number or link) the buyer confirms receipt → "received" (completed).
 * Other seller steps (confirm, start preparing) need no buyer answer.
 * There is no automatic confirmation of receipt and no simulated carrier statuses.
 * in_transit / arrived / delivered remain only for older orders.
 * Same rules as the Supabase functions in supabase/migrations/20261116_iteration4.sql.
 */
export const ORDER_FLOW: OrderStatus[] = ["pending", "confirmed", "preparing", "ready", "handed_over", "received"];
export const LEGACY_SHIPPED: OrderStatus[] = ["in_transit", "arrived", "delivered"];

export const ACTIVE_STATUSES: OrderStatus[] = ["pending", "confirmed", "preparing", "ready", "handed_over", "in_transit", "arrived"];
export const DONE_STATUSES: OrderStatus[] = ["delivered", "received"];

/** Days without an answer to the readiness request after which both sides see the "no response" state. */
export const READY_NO_RESPONSE_DAYS = 3;
/** Minimum pause between seller reminders about the readiness request. */
export const READY_REMIND_COOLDOWN_H = 24;
export const MAX_READY_PHOTOS = 4;

export type OrderBucket = "active" | "done" | "cancelled";

export function bucketOf(s: OrderStatus): OrderBucket {
  if (s === "cancelled") return "cancelled";
  if (DONE_STATUSES.includes(s)) return "done";
  return "active";
}

/** Readiness confirmation state: only meaningful while the order is "ready". */
export type ReadyState = "none" | "pending" | "confirmed";
export function readyState(o: Order): ReadyState {
  if (o.status !== "ready") return "none";
  return o.readyConfirmedAt ? "confirmed" : "pending";
}

const SELLER_NEXT: Partial<Record<OrderStatus, OrderStatus>> = { pending: "confirmed", confirmed: "preparing", preparing: "ready", ready: "handed_over" };

/** The only status the seller may move to next (null when it's the buyer's turn or the order is closed). */
export function sellerNext(o: Order): OrderStatus | null {
  if (readyState(o) === "pending") return null;
  return SELLER_NEXT[o.status] ?? null;
}

/** Buyer cancels before production starts. */
export function canCancel(s: OrderStatus) {
  return s === "pending" || s === "confirmed";
}
/** Seller cancels (with a reason) any time before shipping — e.g. the item can't be made or the buyer doesn't answer. */
export function canSellerCancel(s: OrderStatus) {
  return s === "pending" || s === "confirmed" || s === "preparing" || s === "ready";
}

export function canConfirmReceived(s: OrderStatus) {
  return s === "handed_over" || LEGACY_SHIPPED.includes(s);
}

const HOUR = 3600_000;
export function readyWaitingDays(o: Order, now = Date.now()) {
  if (readyState(o) !== "pending" || !o.readyRequestedAt) return 0;
  return Math.floor((now - new Date(o.readyRequestedAt).getTime()) / (24 * HOUR));
}
export function canRemindReady(o: Order, now = Date.now()) {
  if (readyState(o) !== "pending" || !o.readyRequestedAt) return false;
  const last = new Date(o.readyRemindedAt ?? o.readyRequestedAt).getTime();
  return now - last >= READY_REMIND_COOLDOWN_H * HOUR;
}

export interface TransitionProof {
  comment?: string;
  photos?: string[];
  carrier?: string;
  trackingNumber?: string;
  trackingUrl?: string;
}

export type TransitionError =
  | "forbidden"
  | "closed"
  | "notAllowed"
  | "photoRequired"
  | "tooManyPhotos"
  | "readyNotConfirmed"
  | "shipmentRequired"
  | "carrierRequired"
  | "invalidUrl";

export function validateTransition(o: Order, actorId: string, to: OrderStatus, proof: TransitionProof): TransitionError | null {
  if (o.sellerId !== actorId) return "forbidden";
  if (o.status === "cancelled" || o.status === "received" || o.status === "delivered") return "closed";
  if (to === "handed_over" && o.status === "ready" && !o.readyConfirmedAt) return "readyNotConfirmed";
  if (sellerNext(o) !== to) return "notAllowed";
  if (to === "ready") {
    const n = proof.photos?.filter(Boolean).length ?? 0;
    if (!n) return "photoRequired";
    if (n > MAX_READY_PHOTOS) return "tooManyPhotos";
  }
  if (to === "handed_over") {
    const num = proof.trackingNumber?.trim();
    const url = proof.trackingUrl?.trim();
    if (!num && !url) return "shipmentRequired";
    if (num && !proof.carrier?.trim()) return "carrierRequired";
    if (url && !/^https?:\/\/\S+\.\S+/.test(url)) return "invalidUrl";
  }
  return null;
}

/** The readiness request the buyer still has to answer, if any. */
export function pendingReady(o: Order): OrderEvent | null {
  if (readyState(o) !== "pending") return null;
  for (let i = o.history.length - 1; i >= 0; i--) {
    const h = o.history[i];
    if (h.status === "ready" && !h.kind && h.from) return h;
  }
  return null;
}

/** Who acts next and what is expected — shown to both sides. */
export type NextStep =
  | { who: "seller"; key: "confirm" | "start" | "requestReady" | "fixReady" | "ship" }
  | { who: "buyer"; key: "confirmReady" | "confirmReceived" }
  | { who: "none"; key: "done" | "cancelled" };

export function nextStep(o: Order): NextStep {
  if (o.status === "cancelled") return { who: "none", key: "cancelled" };
  if (o.status === "received" || o.status === "delivered") return { who: "none", key: "done" };
  if (o.status === "pending") return { who: "seller", key: "confirm" };
  if (o.status === "confirmed") return { who: "seller", key: "start" };
  if (o.status === "preparing") return { who: "seller", key: o.readyRejection ? "fixReady" : "requestReady" };
  if (o.status === "ready") return o.readyConfirmedAt ? { who: "seller", key: "ship" } : { who: "buyer", key: "confirmReady" };
  return { who: "buyer", key: "confirmReceived" };
}

export const STATUS_TONE: Record<OrderStatus, "neutral" | "info" | "warn" | "success" | "danger"> = {
  pending: "warn",
  confirmed: "info",
  preparing: "info",
  ready: "warn",
  handed_over: "info",
  in_transit: "info",
  arrived: "info",
  delivered: "success",
  received: "success",
  cancelled: "danger",
};
