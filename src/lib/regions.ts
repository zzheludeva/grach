import type { CountryCode, CurrencyCode } from "./types";

/**
 * Regional configuration. Add a country by adding an entry here (plus
 * translations for its field labels) — business logic reads only from this map.
 */
export interface AddressField {
  key: string;
  required: boolean;
  pattern?: RegExp;
  placeholder?: string;
  half?: boolean;
}

export interface DeliveryMethod {
  id: string;
  /** Demo shipping cost in the seller's currency — keyed by currency. */
  cost: Partial<Record<CurrencyCode, number>>;
  days: [number, number];
}

export interface RegionConfig {
  code: CountryCode;
  currency: CurrencyCode;
  /** Locale used only for number/currency/numeric-date patterns (no words). */
  formatLocale: string;
  timeZones: string[];
  defaultTimeZone: string;
  phone: { prefix: string; mask: string; pattern: RegExp; placeholder: string };
  addressFields: AddressField[];
  delivery: DeliveryMethod[];
  cities: string[];
}

export const REGIONS: Record<CountryCode, RegionConfig> = {
  RU: {
    code: "RU",
    currency: "RUB",
    formatLocale: "ru-RU",
    timeZones: [
      "Europe/Kaliningrad",
      "Europe/Moscow",
      "Europe/Samara",
      "Asia/Yekaterinburg",
      "Asia/Omsk",
      "Asia/Novosibirsk",
      "Asia/Krasnoyarsk",
      "Asia/Irkutsk",
      "Asia/Vladivostok",
    ],
    defaultTimeZone: "Europe/Moscow",
    phone: {
      prefix: "+7",
      mask: "+7 (###) ###-##-##",
      pattern: /^\+7 \(\d{3}\) \d{3}-\d{2}-\d{2}$/,
      placeholder: "+7 (900) 123-45-67",
    },
    addressFields: [
      { key: "postalCode", required: true, pattern: /^\d{6}$/, placeholder: "190000", half: true },
      { key: "region", required: true, placeholder: "", half: true },
      { key: "city", required: true },
      { key: "street", required: true },
      { key: "house", required: true, half: true },
      { key: "apartment", required: false, half: true },
    ],
    delivery: [
      { id: "post", cost: { RUB: 350 }, days: [5, 12] },
      { id: "pickup", cost: { RUB: 250 }, days: [3, 7] },
      { id: "courier", cost: { RUB: 600 }, days: [2, 4] },
    ],
    cities: ["Москва", "Санкт-Петербург", "Казань", "Пермь", "Екатеринбург", "Новосибирск", "Калининград"],
  },
  BR: {
    code: "BR",
    currency: "BRL",
    formatLocale: "pt-BR",
    timeZones: ["America/Sao_Paulo", "America/Bahia", "America/Manaus", "America/Fortaleza", "America/Cuiaba", "America/Noronha"],
    defaultTimeZone: "America/Sao_Paulo",
    phone: {
      prefix: "+55",
      mask: "+55 (##) #####-####",
      pattern: /^\+55 \(\d{2}\) \d{5}-\d{4}$/,
      placeholder: "+55 (11) 91234-5678",
    },
    addressFields: [
      { key: "cep", required: true, pattern: /^\d{5}-\d{3}$/, placeholder: "01310-100", half: true },
      { key: "state", required: true, pattern: /^[A-Z]{2}$/, placeholder: "SP", half: true },
      { key: "city", required: true },
      { key: "neighborhood", required: true },
      { key: "street", required: true },
      { key: "number", required: true, half: true },
      { key: "complement", required: false, half: true },
    ],
    delivery: [
      { id: "standard", cost: { BRL: 24.9, EUR: 14, GBP: 12 }, days: [6, 12] },
      { id: "express", cost: { BRL: 42.5, EUR: 28, GBP: 24 }, days: [2, 5] },
      { id: "pickup", cost: { BRL: 15.9 }, days: [4, 8] },
    ],
    cities: ["São Paulo", "Rio de Janeiro", "Belo Horizonte", "Porto Alegre", "Curitiba", "Salvador"],
  },
};

export const COUNTRY_CODES = Object.keys(REGIONS) as CountryCode[];

export function region(code: CountryCode): RegionConfig {
  return REGIONS[code] ?? REGIONS.RU;
}

/** Apply a "#"-mask to raw digits. */
export function applyPhoneMask(raw: string, mask: string, prefix: string) {
  const prefixDigits = prefix.replace(/\D/g, "");
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith(prefixDigits)) digits = digits.slice(prefixDigits.length);
  let out = "";
  let di = 0;
  const body = mask.slice(prefix.length);
  for (const ch of body) {
    if (di >= digits.length) break;
    if (ch === "#") out += digits[di++];
    else out += ch;
  }
  return prefix + out;
}

/** Ordered address lines for display in the region's conventional order. */
export function formatAddressLines(country: CountryCode, f: Record<string, string>): string[] {
  if (country === "BR") {
    return [
      [f.street, f.number].filter(Boolean).join(", ") + (f.complement ? ` — ${f.complement}` : ""),
      [f.neighborhood, `${f.city ?? ""} - ${f.state ?? ""}`].filter(Boolean).join(", "),
      `CEP ${f.cep ?? ""}`,
    ];
  }
  return [
    [f.street, f.house, f.apartment].filter(Boolean).join(", "),
    [f.city, f.region].filter(Boolean).join(", "),
    f.postalCode ?? "",
  ];
}

/**
 * Delivery cost for a seller's shipment. Returns null when the demo config has no
 * price for that currency — the UI then says the cost is unknown instead of inventing one.
 */
export function deliveryCost(country: CountryCode, methodId: string, currency: CurrencyCode): number | null {
  const m = region(country).delivery.find((d) => d.id === methodId);
  const v = m?.cost[currency];
  return v ?? null;
}
