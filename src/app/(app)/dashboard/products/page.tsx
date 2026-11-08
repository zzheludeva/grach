"use client";
import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Bookmark, Eye, EyeOff, Pencil, Plus, Store, Trash, ExternalLink } from "lucide-react";
import { useStore } from "@/lib/store";
import { useI18n } from "@/i18n/I18nProvider";
import { Badge, Card, DemoNote, EmptyState, PageHeader, Tabs } from "@/components/ui/primitives";
import { Button, ButtonLink } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { Price } from "@/components/common/cards";
import type { Product } from "@/lib/types";

type Tab = "all" | Product["status"];

export default function MyProducts() {
  const { state, meId, actions } = useStore();
  const { t, num, relative } = useI18n();
  const toast = useToast();
  const router = useRouter();
  const sp = useSearchParams();
  const d = state!.data;
  const tab = (sp.get("tab") as Tab) || "all";
  const [del, setDel] = useState<Product | null>(null);
  const mine = useMemo(() => d.products.filter((p) => p.sellerId === meId).sort((a, b) => (b.updatedAt ?? b.createdAt).localeCompare(a.updatedAt ?? a.createdAt)), [d.products, meId]);
  const saves = (id: string) => d.favorites.filter((f) => f.type === "product" && f.id === id).length;
  const list = tab === "all" ? mine : mine.filter((p) => p.status === tab);
  const count = (s: Tab) => (s === "all" ? mine.length : mine.filter((p) => p.status === s).length);
  const setTab = (v: Tab) => router.replace(v === "all" ? "/dashboard/products" : `/dashboard/products?tab=${v}`);

  return (
    <div>
      <PageHeader title={t("sell.mine.title")} subtitle={t("sell.mine.subtitle")} actions={<ButtonLink href="/dashboard/products/new"><Plus className="size-4" /> {t("sell.mine.add")}</ButtonLink>} />
      <Tabs
        className="mb-4"
        value={tab}
        onChange={setTab}
        items={(["all", "published", "draft", "hidden"] as Tab[]).map((v) => ({ value: v, label: t(`sell.mine.tab.${v}`), count: count(v) }))}
      />
      {list.length === 0 ? (
        <EmptyState icon={<Store className="size-6" />} title={t("sell.mine.empty")} text={t("sell.mine.emptyText")} action={<ButtonLink href="/dashboard/products/new">{t("sell.mine.add")}</ButtonLink>} />
      ) : (
        <>
          <ul className="space-y-3">
            {list.map((p) => (
              <li key={p.id}>
                <Card className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
                  <Link href={`/market/${p.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                    <span className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-line/50">
                      {p.images[0] && <Image src={p.images[0]} alt="" fill sizes="64px" unoptimized={p.images[0].startsWith("data:")} className="object-cover" />}
                    </span>
                    <span className="min-w-0">
                      <span className="flex flex-wrap items-center gap-1.5">
                        <Badge tone={p.status === "published" ? "success" : p.status === "hidden" ? "dark" : "warn"}>{t(`sell.status.${p.status}`)}</Badge>
                        <Badge>{t(`sell.saleType.${p.saleType}`)}</Badge>
                      </span>
                      <span className="mt-1 block truncate font-bold text-ink">{p.title || "—"}</span>
                      <span className="flex flex-wrap items-center gap-x-3 text-xs text-muted">
                        <Price value={p.price} className="font-semibold text-ink" />
                        <span>{p.saleType === "ready" ? t("sell.mine.stock", { count: p.stock }) : t("sell.mine.madeToOrder", { count: p.makeDays ?? 0 })}</span>
                        <span>{relative(p.updatedAt ?? p.createdAt)}</span>
                      </span>
                    </span>
                  </Link>
                  <div className="flex shrink-0 items-center gap-4 text-sm sm:px-2">
                    <span className="nums inline-flex items-center gap-1 text-muted" title={t("sell.mine.views")}>
                      <Eye className="size-4" /> {num(p.views)}
                    </span>
                    <span className="nums inline-flex items-center gap-1 text-muted" title={t("sell.mine.saves")}>
                      <Bookmark className="size-4" /> {num(saves(p.id))}
                    </span>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-1.5">
                    <ButtonLink href={`/dashboard/products/${p.id}`} size="sm" variant="soft">
                      <Pencil className="size-3.5" /> {t("common.edit")}
                    </ButtonLink>
                    {p.status === "published" && (
                      <Button size="sm" variant="ghost" onClick={() => { actions.setProductStatus(p.id, "hidden"); toast({ text: t("sell.toast.hidden"), tone: "info" }); }}>
                        <EyeOff className="size-3.5" /> {t("common.hide")}
                      </Button>
                    )}
                    {p.status === "hidden" && (
                      <Button size="sm" variant="ghost" onClick={() => { actions.setProductStatus(p.id, "published"); toast({ text: t("sell.toast.shown") }); }}>
                        <Eye className="size-3.5" /> {t("sell.mine.show")}
                      </Button>
                    )}
                    <ButtonLink href={`/market/${p.id}`} size="sm" variant="ghost" aria-label={t("sell.mine.view")}>
                      <ExternalLink className="size-3.5" />
                    </ButtonLink>
                    <Button size="sm" variant="ghost" className="text-rose-deep" onClick={() => setDel(p)} aria-label={t("common.delete")}>
                      <Trash className="size-3.5" />
                    </Button>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
          <DemoNote className="mt-4">{t("sell.mine.analyticsNote")}</DemoNote>
        </>
      )}
      <Modal
        open={!!del}
        onClose={() => setDel(null)}
        title={t("sell.del.title")}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDel(null)}>{t("common.cancel")}</Button>
            <Button
              variant="danger"
              onClick={() => {
                if (del) actions.deleteProduct(del.id);
                setDel(null);
                toast({ text: t("sell.toast.deleted"), tone: "info" });
              }}
            >
              {t("common.delete")}
            </Button>
          </>
        }
      >
        <div className="space-y-2 p-5 text-sm">
          <p className="font-bold text-ink">{del?.title}</p>
          <p className="text-muted">{t("sell.del.text")}</p>
        </div>
      </Modal>
    </div>
  );
}
