"use client";
import { useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { Package, Search, Store } from "lucide-react";
import { useQueryState } from "@/lib/nav-history";
import { nextStep } from "@/lib/orders";
import { useStore } from "@/lib/store";
import { useI18n } from "@/i18n/I18nProvider";
import { userById } from "@/lib/selectors";
import { bucketOf, ACTIVE_STATUSES, DONE_STATUSES, STATUS_TONE, type OrderBucket } from "@/lib/orders";
import { Badge, Card, EmptyState, Input, PageHeader, Select, Tabs } from "@/components/ui/primitives";
import { ButtonLink } from "@/components/ui/button";
import { orderLabelKey, statusLabelKey } from "@/components/common/OrderStatusBadge";
import type { OrderStatus } from "@/lib/types";
import { norm } from "@/lib/utils";

export default function Orders() {
  const { state, meId } = useStore();
  const { t, money, date } = useI18n();
  const d = state!.data;
  // Role, tab, status and query live in the URL, so "back" from an order returns to the same list.
  const [role, setRole] = useQueryState<"buyer" | "seller">("role", "buyer", ["buyer", "seller"]);
  const [bucket, setBucket] = useQueryState<OrderBucket>("tab", "active", ["active", "done", "cancelled"]);
  const [status, setStatus] = useQueryState<OrderStatus | "">("status", "");
  const [q, setQ] = useQueryState<string>("q", "");
  const sells = d.orders.some((o) => o.sellerId === meId);
  const mine = d.orders.filter((o) => (role === "seller" ? o.sellerId === meId : o.buyerId === meId)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const counts = { active: 0, done: 0, cancelled: 0 } as Record<OrderBucket, number>;
  mine.forEach((o) => counts[bucketOf(o.status)]++);
  const statusOptions = bucket === "active" ? ACTIVE_STATUSES : bucket === "done" ? DONE_STATUSES : [];

  const list = useMemo(
    () =>
      mine.filter(
        (o) =>
          bucketOf(o.status) === bucket &&
          (!status || o.status === status) &&
          (!q || norm(`${o.number} ${o.items.map((i) => i.title).join(" ")}`).includes(norm(q))),
      ),
    [mine, bucket, status, q],
  );

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title={role === "seller" ? t("nav2.sales") : t("orders.title")} />
      {(sells || role === "seller") && (
        <Tabs
          value={role}
          onChange={(r) => {
            setRole(r);
            setBucket("active");
            setStatus("");
          }}
          items={[
            { value: "buyer", label: t("nav2.purchases") },
            { value: "seller", label: t("nav2.sales"), count: d.orders.filter((o) => o.sellerId === meId && nextStep(o).who === "seller").length || undefined },
          ]}
          className="mb-3 w-full sm:w-fit"
        />
      )}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <Tabs
          value={bucket}
          onChange={(b) => {
            setBucket(b);
            setStatus("");
          }}
          items={[
            { value: "active", label: t("orders.active"), count: counts.active },
            { value: "done", label: t("orders.done"), count: counts.done },
            { value: "cancelled", label: t("orders.cancelled"), count: counts.cancelled },
          ]}
        />
        <div className="flex min-w-0 flex-1 basis-72 flex-wrap gap-2 sm:flex-nowrap">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-faint" />
            <Input type="search" enterKeyHint="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("orders.search")} aria-label={t("orders.search")} className="ps-10" />
          </div>
          {statusOptions.length > 0 && (
            <Select value={status} onChange={(e) => setStatus(e.target.value as OrderStatus)} aria-label={t("orders.status")} className="w-full shrink-0 sm:w-44">
              <option value="">{t("orders.anyStatus")}</option>
              {statusOptions.map((s) => (
                <option key={s} value={s}>
                  {t(statusLabelKey(s))}
                </option>
              ))}
            </Select>
          )}
        </div>
      </div>
      {list.length === 0 ? (
        mine.length === 0 ? (
          role === "seller" ? (
            <EmptyState icon={<Store className="size-6" />} title={t("nav2.noSales")} action={<ButtonLink href="/dashboard/products/new">{t("sell.mine.add")}</ButtonLink>} />
          ) : (
            <EmptyState icon={<Package className="size-6" />} title={t("orders.empty")} text={t("orders.emptyText")} action={<ButtonLink href="/market">{t("cart.toMarket")}</ButtonLink>} />
          )
        ) : (
          <EmptyState title={q || status ? t("search.nothing") : t(`orders.emptyBucket.${bucket}`)} />
        )
      ) : (
        <div className="space-y-3">
          {list.map((o) => {
            const seller = userById(d, role === "seller" ? o.buyerId : o.sellerId);
            const ns = nextStep(o);
            const myTurn = ns.who === role;
            return (
              <Link key={o.id} href={`/orders/${o.id}`} className="block">
                <Card className="p-4 transition-colors hover:border-ink/30">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="nums font-bold text-ink">{o.number}</span>
                      <span className="text-xs text-faint">{t("orders.from", { date: date(o.createdAt, "long") })}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {myTurn && <Badge tone="warn">{t("nav2.yourTurn")}</Badge>}
                      <Badge tone={STATUS_TONE[o.status]}>{t(orderLabelKey(o))}</Badge>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-3">
                    <div className="flex -space-x-3">
                      {o.items.slice(0, 3).map((i) => (
                        <Image key={i.productId} src={i.image} alt="" width={56} height={56} className="size-14 rounded-xl border-2 border-white object-cover" />
                      ))}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-ink">
                        {o.items.map((i) => `${i.title}${i.qty > 1 ? ` ×${i.qty}` : ""}`).join(", ")}
                      </p>
                      <p className="truncate text-xs text-muted">
                        {role === "seller" ? t("nav2.buyer", { name: seller?.name ?? "" }) : seller?.name} · {t(`delivery.${o.address.country}.${o.deliveryMethod}`)}
                      </p>
                      {o.eta && bucketOf(o.status) === "active" && <p className="text-xs font-semibold text-teal">{t("orders.eta", { date: date(o.eta, "long") })}</p>}
                    </div>
                    <span className="nums shrink-0 font-bold text-ink">{money(o.total)}</span>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
