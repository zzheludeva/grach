"use client";
import { useI18n } from "@/i18n/I18nProvider";
import { LOCALES, LOCALE_NAMES } from "@/i18n/config";
import { COUNTRY_CODES, region } from "@/lib/regions";
import { Field, Select } from "@/components/ui/primitives";
import type { CountryCode, CurrencyCode, Locale, Settings } from "@/lib/types";

const CURRENCIES: CurrencyCode[] = ["RUB", "BRL", "EUR", "GBP"];

/** Language, country, time zone, currency and city — independent settings. */
export function RegionFields({ value, onChange }: { value: Settings; onChange: (patch: Partial<Settings>) => void }) {
  const { t } = useI18n();
  const r = region(value.country);
  const tzLabel = (tz: string) => {
    try {
      const off = new Intl.DateTimeFormat("en", { timeZone: tz, timeZoneName: "shortOffset" }).formatToParts(new Date()).find((p) => p.type === "timeZoneName")?.value;
      return `${tz.split("/").pop()!.replace(/_/g, " ")} (${off})`;
    } catch {
      return tz;
    }
  };
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label={t("settings.language")} hint={t("settings.languageHint")}>
        {(id, desc) => (
          <Select id={id} aria-describedby={desc} value={value.lang} onChange={(e) => onChange({ lang: e.target.value as Locale })}>
            {LOCALES.map((l) => (
              <option key={l} value={l} lang={l}>
                {LOCALE_NAMES[l]}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <Field label={t("settings.country")} hint={t("settings.countryHint")}>
        {(id, desc) => (
          <Select
            id={id}
            aria-describedby={desc}
            value={value.country}
            onChange={(e) => {
              const c = e.target.value as CountryCode;
              const nr = region(c);
              onChange({ country: c, timeZone: nr.defaultTimeZone, currency: nr.currency, city: nr.cities[0] });
            }}
          >
            {COUNTRY_CODES.map((c) => (
              <option key={c} value={c}>
                {t(`countries.${c}`)}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <Field label={t("settings.city")} hint={t("settings.cityHint")}>
        {(id, desc) => (
          <Select id={id} aria-describedby={desc} value={value.city} onChange={(e) => onChange({ city: e.target.value })}>
            {r.cities.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <Field label={t("settings.timeZone")}>
        {(id) => (
          <Select id={id} value={value.timeZone} onChange={(e) => onChange({ timeZone: e.target.value })}>
            {r.timeZones.map((tz) => (
              <option key={tz} value={tz}>
                {tzLabel(tz)}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <Field label={t("settings.currency")} hint={t("settings.currencyHint")} className="sm:col-span-2">
        {(id, desc) => (
          <Select id={id} aria-describedby={desc} value={value.currency} onChange={(e) => onChange({ currency: e.target.value as CurrencyCode })}>
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c} — {t(`currencies.${c}`)}
              </option>
            ))}
          </Select>
        )}
      </Field>
    </div>
  );
}
