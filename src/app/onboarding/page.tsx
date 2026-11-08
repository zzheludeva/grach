"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, Eye, EyeOff } from "lucide-react";
import { useStore } from "@/lib/store";
import { useI18n } from "@/i18n/I18nProvider";
import { CATEGORIES } from "@/i18n/content";
import { Logo, Mosaic } from "@/components/ui/mosaic";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea, Avatar, DemoNote, Select } from "@/components/ui/primitives";
import { RegionFields } from "@/components/settings/RegionFields";
import { region, REGIONS } from "@/lib/regions";
import type { AuthorStatus, CategoryId, CountryCode, Goal, Settings } from "@/lib/types";
import { cn } from "@/lib/utils";

const GOALS: Goal[] = ["inspiration", "skills", "share", "sell", "community"];
const COLORS = ["#f66483", "#ff9f00", "#be6334", "#15484c", "#30b8b2"];
const STATUSES: AuthorStatus[] = ["hobbyist", "independent", "pro"];

function guessSettings(lang: Settings["lang"]): Settings {
  let tz = "Europe/Moscow";
  try {
    tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {}
  // Suggest the country whose time zones include the browser zone; language stays independent.
  const country = (Object.keys(REGIONS) as CountryCode[]).find((c) => REGIONS[c].timeZones.includes(tz)) ?? "RU";
  const r = region(country);
  return { lang, country, timeZone: r.timeZones.includes(tz) ? tz : r.defaultTimeZone, currency: r.currency, city: r.cities[0] };
}

export default function Onboarding() {
  const { state, actions } = useStore();
  const { t, cat, locale } = useI18n();
  const router = useRouter();
  const d = state!.data;
  const [step, setStep] = useState(0);
  const [showPw, setShowPw] = useState(false);
  const [f, setF] = useState({ email: "", password: "", name: "", username: "" });
  const [interests, setInterests] = useState<CategoryId[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [profile, setProfile] = useState({ bio: "", status: "hobbyist" as AuthorStatus, color: COLORS[0], skills: "" });
  const [settings, setSettings] = useState<Settings>(() => guessSettings(locale));
  const [errors, setErrors] = useState<Record<string, string>>({});

  const steps = [t("onb.s1"), t("onb.s2"), t("onb.s3"), t("onb.s4"), t("onb.s5")];

  const validate1 = () => {
    const e: Record<string, string> = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) e.email = t("validation.email");
    if (f.password.length < 8) e.password = t("validation.password", { count: 8 });
    if (f.name.trim().length < 2) e.name = t("validation.minLength", { count: 2 });
    if (!/^[a-z0-9._]{3,24}$/.test(f.username)) e.username = t("validation.username");
    else if (d.users.some((u) => u.username === f.username)) e.username = t("validation.usernameTaken");
    setErrors(e);
    return !Object.keys(e).length;
  };

  const next = () => {
    if (step === 0 && !validate1()) return;
    if (step === 1 && interests.length === 0) {
      setErrors({ interests: t("onb.pickOne") });
      return;
    }
    if (step === 2 && goals.length === 0) {
      setErrors({ goals: t("onb.pickOne") });
      return;
    }
    setErrors({});
    if (step < 4) setStep(step + 1);
    else finish();
  };

  const finish = () => {
    actions.register(
      {
        username: f.username,
        name: f.name.trim(),
        email: f.email,
        avatarColor: profile.color,
        bio: profile.bio.trim(),
        city: settings.city,
        country: settings.country,
        interests,
        skills: profile.skills.split(",").map((s) => s.trim()).filter(Boolean),
        links: [],
        status: profile.status,
        goals,
        contentLang: settings.lang,
      },
      settings,
    );
    router.push("/feed");
  };

  const toggle = <T,>(arr: T[], v: T) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  const samples = useMemo(() => Object.fromEntries(CATEGORIES.map((c) => [c.id, d.posts.find((p) => p.category === c.id)?.images[0]])), [d]);

  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,440px)_1fr]">
      <aside className="relative hidden overflow-hidden lg:block">
        <Mosaic seed={`onb-${step}`} cols={9} rows={16} className="absolute inset-0 h-full w-full" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink-deep/90 via-ink-deep/30 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-10 text-white">
          <p className="font-display text-4xl leading-tight">{t("welcome.title")}</p>
          <p className="mt-3 text-white/80">{t(`onb.side${step + 1}`)}</p>
        </div>
      </aside>
      <main className="flex min-w-0 flex-col px-4 py-6 sm:px-10">
        <div className="flex items-center justify-between">
          <Link href="/welcome" aria-label="GRACH">
            <Logo />
          </Link>
          <span className="text-sm font-semibold text-muted">{t("onb.stepOf", { step: step + 1, total: 5 })}</span>
        </div>
        <ol className="mt-6 flex gap-1.5" aria-label={t("onb.progress")}>
          {steps.map((s, i) => (
            <li key={s} className="flex-1">
              <span className={cn("block h-1.5 rounded-full", i <= step ? "bg-ink" : "bg-line")} />
              <span className={cn("mt-2 hidden truncate text-xs font-semibold sm:block", i === step ? "text-ink" : "text-faint")}>{s}</span>
            </li>
          ))}
        </ol>

        <div className="mx-auto w-full max-w-2xl flex-1 py-8">
          {step === 0 && (
            <section className="animate-fade-up">
              <h1 className="font-display text-4xl text-ink">{t("onb.t1")}</h1>
              <p className="mt-2 text-muted">{t("onb.d1")}</p>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <Field label={t("onb.email")} error={errors.email} className="sm:col-span-2">
                  {(id, desc) => <Input id={id} type="email" autoComplete="email" aria-describedby={desc} aria-invalid={!!errors.email} value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />}
                </Field>
                <Field label={t("onb.password")} error={errors.password} hint={t("onb.passwordHint")} className="sm:col-span-2">
                  {(id, desc) => (
                    <div className="relative">
                      <Input id={id} type={showPw ? "text" : "password"} autoComplete="new-password" aria-describedby={desc} aria-invalid={!!errors.password} value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} className="pe-11" />
                      <button type="button" onClick={() => setShowPw((v) => !v)} className="absolute end-1 top-1/2 -translate-y-1/2 rounded-lg p-2 text-muted hover:text-ink" aria-label={showPw ? t("onb.hidePw") : t("onb.showPw")}>
                        {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                  )}
                </Field>
                <Field label={t("onb.name")} error={errors.name}>
                  {(id, desc) => <Input id={id} autoComplete="name" aria-describedby={desc} aria-invalid={!!errors.name} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />}
                </Field>
                <Field label={t("onb.username")} error={errors.username} hint={t("onb.usernameHint")}>
                  {(id, desc) => (
                    <div className="relative">
                      <span className="pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2 text-faint">@</span>
                      <Input id={id} aria-describedby={desc} aria-invalid={!!errors.username} value={f.username} onChange={(e) => setF({ ...f, username: e.target.value.toLowerCase().replace(/\s/g, "") })} className="ps-8" />
                    </div>
                  )}
                </Field>
              </div>
              <DemoNote className="mt-6">{t("onb.demoAuth")}</DemoNote>
            </section>
          )}

          {step === 1 && (
            <section className="animate-fade-up">
              <h1 className="font-display text-4xl text-ink">{t("onb.t2")}</h1>
              <p className="mt-2 text-muted">{t("onb.d2")}</p>
              <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {CATEGORIES.map((c) => {
                  const on = interests.includes(c.id);
                  const img = samples[c.id];
                  return (
                    <button
                      key={c.id}
                      onClick={() => setInterests(toggle(interests, c.id))}
                      aria-pressed={on}
                      className={cn("group relative h-28 overflow-hidden rounded-2xl border-2 text-start transition", on ? "border-ink" : "border-transparent")}
                      style={{ background: c.color }}
                    >
                      {img && <img src={img} alt="" className="absolute inset-0 h-full w-full object-cover opacity-80 transition group-hover:scale-105" />}
                      <span className="absolute inset-0 bg-gradient-to-t from-ink-deep/85 to-transparent" />
                      <span className="absolute inset-x-3 bottom-2.5 text-sm font-bold leading-tight text-white">{cat(c.id)}</span>
                      {on && (
                        <span className="absolute end-2 top-2 flex size-7 items-center justify-center rounded-full bg-saffron text-ink-deep">
                          <Check className="size-4" />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              {errors.interests && <p className="mt-3 text-sm font-semibold text-rose-deep">{errors.interests}</p>}
            </section>
          )}

          {step === 2 && (
            <section className="animate-fade-up">
              <h1 className="font-display text-4xl text-ink">{t("onb.t3")}</h1>
              <p className="mt-2 text-muted">{t("onb.d3")}</p>
              <div className="mt-6 space-y-2.5">
                {GOALS.map((g, i) => {
                  const on = goals.includes(g);
                  return (
                    <button
                      key={g}
                      onClick={() => setGoals(toggle(goals, g))}
                      aria-pressed={on}
                      className={cn("flex w-full items-center gap-4 rounded-2xl border bg-surface p-4 text-start transition", on ? "border-ink ring-2 ring-ink/10" : "border-line hover:border-ink/40")}
                    >
                      <span className="size-8 shrink-0 rotate-6 rounded-lg" style={{ background: COLORS[i] }} />
                      <span className="min-w-0 flex-1">
                        <span className="block font-bold text-ink">{t(`goals.${g}`)}</span>
                        <span className="block text-sm text-muted">{t(`goalsHint.${g}`)}</span>
                      </span>
                      <span className={cn("flex size-6 shrink-0 items-center justify-center rounded-md border", on ? "border-ink bg-ink text-white" : "border-line")}>{on && <Check className="size-4" />}</span>
                    </button>
                  );
                })}
              </div>
              {errors.goals && <p className="mt-3 text-sm font-semibold text-rose-deep">{errors.goals}</p>}
            </section>
          )}

          {step === 3 && (
            <section className="animate-fade-up">
              <h1 className="font-display text-4xl text-ink">{t("onb.t4")}</h1>
              <p className="mt-2 text-muted">{t("onb.d4")}</p>
              <div className="mt-6 flex items-center gap-4">
                <Avatar name={f.name || "?"} color={profile.color} size={72} />
                <div>
                  <p className="mb-2 text-[13px] font-semibold text-ink">{t("profile.avatarColor")}</p>
                  <div className="flex gap-2">
                    {COLORS.map((c) => (
                      <button key={c} onClick={() => setProfile({ ...profile, color: c })} className={cn("size-8 rounded-full ring-offset-2", profile.color === c && "ring-2 ring-ink")} style={{ background: c }} aria-label={c} aria-pressed={profile.color === c} />
                    ))}
                  </div>
                </div>
              </div>
              <div className="mt-6 grid gap-4">
                <Field label={t("profile.bio")} hint={t("profile.bioHint")}>
                  {(id, desc) => <Textarea id={id} aria-describedby={desc} rows={3} maxLength={240} value={profile.bio} onChange={(e) => setProfile({ ...profile, bio: e.target.value })} />}
                </Field>
                <Field label={t("profile.skills")} hint={t("profile.skillsHint")}>
                  {(id, desc) => <Input id={id} aria-describedby={desc} value={profile.skills} onChange={(e) => setProfile({ ...profile, skills: e.target.value })} />}
                </Field>
                <Field label={t("profile.status")}>
                  {(id) => (
                    <Select id={id} value={profile.status} onChange={(e) => setProfile({ ...profile, status: e.target.value as AuthorStatus })}>
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {t(`status.${s}`)}
                        </option>
                      ))}
                    </Select>
                  )}
                </Field>
              </div>
            </section>
          )}

          {step === 4 && (
            <section className="animate-fade-up">
              <h1 className="font-display text-4xl text-ink">{t("onb.t5")}</h1>
              <p className="mt-2 text-muted">{t("onb.d5")}</p>
              <div className="mt-6">
                <RegionFields
                  value={settings}
                  onChange={(p) => {
                    setSettings((s) => ({ ...s, ...p }));
                    if (p.lang) actions.setDeviceLang(p.lang);
                  }}
                />
              </div>
              <DemoNote className="mt-6">{t("onb.regionNote")}</DemoNote>
            </section>
          )}
        </div>

        <div className="mx-auto flex w-full max-w-2xl items-center justify-between gap-3 border-t border-line pt-5">
          {step > 0 ? (
            <Button variant="ghost" onClick={() => setStep(step - 1)}>
              <ArrowLeft className="size-4" /> {t("common.back")}
            </Button>
          ) : (
            <Link href="/welcome" className="text-sm font-semibold text-muted hover:text-ink">
              {t("onb.haveDemo")}
            </Link>
          )}
          <Button onClick={next} size="lg" variant={step === 4 ? "accent" : "primary"}>
            {step === 4 ? t("onb.finish") : t("common.next")} <ArrowRight className="size-4" />
          </Button>
        </div>
      </main>
    </div>
  );
}
