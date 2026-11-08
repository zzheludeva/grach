"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChartColumnBig, Store, CalendarDays, FolderKanban } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";
import { cn } from "@/lib/utils";

const SUB = [
  { href: "/dashboard", key: "overview", icon: ChartColumnBig, exact: true },
  { href: "/dashboard/products", key: "myProducts", icon: Store },
  { href: "/dashboard/events", key: "myEvents", icon: CalendarDays },
  { href: "/dashboard/projects", key: "myProjects", icon: FolderKanban },
] as const;

/** Author dashboard sub-sections. The main section tabs stay in the header. */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { t } = useI18n();
  const path = usePathname();
  return (
    <div>
      <nav aria-label={t("nav.dashboard")} className="scrollbar-none -mx-4 mb-6 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <ul className="flex w-max gap-1 rounded-xl bg-ink-soft/60 p-1">
          {SUB.map((s) => {
            const on = "exact" in s ? path === s.href : path === s.href || path.startsWith(s.href + "/");
            const Icon = s.icon;
            return (
              <li key={s.href}>
                <Link
                  href={s.href}
                  aria-current={on ? "page" : undefined}
                  className={cn("inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-lg px-3.5 text-sm font-semibold", on ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink")}
                >
                  <Icon className="size-4" /> {t(`nav.${s.key}`)}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      {children}
    </div>
  );
}
