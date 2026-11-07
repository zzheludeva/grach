"use client";
import { Badge } from "@/components/ui/primitives";
import { useI18n } from "@/i18n/I18nProvider";
import { STATUS_TONE } from "@/lib/orders";
import type { OrderStatus } from "@/lib/types";

export function OrderStatusBadge({ status, country }: { status: OrderStatus; country?: string }) {
  const { t } = useI18n();
  const key = status === "arrived" ? `orderStatus.arrived_${country === "BR" ? "courier" : "pickup"}` : `orderStatus.${status}`;
  return <Badge tone={STATUS_TONE[status]}>{t(key)}</Badge>;
}

export function statusLabelKey(status: OrderStatus, deliveryMethod?: string) {
  if (status === "arrived") return deliveryMethod === "pickup" || deliveryMethod === "post" ? "orderStatus.arrived_pickup" : "orderStatus.arrived_courier";
  return `orderStatus.${status}`;
}
