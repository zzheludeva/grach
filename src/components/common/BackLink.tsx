"use client";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useStore } from "@/lib/store";
import { useI18n } from "@/i18n/I18nProvider";
import { usePreviousPage } from "@/lib/nav-history";
import { cn } from "@/lib/utils";

/** Human label for an in-app URL ("Sales", "Learning · Workshops", "Search", a profile name…). */
function useLabelFor() {
  const { t } = useI18n();
  const { state } = useStore();
  return (url: string) => {
    const [path, qs = ""] = url.split("?");
    const q = new URLSearchParams(qs);
    const seg = path.split("/").filter(Boolean);
    if (path === "/orders") return q.get("role") === "seller" ? t("nav2.sales") : t("nav2.purchases");
    if (path.startsWith("/orders/")) return t("nav2.order");
    if (path === "/learn") return q.get("tab") === "workshops" ? t("learn.workshops") : q.get("tab") === "mine" ? t("learn.mine") : t("nav.learn");
    if (path === "/dashboard") return t("dashboard.title");
    if (path === "/dashboard/tutorials") return t("nav.myTutorials");
    if (path === "/dashboard/workshops") return t("nav.myWorkshops");
    if (/^\/dashboard\/workshops\/[^/]+$/.test(path)) return t("ws.mine.manage");
    if (path === "/dashboard/products") return t("nav.myProducts");
    if (path.startsWith("/dashboard/projects")) return t("nav.myProjects");
    if (path === "/search") return t("nav.search");
    if (seg[0] === "profile" && seg[1] && seg[1] !== "edit") return state?.data.users.find((u) => u.username === decodeURIComponent(seg[1]))?.name ?? t("nav.profile");
    if (seg[0] === "messages") return t("nav.messages");
    if (seg[0] === "learn" && seg[1] === "workshop") return t("nav2.workshop");
    if (seg[0] === "learn" && seg[1] === "tutorial") return t("nav2.tutorial");
    if (seg[0] === "post") return t("nav2.post");
    if (seg[0] === "market" && seg[1]) return t("nav2.product");
    const top: Record<string, string> = { feed: "nav.feed", market: "nav.market", favorites: "nav.favorites", notifications: "nav.notifications", cart: "nav.cart", studio: "nav.studio", settings: "nav.settings" };
    if (seg.length === 1 && top[seg[0]]) return t(top[seg[0]]);
    return t("common.back");
  };
}

/**
 * "Back" that returns to where the page was actually opened from (keeping that list's role, tab, query,
 * filters and sort). When the page was opened directly, it goes to `fallback` — chosen by the caller from the
 * viewer's role (e.g. the seller's sales list vs. the buyer's purchases, own materials vs. the public catalogue).
 */
export function BackLink({ fallback, fallbackLabel, className }: { fallback: string; fallbackLabel: string; className?: string }) {
  const router = useRouter();
  const prev = usePreviousPage();
  const labelFor = useLabelFor();
  const href = prev ?? fallback;
  return (
    <a
      href={href}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        e.preventDefault();
        if (prev && window.history.length > 1) router.back();
        else router.push(fallback);
      }}
      className={cn("inline-flex min-h-10 items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink", className)}
    >
      <ArrowLeft className="size-4 shrink-0 rtl:rotate-180" />
      <span className="truncate">{prev ? labelFor(prev) : fallbackLabel}</span>
    </a>
  );
}
