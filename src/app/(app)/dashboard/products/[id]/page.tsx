"use client";
import { use } from "react";
import { useStore } from "@/lib/store";
import { useI18n } from "@/i18n/I18nProvider";
import { ProductForm } from "@/components/seller/ProductForm";
import { EmptyState } from "@/components/ui/primitives";
import { ButtonLink } from "@/components/ui/button";

export default function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { state, meId } = useStore();
  const { t } = useI18n();
  const product = state!.data.products.find((p) => p.id === id);
  if (!product) return <EmptyState title={t("errors.notFound")} action={<ButtonLink href="/dashboard/products">{t("nav.myProducts")}</ButtonLink>} />;
  // Only the seller may edit; others get an explicit message, not a silent redirect.
  if (product.sellerId !== meId) return <EmptyState title={t("common.forbidden")} action={<ButtonLink href={`/market/${id}`}>{t("sell.mine.view")}</ButtonLink>} />;
  return <ProductForm key={product.id} product={product} />;
}
