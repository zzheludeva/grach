"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";

export default function Home() {
  const { meId } = useStore();
  const router = useRouter();
  useEffect(() => {
    router.replace(meId ? "/feed" : "/welcome");
  }, [meId, router]);
  return null;
}
