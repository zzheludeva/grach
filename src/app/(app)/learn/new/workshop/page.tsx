"use client";
import { WorkshopForm } from "@/components/seller/WorkshopForm";

/** Start a workshop right from Learning — the same form and saving logic as in the author dashboard. */
export default function LearnNewWorkshopPage() {
  return <WorkshopForm origin="learn" />;
}
