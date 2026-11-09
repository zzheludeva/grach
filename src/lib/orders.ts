import type { Order, OrderStatus } from "./types";

/**
 * Order lifecycle. Seller steps need an explicit action and, for the important ones, proof:
 *   pending → confirmed → preparing → ready (photo of the finished item) → handed_over (tracking number or link)
 * The buyer confirms receipt (→ received). After every seller step the buyer can accept it or
 * reject it with a reason, which returns the order to the previous status.
 * Carrier statuses are never simulated: there is no delivery-service integration.
 * in_transit / arrived / delivered remain only for older orders.
 */
export const ORDER_FLOW: OrderStatus[] = ["pending", "confirmed", "preparing", "ready", "handed_over", "received"];
export const LEGACY_SHIPPED: OrderStatus[] = ["in_transit", "arrived", "delivered"];

export const ACTIVE_STATUSES: OrderStatus[] = ["pending", "confirmed", "preparing", "ready", "handed_over", "in_transit", "arrived"];
export const DONE_STATUSES: OrderStatus[] = ["delivered", "received"];

export type OrderBucket = "active" | "done" | "cancelled";

export function bucketOf(s: OrderStatus): OrderBucket {
  if (s === "cancelled") return "cancelled";
  if (DONE_STATUSES.includes(s)) return "done";
  return "active";
}

const SELLER_NEXT: Partial<Record<OrderStatus, OrderStatus>> = { pending: "confirmed", confirmed: "preparing", preparing: "ready", ready: "handed_over" };

/** The only status the seller may move to next (null when it's the buyer's turn or the order is closed). */
export function sellerNext(s: OrderStatus): OrderStatus | null {
  return SELLER_NEXT[s] ?? null;
}

export function canCancel(s: OrderStatus) {
  return s === "pending" || s === "confirmed";
}

export function canConfirmReceived(s: OrderStatus) {
  return s === "handed_over" || LEGACY_SHIPPED.includes(s);
}

export interface TransitionProof {
  comment?: string;
  photo?: string;
  carrier?: string;
  trackingNumber?: string;
  trackingUrl?: string;
}

export type TransitionError = "forbidden" | "closed" | "notAllowed" | "photoRequired" | "shipmentRequired" | "carrierRequired" | "invalidUrl";

/** Same rules as the server function `order_transition` in the Supabase migration. */
export function validateTransition(o: Order, actorId: string, to: OrderStatus, proof: TransitionProof): TransitionError | null {
  if (o.sellerId !== actorId) return "forbidden";
  if (o.status === "cancelled" || o.status === "received") return "closed";
  if (sellerNext(o.status) !== to) return "notAllowed";
  if (to === "ready" && !proof.photo) return "photoRequired";
  if (to === "handed_over") {
    const num = proof.trackingNumber?.trim();
    const url = proof.trackingUrl?.trim();
    if (!num && !url) return "shipmentRequired";
    if (num && !proof.carrier?.trim()) return "carrierRequired";
    if (url && !/^https?:\/\/\S+\.\S+/.test(url)) return "invalidUrl";
  }
  return null;
}

/** The latest seller step still waiting for the buyer's answer, if any. */
export function pendingAck(o: Order) {
  const last = o.history[o.history.length - 1];
  return last && last.ack === "pending" ? last : null;
}

export const STATUS_TONE: Record<OrderStatus, "neutral" | "info" | "warn" | "success" | "danger"> = {
  pending: "warn",
  confirmed: "info",
  preparing: "info",
  ready: "info",
  handed_over: "info",
  in_transit: "info",
  arrived: "info",
  delivered: "success",
  received: "success",
  cancelled: "danger",
};
