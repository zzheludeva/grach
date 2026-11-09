"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, Suspense, useContext, useEffect, useState } from "react";
import { Plus, Search, LogOut, UserRound, Users, Repeat, Languages, Package, MessageCircle, Pencil, FolderKanban, Store, CalendarDays, BookOpen, Check, Settings as SettingsIcon } from "lucide-react";
import { useStore } from "@/lib/store";
import { useI18n } from "@/i18n/I18nProvider";
import { MAIN_NAV, USER_NAV } from "./nav";
import { Logo, useBrandName } from "@/components/ui/mosaic";
import { Avatar } from "@/components/ui/primitives";
import { Dropdown, MenuItem } from "@/components/ui/menu";
import { Button, IconButton } from "@/components/ui/button";
import { cartCount, unreadCount } from "@/lib/selectors";
import { cn } from "@/lib/utils";
import { Composer } from "@/components/feed/Composer";
import { LangSuggestion } from "./LangSuggestion";
import { NavTracker } from "@/lib/nav-history";
import { LOCALES, LOCALE_NAMES } from "@/i18n/config";
import type { Locale } from "@/lib/types";

const ShellCtx = createContext<{ openComposer: (prefill?: { title?: string; body?: string }) => void }>({ openComposer: () => {} });
export const useShell = () => useContext(ShellCtx);

export function AppShell({ children }: { children: React.ReactNode }) {
  const { state, me, meId, storageError } = useStore();
  const { t } = useI18n();
  const router = useRouter();
  const [composer, setComposer] = useState<{ open: boolean; prefill?: { title?: string; body?: string } }>({ open: false });

  useEffect(() => {
    if (state && !meId) router.replace("/welcome");
  }, [state, meId, router]);

  if (!state || !me) return null;

  return (
    <ShellCtx.Provider value={{ openComposer: (prefill) => setComposer({ open: true, prefill }) }}>
      <Suspense fallback={null}>
        <NavTracker />
      </Suspense>
      <div className="min-h-dvh">
        <TopBar onCompose={() => setComposer({ open: true })} />
        <main className="mx-auto w-full max-w-[1240px] px-4 pb-28 pt-4 sm:px-6 lg:px-8 lg:pb-12 lg:pt-6">
          {storageError && (
            <p role="alert" className="mb-4 rounded-xl border border-rose/40 bg-rose-soft px-3 py-2 text-sm font-semibold text-rose-deep">
              {t("storage.full")}
            </p>
          )}
          <LangSuggestion />
          {children}
        </main>
        <BottomNav />
      </div>
      <Composer open={composer.open} prefill={composer.prefill} onClose={() => setComposer({ open: false })} />
    </ShellCtx.Provider>
  );
}

function useActive() {
  const path = usePathname();
  return (href: string) => path === href || path.startsWith(href + "/");
}

