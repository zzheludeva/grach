import type { OrderStatus } from "./types";

export const ORDER_FLOW: OrderStatus[] = ["pending", "confirmed", "preparing", "handed_over", "in_transit", "arrived", "delivered", "received"];

export const ACTIVE_STATUSES: OrderStatus[] = ["pending", "confirmed", "preparing", "handed_over", "in_transit", "arrived"];
export const DONE_STATUSES: OrderStatus[] = ["delivered", "received"];

export type OrderBucket = "active" | "done" | "cancelled";

export function bucketOf(s: OrderStatus): OrderBucket {
  if (s === "cancelled") return "cancelled";
  if (DONE_STATUSES.includes(s)) return "done";
  return "active";
}

export function nextStatus(s: OrderStatus): OrderStatus | null {
  if (s === "cancelled" || s === "received") return null;
  const i = ORDER_FLOW.indexOf(s);
  return ORDER_FLOW[i + 1] ?? null;
}

export function canCancel(s: OrderStatus) {
  return s === "pending" || s === "confirmed";
}

export function canConfirmReceived(s: OrderStatus) {
  return s === "arrived" || s === "delivered";
}

export const STATUS_TONE: Record<OrderStatus, "neutral" | "info" | "warn" | "success" | "danger"> = {
  pending: "warn",
  confirmed: "info",
  preparing: "info",
  handed_over: "info",
  in_transit: "info",
  arrived: "info",
  delivered: "success",
  received: "success",
  cancelled: "danger",
};
