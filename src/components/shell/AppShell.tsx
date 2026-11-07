"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useState } from "react";
import { Bell, Plus, Search, ShoppingCart, Settings, LogOut, UserRound, Users, Repeat, Languages, Bookmark, Package, MessageCircle, Pencil } from "lucide-react";
import { useStore } from "@/lib/store";
import { useI18n } from "@/i18n/I18nProvider";
import { MAIN_NAV, USER_NAV } from "./nav";
import { Logo } from "@/components/ui/mosaic";
import { Avatar } from "@/components/ui/primitives";
import { Dropdown, MenuItem } from "@/components/ui/menu";
import { Button, IconButton } from "@/components/ui/button";
import { cartCount, unreadCount } from "@/lib/selectors";
import { cn } from "@/lib/utils";
import { Composer } from "@/components/feed/Composer";
import { LangSuggestion } from "./LangSuggestion";

const ShellCtx = createContext<{ openComposer: (prefill?: { title?: string; body?: string }) => void }>({ openComposer: () => {} });
export const useShell = () => useContext(ShellCtx);

export function AppShell({ children }: { children: React.ReactNode }) {
  const { state, me, meId } = useStore();
  const router = useRouter();
  const [composer, setComposer] = useState<{ open: boolean; prefill?: { title?: string; body?: string } }>({ open: false });

  useEffect(() => {
    if (state && !meId) router.replace("/welcome");
  }, [state, meId, router]);

  if (!state || !me) return null;

  return (
    <ShellCtx.Provider value={{ openComposer: (prefill) => setComposer({ open: true, prefill }) }}>
      <div className="min-h-dvh lg:ps-[248px]">
        <Sidebar onCompose={() => setComposer({ open: true })} />
        <TopBar onCompose={() => setComposer({ open: true })} />
        <main className="mx-auto w-full max-w-[1240px] px-4 pb-28 pt-4 sm:px-6 lg:px-8 lg:pb-12 lg:pt-6">
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

function Sidebar({ onCompose }: { onCompose: () => void }) {
  const { t } = useI18n();
  const { state, meId } = useStore();
  const active = useActive();
  const d = state!.data;
  const counts: Record<string, number> = { cart: cartCount(d, meId), notifications: unreadCount(d, meId) };
  return (
    <aside className="fixed inset-y-0 start-0 z-40 hidden w-[248px] flex-col border-e border-line bg-surface lg:flex">
      <Link href="/feed" className="flex h-[72px] items-center px-6" aria-label="Remeslo">
        <Logo />
      </Link>
      <nav className="flex-1 overflow-y-auto px-3 pb-4" aria-label={t("nav.main")}>
        <ul className="space-y-1">
          {MAIN_NAV.map(({ href, key, icon: Icon }) => (
            <li key={href}>
              <Link
                href={href}
                className={cn(
                  "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-semibold transition-colors",
                  active(href) ? "bg-ink text-white" : "text-ink hover:bg-ink-soft/70",
                )}
              >
                <Icon className={cn("size-5", active(href) ? "text-saffron" : "text-ink/70")} />
                <span className="truncate">{t(`nav.${key}`)}</span>
              </Link>
            </li>
          ))}
        </ul>
        <Button className="mt-4 w-full" variant="accent" onClick={onCompose}>
          <Plus className="size-4" /> {t("nav.newPost")}
        </Button>
        <p className="mb-2 mt-7 px-3 text-[11px] font-bold uppercase tracking-[0.12em] text-faint">{t("nav.mine")}</p>
        <ul className="space-y-0.5">
          {USER_NAV.map(({ href, key, icon: Icon }) => (
            <li key={href}>
              <Link
                href={href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition-colors",
                  active(href) ? "bg-ink-soft text-ink" : "text-muted hover:bg-ink-soft/60 hover:text-ink",
                )}
              >
                <Icon className="size-[18px]" />
                <span className="min-w-0 flex-1 truncate">{t(`nav.${key}`)}</span>
                {!!counts[key] && <span className="nums rounded-full bg-saffron px-1.5 text-[11px] font-bold text-ink-deep">{counts[key]}</span>}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <div className="border-t border-line p-3">
        <UserMenu side="top" full />
      </div>
    </aside>
  );
}

function UserMenu({ side = "bottom", full = false }: { side?: "top" | "bottom"; full?: boolean }) {
  const { t, langName } = useI18n();
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
          <div className="lg:hidden">
            <MenuItem icon={<Bookmark />} onClick={() => go(`/favorites`, close)}>{t("nav.favorites")}</MenuItem>
            <MenuItem icon={<Package />} onClick={() => go(`/orders`, close)}>{t("nav.orders")}</MenuItem>
            <MenuItem icon={<MessageCircle />} onClick={() => go(`/messages`, close)}>{t("nav.messages")}</MenuItem>
          </div>
          <div className="my-1 h-px bg-line" />
          <MenuItem icon={<Languages />} onClick={() => go(`/settings`, close)} trailing={<span className="text-xs text-faint">{langName(t("meta.code"))}</span>}>
            {t("nav.settings")}
          </MenuItem>
          <MenuItem icon={<Repeat />} onClick={() => { close(); actions.logout(); router.push("/welcome"); }}>{t("nav.switchAccount")}</MenuItem>
          <MenuItem icon={<LogOut />} onClick={() => { close(); actions.logout(); router.push("/welcome"); }}>{t("nav.logout")}</MenuItem>
        </>
      )}
    </Dropdown>
  );
}

function TopBar({ onCompose }: { onCompose: () => void }) {
  const { t } = useI18n();
  const { state, meId } = useStore();
  const router = useRouter();
  const d = state!.data;
  const cc = cartCount(d, meId);
  const uc = unreadCount(d, meId);
  const [q, setQ] = useState("");
  return (
    <header className="sticky top-0 z-30 border-b border-line/80 bg-bg/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1240px] items-center gap-2 px-4 sm:px-6 lg:px-8">
        <Link href="/feed" className="lg:hidden" aria-label="Remeslo">
          <Logo withText={false} className="sm:hidden" />
          <Logo className="hidden sm:inline-flex" />
        </Link>
        <form
          role="search"
          className="relative ms-1 hidden min-w-0 flex-1 md:block lg:ms-0 lg:max-w-md"
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
        <div className="ms-auto flex items-center gap-1">
          <Link href="/search" className="inline-flex size-10 items-center justify-center rounded-xl text-ink hover:bg-ink-soft/70 md:hidden" aria-label={t("nav.search")}>
            <Search className="size-5" />
          </Link>
          <IconButton label={t("nav.newPost")} onClick={onCompose} className="lg:hidden">
            <Plus className="size-5" />
          </IconButton>
          <Link href="/notifications" className="relative inline-flex size-10 items-center justify-center rounded-xl text-ink hover:bg-ink-soft/70" aria-label={t("nav.notificationsCount", { count: uc })}>
            <Bell className="size-5" />
            {uc > 0 && <span className="nums absolute end-1.5 top-1.5 min-w-4 rounded-full bg-rose px-1 text-center text-[10px] font-bold leading-4 text-white">{uc}</span>}
          </Link>
          <Link href="/cart" className="relative inline-flex h-10 items-center gap-2 rounded-xl px-2.5 text-ink hover:bg-ink-soft/70" aria-label={t("nav.cartCount", { count: cc })}>
            <ShoppingCart className="size-5" />
            {cc > 0 && <span className="nums min-w-5 rounded-full bg-saffron px-1.5 text-center text-[11px] font-bold leading-5 text-ink-deep">{cc}</span>}
          </Link>
          <Link href="/settings" className="hidden size-10 items-center justify-center rounded-xl text-ink hover:bg-ink-soft/70 lg:inline-flex" aria-label={t("nav.settings")}>
            <Settings className="size-5" />
          </Link>
          <div className="ms-1 lg:hidden">
            <UserMenu />
          </div>
        </div>
      </div>
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
