"use client";
import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Sparkles, GraduationCap, Store, WandSparkles, ChartColumnBig, Languages } from "lucide-react";
import { useStore } from "@/lib/store";
import { useI18n } from "@/i18n/I18nProvider";
import { LOCALES, LOCALE_NAMES } from "@/i18n/config";
import { Logo, Mosaic } from "@/components/ui/mosaic";
import { Avatar, Badge } from "@/components/ui/primitives";
import { ButtonLink } from "@/components/ui/button";
import { DEMO_ACCOUNTS } from "@/data/seed";
import type { Locale } from "@/lib/types";

const PILLARS = [
  { key: "feed", icon: Sparkles, color: "#f66483" },
  { key: "learn", icon: GraduationCap, color: "#ff9f00" },
  { key: "market", icon: Store, color: "#30b8b2" },
  { key: "studio", icon: WandSparkles, color: "#be6334" },
  { key: "dashboard", icon: ChartColumnBig, color: "#15484c" },
];

export default function Welcome() {
  const { state, meId, actions } = useStore();
  const { t, locale } = useI18n();
  const router = useRouter();
  useEffect(() => {
    if (meId) router.replace("/feed");
  }, [meId, router]);
  const d = state!.data;
  const gallery = ["/img/post-ceramic-plate.jpg", "/img/post-embroidered-eye.jpg", "/img/post-woodturning.jpg", "/img/post-wool-colors.jpg", "/img/post-marbled-book.jpg", "/img/post-felt-dragon.jpg"];

  return (
    <div className="min-h-dvh bg-bg">
      <header className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-5 sm:px-6">
        <Logo />
        <label className="relative flex items-center gap-2 rounded-xl border border-line bg-surface px-3 text-sm font-semibold text-ink">
          <Languages className="size-4 text-muted" />
          <span className="sr-only">{t("settings.language")}</span>
          <select value={locale} onChange={(e) => actions.setDeviceLang(e.target.value as Locale)} className="h-10 appearance-none bg-transparent pe-1 focus:outline-none">
            {LOCALES.map((l) => (
              <option key={l} value={l} lang={l}>
                {LOCALE_NAMES[l]}
              </option>
            ))}
          </select>
        </label>
      </header>

      <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-14 pt-4 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:pt-10">
        <div>
          <Badge tone="rust" className="mb-4">{t("welcome.kicker")}</Badge>
          <h1 className="font-display text-5xl leading-[1.02] text-ink sm:text-6xl lg:text-7xl">{t("welcome.title")}</h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted">{t("welcome.text")}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href="/onboarding" size="lg" variant="accent">
              {t("welcome.join")} <ArrowRight className="size-4" />
            </ButtonLink>
            <a href="#demo" className="inline-flex h-12 items-center rounded-xl border border-line bg-surface px-6 text-[15px] font-semibold text-ink hover:border-ink/40">
              {t("welcome.tryDemo")}
            </a>
          </div>
        </div>
        <div className="relative">
          <div className="absolute -inset-3 -z-0 overflow-hidden rounded-[28px] opacity-90">
            <Mosaic seed="hero" cols={10} rows={12} className="h-full w-full" />
          </div>
          <div className="relative grid grid-cols-3 gap-2.5 p-2.5">
            {gallery.map((src, i) => (
              <div key={src} className={`overflow-hidden rounded-xl bg-white p-1 shadow-lg ${i % 2 ? "translate-y-5" : ""}`} style={{ rotate: `${(i % 3) - 1}deg` }}>
                <Image src={src} alt="" width={260} height={300} priority={i < 3} className="aspect-[4/5] w-full rounded-lg object-cover" />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-line bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <h2 className="font-display text-3xl text-ink">{t("welcome.journeyTitle")}</h2>
          <p className="mt-2 max-w-2xl text-muted">{t("welcome.journeyText")}</p>
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {PILLARS.map(({ key, icon: Icon, color }) => (
              <div key={key} className="rounded-2xl border border-line bg-bg/60 p-4">
                <span className="mb-3 inline-flex size-10 items-center justify-center rounded-xl text-white" style={{ background: color }}>
                  <Icon className="size-5" />
                </span>
                <p className="font-bold text-ink">{t(`nav.${key}`)}</p>
                <p className="mt-1 text-sm text-muted">{t(`welcome.pillar.${key}`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="demo" className="mx-auto max-w-6xl scroll-mt-6 px-4 py-14 sm:px-6">
        <h2 className="font-display text-3xl text-ink">{t("welcome.demoTitle")}</h2>
        <p className="mt-2 max-w-2xl text-muted">{t("welcome.demoText")}</p>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {DEMO_ACCOUNTS.map((id) => {
            const u = d.users.find((x) => x.id === id)!;
            return (
              <button
                key={id}
                onClick={() => {
                  actions.login(id);
                  router.push("/feed");
                }}
                className="group flex flex-col rounded-2xl border border-line bg-surface p-5 text-start shadow-[var(--shadow-tile)] transition hover:-translate-y-0.5 hover:border-ink/40"
              >
                <div className="flex items-center gap-3">
                  <Avatar name={u.name} color={u.avatarColor} size={48} />
                  <div className="min-w-0">
                    <p className="truncate font-bold text-ink">{u.name}</p>
                    <p className="truncate text-sm text-muted">
                      {u.city} · {t(`demoRole.${u.demoRole}`)}
                    </p>
                  </div>
                </div>
                <p className="mt-4 flex-1 text-sm leading-relaxed text-muted">{t(`welcome.demo.${u.demoRole}`)}</p>
                <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-ink group-hover:text-rose-deep">
                  {t("welcome.signInAs")} <ArrowRight className="size-4" />
                </span>
              </button>
            );
          })}
        </div>
        <p className="mt-6 text-xs text-faint">
          {t("welcome.demoDisclaimer")}{" "}
          <Link href="/credits" className="underline">
            {t("welcome.photoCredits")}
          </Link>
        </p>
      </section>
    </div>
  );
}