/** Desktop: the five main sections as horizontal tabs, fixed under the header. */
function SectionTabs() {
  const { t } = useI18n();
  const active = useActive();
  return (
    <nav className="hidden border-t border-line/70 lg:block" aria-label={t("nav.main")}>
      <ul role="tablist" className="mx-auto flex max-w-[1240px] gap-1 px-8">
        {MAIN_NAV.map(({ href, key, icon: Icon }) => {
          const on = active(href);
          return (
            <li key={href} role="presentation">
              <Link
                href={href}
                role="tab"
                aria-selected={on}
                aria-current={on ? "page" : undefined}
                className={cn(
                  "relative flex h-12 items-center gap-2 px-4 text-[15px] font-semibold transition-colors",
                  on ? "text-ink" : "text-muted hover:text-ink",
                )}
              >
                <Icon className={cn("size-[18px]", on ? "text-rust" : "text-ink/50")} />
                {t(`nav.${key}`)}
                <span className={cn("absolute inset-x-3 -bottom-px h-[3px] rounded-t-full transition-colors", on ? "bg-saffron" : "bg-transparent")} aria-hidden />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function UserMenu({ side = "bottom", full = false }: { side?: "top" | "bottom"; full?: boolean }) {
  const { t } = useI18n();
  const { me, actions } = useStore();
  const router = useRouter();
  if (!me) return null;
  const go = (href: string, close: () => void) => {
    close();
    router.push(href);
  };
  return (
    <Dropdown
      side={side}
      align={full ? "start" : "end"}
      className={full ? "w-[224px]" : "w-64"}
      trigger={(p) =>
        full ? (
          <button {...p} className="flex w-full items-center gap-3 rounded-xl p-2 text-start hover:bg-ink-soft/60">
            <Avatar name={me.name} color={me.avatarColor} size={38} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-bold text-ink">{me.name}</span>
              <span className="block truncate text-xs text-muted">@{me.username}</span>
            </span>
          </button>
        ) : (
          <button {...p} className="rounded-full" aria-label={t("nav.profileMenu")}>
            <Avatar name={me.name} color={me.avatarColor} size={34} />
          </button>
        )
      }
    >
      {(close) => (
        <>
          <div className="px-3 pb-2 pt-1.5">
            <p className="truncate text-sm font-bold text-ink">{me.name}</p>
            <p className="truncate text-xs text-muted">{t(`status.${me.status}`)}</p>
          </div>
          <MenuItem icon={<UserRound />} onClick={() => go(`/profile/${me.username}`, close)}>{t("nav.profile")}</MenuItem>
          <MenuItem icon={<Pencil />} onClick={() => go(`/profile/edit`, close)}>{t("nav.editProfile")}</MenuItem>
          <MenuItem icon={<Users />} onClick={() => go(`/connections/${me.username}?tab=followers`, close)}>{t("nav.connections")}</MenuItem>
          <div className="my-1 h-px bg-line" />
          <MenuItem icon={<FolderKanban />} onClick={() => go(`/dashboard/projects`, close)}>{t("nav.myProjects")}</MenuItem>
          <MenuItem icon={<Store />} onClick={() => go(`/dashboard/products`, close)}>{t("nav.myProducts")}</MenuItem>
          <MenuItem icon={<CalendarDays />} onClick={() => go(`/dashboard/workshops`, close)}>{t("nav.myWorkshops")}</MenuItem>
          <MenuItem icon={<BookOpen />} onClick={() => go(`/dashboard/tutorials`, close)}>{t("nav.myTutorials")}</MenuItem>
          <div className="md:hidden">
            <div className="my-1 h-px bg-line" />
            <MenuItem icon={<Package />} onClick={() => go(`/orders`, close)}>{t("nav.orders")}</MenuItem>
            <MenuItem icon={<MessageCircle />} onClick={() => go(`/messages`, close)}>{t("nav.messages")}</MenuItem>
          </div>
          <div className="my-1 h-px bg-line" />
          <MenuItem icon={<SettingsIcon />} onClick={() => go(`/settings`, close)}>
            {t("nav.settings")}
          </MenuItem>
          <MenuItem icon={<Repeat />} onClick={() => { close(); actions.logout(); router.push("/welcome"); }}>{t("nav.switchAccount")}</MenuItem>
          <MenuItem icon={<LogOut />} onClick={() => { close(); actions.logout(); router.push("/welcome"); }}>{t("nav.logout")}</MenuItem>
        </>
      )}
    </Dropdown>
  );
}

/** Header icon size: a bit smaller on narrow phones so logo, search, new post, favorites, cart, notifications, language and avatar fit at 320 px. */
const PHONE_ICON = "size-8 min-[360px]:size-9 sm:size-10";

const SHORT: Record<Locale, string> = { ru: "RU", en: "EN", "pt-BR": "PT", es: "ES" };

/**
 * Compact language switcher in the header. Switches the interface in place: same page, same URL (filters and
 * queries live in the URL), same component state. Saved per account and per device; the country is not changed.
 */
function LanguageSwitcher() {
  const { t, locale } = useI18n();
  const { actions } = useStore();
  return (
    <Dropdown
      align="end"
      className="w-60"
      trigger={(p) => (
        <button
          {...p}
          aria-label={t("nav2.language", { lang: LOCALE_NAMES[locale] })}
          title={t("nav2.languageTitle")}
          className={cn("inline-flex items-center justify-center gap-1 rounded-xl text-[13px] font-bold text-ink hover:bg-ink-soft/70 sm:h-10 sm:w-auto sm:min-w-10 sm:px-2", PHONE_ICON)}
        >
          <Languages className="size-[18px]" />
          <span className="hidden sm:inline">{SHORT[locale]}</span>
        </button>
      )}
    >
      {(close) => (
        <>
          <p className="px-3 pb-1.5 pt-1 text-xs font-semibold text-muted">{t("nav2.languageTitle")}</p>
          {LOCALES.map((l) => (
            <MenuItem
              key={l}
              className="min-h-11"
              onClick={() => {
                close();
                if (l === locale) return;
                actions.updateSettings({ lang: l });
                actions.setDeviceLang(l);
              }}
              trailing={l === locale ? <Check className="size-4 text-teal" /> : <span className="text-[11px] font-bold text-faint">{SHORT[l]}</span>}
            >
              <span lang={l}>{LOCALE_NAMES[l]}</span>
            </MenuItem>
          ))}
        </>
      )}
    </Dropdown>
  );
}

function TopBar({ onCompose }: { onCompose: () => void }) {
  const { t } = useI18n();
  const { state, meId } = useStore();
  const router = useRouter();
  const active = useActive();
  const brand = useBrandName();
  const d = state!.data;
  const counts: Record<string, number> = { cart: cartCount(d, meId), notifications: unreadCount(d, meId) };
  const [q, setQ] = useState("");
  return (
    <header className="sticky top-0 z-40 border-b border-line/80 bg-bg/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1240px] items-center gap-1.5 px-4 sm:gap-2 sm:px-6 lg:px-8">
        <Link href="/feed" className="shrink-0" aria-label={brand}>
          <Logo withText={false} className="sm:hidden" />
          <Logo className="hidden sm:inline-flex" />
        </Link>
        <form
          role="search"
          className="relative ms-3 hidden min-w-0 flex-1 md:block lg:max-w-sm xl:max-w-md"
          onSubmit={(e) => {
            e.preventDefault();
            router.push(`/search?q=${encodeURIComponent(q)}`);
          }}
        >
          <Search className="pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-faint" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("search.placeholder")}
            aria-label={t("search.placeholder")}
            className="h-10 w-full rounded-xl border border-line bg-surface ps-10 pe-3 text-sm placeholder:text-faint focus:border-teal focus:outline-none focus:ring-3 focus:ring-teal/20"
          />
        </form>
        <div className="ms-auto flex items-center gap-0 min-[360px]:gap-0.5">
          <Link href="/search" className={cn("inline-flex items-center justify-center rounded-xl text-ink hover:bg-ink-soft/70 md:hidden", PHONE_ICON)} aria-label={t("nav.search")}>
            <Search className="size-5" />
          </Link>
          <Button variant="accent" size="sm" onClick={onCompose} className="me-1 hidden lg:inline-flex">
            <Plus className="size-4" /> {t("nav.newPost")}
          </Button>
          <IconButton label={t("nav.newPost")} onClick={onCompose} className={cn("lg:hidden", PHONE_ICON)}>
            <Plus className="size-5" />
          </IconButton>
          <nav aria-label={t("nav.account")} className="flex items-center gap-0 min-[360px]:gap-0.5">
            {USER_NAV.map(({ href, key, icon: Icon }) => {
              const n = counts[key] ?? 0;
              // On phones favorites, cart and notifications stay in the bar; orders and messages live in the profile menu.
              const phone = key === "favorites" || key === "cart" || key === "notifications";
              const label = key === "cart" ? t("nav.cartCount", { count: n }) : key === "notifications" ? t("nav.notificationsCount", { count: n }) : t(`nav.${key}`);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-label={label}
                  title={t(`nav.${key}`)}
                  aria-current={active(href) ? "page" : undefined}
                  className={cn(
                    "relative items-center justify-center rounded-xl text-ink hover:bg-ink-soft/70",
                    phone ? cn("inline-flex", PHONE_ICON) : "hidden size-10 md:inline-flex",
                    active(href) && "bg-ink-soft",
                  )}
                >
                  <Icon className="size-5" />
                  {n > 0 && (
                    <span className={cn("nums absolute end-1 top-1 min-w-4 rounded-full px-1 text-center text-[10px] font-bold leading-4", key === "cart" ? "bg-saffron text-ink-deep" : "bg-rose text-white")}>
                      {n}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
          <LanguageSwitcher />
          <div className="ms-1">
            <UserMenu />
          </div>
        </div>
      </div>
      <SectionTabs />
    </header>
  );
}

function BottomNav() {
  const { t } = useI18n();
  const active = useActive();
  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 backdrop-blur-md lg:hidden" aria-label={t("nav.main")}>
      <ul className="mx-auto grid max-w-lg grid-cols-5">
        {MAIN_NAV.map(({ href, key, icon: Icon }) => {
          const on = active(href);
          return (
            <li key={href}>
              <Link href={href} className={cn("flex flex-col items-center gap-1 px-1 pb-2 pt-2.5 text-[11px] font-semibold", on ? "text-ink" : "text-faint")}>
                <span className={cn("flex h-7 w-11 items-center justify-center rounded-full transition-colors", on && "bg-ink text-saffron")}>
                  <Icon className="size-[19px]" />
                </span>
                <span className="w-full truncate text-center">{t(`navShort.${key}`)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
