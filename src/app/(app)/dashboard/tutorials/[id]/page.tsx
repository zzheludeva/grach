"use client";
import { use } from "react";
import { useStore } from "@/lib/store";
import { useI18n } from "@/i18n/I18nProvider";
import { TutorialForm } from "@/components/seller/TutorialForm";
import { EmptyState } from "@/components/ui/primitives";
import { ButtonLink } from "@/components/ui/button";

export default function EditTutorialPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { state, meId } = useStore();
  const { t } = useI18n();
  const tut = state!.data.tutorials.find((x) => x.id === id);
  if (!tut) return <EmptyState title={t("errors.notFound")} action={<ButtonLink href="/dashboard/tutorials">{t("nav.myTutorials")}</ButtonLink>} />;
  if (tut.authorId !== meId) return <EmptyState title={t("common.forbidden")} action={<ButtonLink href={`/learn/tutorial/${id}`}>{t("sell.mine.view")}</ButtonLink>} />;
  return <TutorialForm key={tut.id} tutorial={tut} />;
}
