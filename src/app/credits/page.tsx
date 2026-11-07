"use client";
import Link from "next/link";
import credits from "@/data/credits.json";
import { useI18n } from "@/i18n/I18nProvider";
import { Logo } from "@/components/ui/mosaic";

export default function Credits() {
  const { t } = useI18n();
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link href="/">
        <Logo />
      </Link>
      <h1 className="mt-8 font-display text-4xl text-ink">{t("credits.title")}</h1>
      <p className="mt-2 text-muted">{t("credits.text")}</p>
      <ul className="mt-6 divide-y divide-line rounded-2xl border border-line bg-surface text-sm">
        {credits.map((c) => (
          <li key={c.file} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5">
            <img src={c.file} alt="" className="size-10 rounded-md object-cover" />
            <a href={c.source} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1 truncate font-semibold text-ink hover:underline">
              {c.title || c.file}
            </a>
            <span className="text-muted">{c.creator}</span>
            <span className="rounded bg-ink-soft px-1.5 text-xs font-semibold text-ink">{c.license}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
