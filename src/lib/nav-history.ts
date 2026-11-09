"use client";
import { useCallback, useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * In-app navigation stack for this browser tab (sessionStorage). Each entry is a full URL path with its query,
 * so returning from a detail page lands on the exact list the person came from — with its role, tab,
 * search query, filters and sort (pages keep those in the URL via useQueryState).
 * Query-only changes on the same page update the current entry instead of adding a new one.
 */
const KEY = "grach:nav";

function read(): string[] {
  try {
    const v = JSON.parse(sessionStorage.getItem(KEY) ?? "[]");
    return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}
function write(st: string[]) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(st.slice(-40)));
  } catch {}
}
const pathOf = (url: string) => url.split("?")[0];

// Set by the browser's back/forward buttons (and router.back()); only then is a matching entry popped.
let poppedByHistory = false;
let firstRun = true;

/** Mounted once in the app shell. */
export function NavTracker() {
  const pathname = usePathname();
  const sp = useSearchParams();
  useEffect(() => {
    const onPop = () => {
      poppedByHistory = true;
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  useEffect(() => {
    const qs = sp.toString();
    const url = pathname + (qs ? `?${qs}` : "");
    const st = read();
    const last = st[st.length - 1];
    // A full page load through back/forward behaves like popstate.
    const nav = firstRun ? (performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined) : undefined;
    const isBack = poppedByHistory || nav?.type === "back_forward";
    firstRun = false;
    poppedByHistory = false;
    if (last && pathOf(last) === pathname) st[st.length - 1] = url;
    else if (isBack && st.length >= 2 && pathOf(st[st.length - 2]) === pathname) {
      st.pop();
      st[st.length - 1] = url;
    } else st.push(url);
    write(st);
    window.dispatchEvent(new Event("grach:nav"));
  }, [pathname, sp]);
  return null;
}

/** The page this one was opened from (inside the app), or null when opened directly. */
export function usePreviousPage(): string | null {
  const pathname = usePathname();
  const [prev, setPrev] = useState<string | null>(null);
  useEffect(() => {
    const sync = () => {
      const st = read();
      const cur = st[st.length - 1];
      setPrev(cur && pathOf(cur) === pathname && st.length >= 2 ? st[st.length - 2] : null);
    };
    sync();
    window.addEventListener("grach:nav", sync);
    return () => window.removeEventListener("grach:nav", sync);
  }, [pathname]);
  return prev;
}

/**
 * A piece of page state mirrored in the URL query (replaceState, no new history entry), so it survives
 * going to a detail page and back, reloads and language switches. Default values are omitted from the URL.
 */
export function useQueryState<T extends string>(key: string, def: T, allowed?: readonly T[]): [T, (v: T) => void] {
  const sp = useSearchParams();
  const initial = sp.get(key);
  const [v, setV] = useState<T>(() => (initial !== null && (!allowed || allowed.includes(initial as T)) ? (initial as T) : def));
  const set = useCallback(
    (nv: T) => {
      setV(nv);
      const u = new URL(window.location.href);
      if (nv === def || nv === "") u.searchParams.delete(key);
      else u.searchParams.set(key, nv);
      window.history.replaceState(null, "", u.pathname + u.search + u.hash);
    },
    [key, def],
  );
  return [v, set];
}

/** Boolean flavour of useQueryState ("1" / "0" in the URL). */
export function useQueryFlag(key: string, def: boolean): [boolean, (v: boolean) => void] {
  const [v, set] = useQueryState<"1" | "0">(key, def ? "1" : "0", ["1", "0"]);
  return [v === "1", useCallback((b: boolean) => set(b ? "1" : "0"), [set])];
}
