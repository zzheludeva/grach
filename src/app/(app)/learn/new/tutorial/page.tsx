"use client";
import { TutorialForm } from "@/components/seller/TutorialForm";

/** Start a tutorial right from Learning — the same form and saving logic as in the author dashboard. */
export default function LearnNewTutorialPage() {
  return <TutorialForm origin="learn" />;
}
