"use client";
import { use } from "react";
import { useStore } from "@/lib/store";
import { useI18n } from "@/i18n/I18nProvider";
import { WorkshopForm } from "@/components/seller/WorkshopForm";
import { EmptyState } from "@/components/ui/primitives";
import { ButtonLink } from "@/components/ui/button";

export default function EditWorkshopPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { state, meId } = useStore();
  const { t } = useI18n();
  const w = state!.data.workshops.find((x) => x.id === id);
  if (!w) return <EmptyState title={t("errors.notFound")} action={<ButtonLink href="/dashboard/workshops">{t("nav.myWorkshops")}</ButtonLink>} />;
  if (w.hostId !== meId) return <EmptyState title={t("common.forbidden")} action={<ButtonLink href={`/learn/workshop/${id}`}>{t("ev.form.openPage")}</ButtonLink>} />;
  return <WorkshopForm key={w.id + w.updatedAt} workshop={w} />;
}
