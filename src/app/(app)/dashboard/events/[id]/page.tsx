"use client";
import { use } from "react";
import { useStore } from "@/lib/store";
import { useI18n } from "@/i18n/I18nProvider";
import { EventForm } from "@/components/seller/EventForm";
import { DemoNote, EmptyState } from "@/components/ui/primitives";
import { ButtonLink } from "@/components/ui/button";
import { workshopPhase } from "@/lib/workshops";

export default function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { state, meId } = useStore();
  const { t } = useI18n();
  const w = state!.data.workshops.find((x) => x.id === id);
  if (!w) return <EmptyState title={t("errors.notFound")} action={<ButtonLink href="/dashboard/events">{t("nav.myEvents")}</ButtonLink>} />;
  if (w.hostId !== meId) return <EmptyState title={t("common.forbidden")} action={<ButtonLink href={`/learn/workshop/${id}`}>{t("ev.form.openPage")}</ButtonLink>} />;
  const phase = workshopPhase(w);
  // Cancelled and completed events are read-only.
  if (phase === "cancelled" || phase === "completed")
    return (
      <div className="mx-auto max-w-xl space-y-4">
        <DemoNote>{phase === "cancelled" ? t("ev.page.cancelled") : t("ev.page.completed")}</DemoNote>
        <ButtonLink href={`/learn/workshop/${id}`}>{t("ev.form.openPage")}</ButtonLink>
      </div>
    );
  return <EventForm key={w.id} workshop={w} />;
}
