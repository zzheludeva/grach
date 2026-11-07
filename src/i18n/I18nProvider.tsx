"use client";

import { createContext, useCallback, useContext, useEffect, useMemo } from "react";
import type { CountryCode, Locale, Money } from "@/lib/types";
import { region } from "@/lib/regions";
import { dirFor } from "./config";
import { messages, type Messages } from "./messages";
import { categoryName, contentLangName } from "./content";
import type { CategoryId } from "@/lib/types";

type Vars = Record<string, string | number>;
type PluralForms = { zero?: string; one?: string; two?: string; few?: string; many?: string; other: string };

function lookup(obj: unknown, path: string): unknown {
  let cur: unknown = obj;
  for (const part of path.split(".")) {
    if (cur && typeof cur === "object" && part in (cur as Record<string, unknown>)) {
      cur = (cur as Record<string, unknown>)[part];
    } else return undefined;
  }
  return cur;
}

export interface I18n {
  locale: Locale;
  country: CountryCode;
  timeZone: string;
  dir: "ltr" | "rtl";
  t: (key: string, vars?: Vars) => string;
  has: (key: string) => boolean;
  money: (m: Money) => string;
  num: (n: number, opts?: Intl.NumberFormatOptions) => string;
  date: (iso: string, style?: "short" | "long" | "medium" | "datetime" | "time" | "weekday") => string;
  relative: (iso: string) => string;
  cat: (id: CategoryId) => string;
  langName: (code: string) => string;
}

const Ctx = createContext<I18n | null>(null);

function textLocale(locale: Locale, country: CountryCode) {
  const candidate = `${locale.split("-")[0]}-${country}`;
  try {
    if (Intl.DateTimeFormat.supportedLocalesOf([candidate])[0] === candidate) return candidate;
  } catch {}
  return locale;
}

export function I18nProvider({
  locale,
  country,
  timeZone,
  children,
}: {
  locale: Locale;
  country: CountryCode;
  timeZone: string;
  children: React.ReactNode;
}) {
  const dir = dirFor(locale);
  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = dir;
  }, [locale, dir]);

  const resolve = useCallback(
    (key: string): unknown => {
      const own = lookup(messages[locale], key);
      if (own !== undefined) return own;
      return lookup(messages.en, key); // fallback to English
    },
    [locale],
  );

  const value = useMemo<I18n>(() => {
    const plural = new Intl.PluralRules(locale);
    const fmtLocale = region(country).formatLocale;
    const tLocale = textLocale(locale, country);
    const numFmt = new Intl.NumberFormat(fmtLocale);
    const t = (key: string, vars?: Vars) => {
      let v = resolve(key);
      if (v && typeof v === "object" && "other" in (v as object)) {
        const forms = v as PluralForms;
        const n = Number(vars?.count ?? 0);
        const cat = plural.select(n) as keyof PluralForms;
        v = forms[cat] ?? forms.other;
      }
      if (typeof v !== "string") {
        if (process.env.NODE_ENV !== "production") console.warn(`[i18n] missing key: ${key}`);
        return key;
      }
      if (!vars) return v;
      return v.replace(/\{(\w+)\}/g, (_, k: string) => {
        const val = vars[k];
        if (val === undefined) return `{${k}}`;
        return typeof val === "number" ? numFmt.format(val) : String(val);
      });
    };
    return {
      locale,
      country,
      timeZone,
      dir,
      t,
      has: (key) => resolve(key) !== undefined,
      money: (m) =>
        new Intl.NumberFormat(fmtLocale, {
          style: "currency",
          currency: m.currency,
          currencyDisplay: "narrowSymbol",
          minimumFractionDigits: Number.isInteger(m.amount) ? 0 : 2,
          maximumFractionDigits: 2,
        }).format(m.amount),
      num: (n, opts) => new Intl.NumberFormat(fmtLocale, opts).format(n),
      date: (iso, style = "medium") => {
        const d = new Date(iso);
        const base = { timeZone };
        switch (style) {
          case "short":
            return new Intl.DateTimeFormat(fmtLocale, { ...base, day: "2-digit", month: "2-digit", year: "numeric" }).format(d);
          case "long":
            return new Intl.DateTimeFormat(tLocale, { ...base, day: "numeric", month: "long", year: "numeric" }).format(d);
          case "weekday":
            return new Intl.DateTimeFormat(tLocale, { ...base, weekday: "short", day: "numeric", month: "long" }).format(d);
          case "time":
            return new Intl.DateTimeFormat(fmtLocale, { ...base, hour: "2-digit", minute: "2-digit" }).format(d);
          case "datetime":
            return new Intl.DateTimeFormat(tLocale, {
              ...base,
              day: "numeric",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
              hourCycle: country === "RU" || country === "BR" ? "h23" : undefined,
            }).format(d);
          default:
            return new Intl.DateTimeFormat(tLocale, { ...base, day: "numeric", month: "short" }).format(d);
        }
      },
      relative: (iso) => {
        const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
        const diff = (new Date(iso).getTime() - Date.now()) / 1000;
        const abs = Math.abs(diff);
        if (abs < 60) return rtf.format(Math.round(diff), "second");
        if (abs < 3600) return rtf.format(Math.round(diff / 60), "minute");
        if (abs < 86400) return rtf.format(Math.round(diff / 3600), "hour");
        if (abs < 86400 * 30) return rtf.format(Math.round(diff / 86400), "day");
        if (abs < 86400 * 365) return rtf.format(Math.round(diff / (86400 * 30)), "month");
        return rtf.format(Math.round(diff / (86400 * 365)), "year");
      },
      cat: (id) => categoryName(id, locale),
      langName: (code) => contentLangName(code, locale),
    };
  }, [locale, country, timeZone, dir, resolve]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useI18n outside provider");
  return v;
}

export type { Messages };
