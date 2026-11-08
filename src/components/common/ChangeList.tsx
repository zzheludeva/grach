"use client";
import { ArrowRight } from "lucide-react";
import { useI18n, type I18n } from "@/i18n/I18nProvider";
import type { CurrencyCode } from "@/lib/types";

/** Formats a raw (locale-neutral) change value for the reader's language, region and time zone. */
export function formatChangeValue(field: string, raw: string, i18n: I18n): string {
  const { t, date, money } = i18n;
  if (!raw) return field === "price" ? t("learn.free") : t("ev.change.empty");
  switch (field) {
    case "startsAt":
    case "endsAt":
      return date(raw, "datetime");
    case "price": {
      const [amount, currency] = raw.split("|");
      return money({ amount: Number(amount), currency: currency as CurrencyCode });
    }
    case "format":
      return t(`workshop.${raw}`);
    case "timeZone":
      return raw.replace(/_/g, " ");
    case "place": {
      const [country, city, venue] = raw.split("|");
      const cn = i18n.has(`countryName.${country}`) ? t(`countryName.${country}`) : country;
      return [city, venue].filter(Boolean).join(", ") + (cn ? ` (${cn})` : "");
    }
    case "program":
      return raw.split("\n").join(" · ");
    default:
      return raw;
  }
}

/**
 * Old → new values of an event change. Joining links are masked for readers
 * (only enrolled participants see the link on the event page).
 */
export function ChangeList({ changes, maskLinks = false }: { changes: { field: string; from: string; to: string }[]; maskLinks?: boolean }) {
  const i18n = useI18n();
  const { t } = i18n;
  return (
    <ul className="space-y-2">
      {changes.map((c) => (
        <li key={c.field} className="rounded-xl border border-line bg-bg/60 p-2.5 text-[13px]">
          <p className="font-bold text-ink">{t(`ev.field.${c.field}`)}</p>
          {maskLinks && c.field === "onlineUrl" ? (
            <p className="text-muted">{t("ev.change.linkUpdated")}</p>
          ) : (
            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <span className="text-muted line-through decoration-rose/60">
                <span className="sr-only">{t("ev.change.from")}: </span>
                <span className="line-clamp-2 break-words">{formatChangeValue(c.field, c.from, i18n)}</span>
              </span>
              <ArrowRight className="size-3.5 shrink-0 text-faint rtl:rotate-180" aria-hidden />
              <span className="font-semibold text-ink">
                <span className="sr-only">{t("ev.change.to")}: </span>
                <span className="line-clamp-3 break-words">{formatChangeValue(c.field, c.to, i18n)}</span>
              </span>
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}
