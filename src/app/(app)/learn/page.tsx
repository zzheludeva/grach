"use client";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { MapPin } from "lucide-react";
import { useStore } from "@/lib/store";
import { useI18n } from "@/i18n/I18nProvider";
import { CATEGORIES } from "@/i18n/content";
import { Chip, EmptyState, PageHeader, Select, Tabs, SectionTitle } from "@/components/ui/primitives";
import { TutorialCard, WorkshopCard } from "@/components/common/cards";
import { region } from "@/lib/regions";
import type { CategoryId, Enrollment, Level, Workshop, WorkshopSession } from "@/lib/types";
import { upcomingSessions } from "@/lib/workshops";
import { Button } from "@/components/ui/button";

type Tab = "materials" | "workshops" | "mine";

export default function Learn() {
  const sp = useSearchParams();
  const { state, meId, settings, actions } = useStore();
  const { t, cat } = useI18n();
  const d = state!.data;
  const [tab, setTab] = useState<Tab>((["materials", "workshops", "mine"].includes(sp.get("tab") ?? "") ? sp.get("tab") : "materials") as Tab);
  const [category, setCategory] = useState<CategoryId | "">("");
  const [level, setLevel] = useState<Level | "">("");
  const [duration, setDuration] = useState<"" | "short" | "mid" | "long">("");
  const [price, setPrice] = useState<"" | "free" | "paid">("");
  const [format, setFormat] = useState<"" | "online" | "offline">("");
  const [cityOnly, setCityOnly] = useState(true);

  const tutorials = useMemo(
    () =>
      d.tutorials.filter(
        (x) =>
          x.status === "published" &&
          (!category || x.category === category) &&
          (!level || x.level === level) &&
          (!price || (price === "free" ? !x.price : !!x.price)) &&
          (!duration || (duration === "short" ? x.durationMin <= 30 : duration === "mid" ? x.durationMin > 30 && x.durationMin <= 90 : x.durationMin > 90)),
      ),
    [d, category, level, duration, price],
  );
  // Templates with at least one upcoming date; city relevance uses the session's city.
  const workshops = useMemo(
    () =>
      d.workshops
        .filter((w) => w.status === "published")
        .map((w) => ({ w, s: upcomingSessions(d, w.id).find((s) => w.format === "online" || !cityOnly || s.city === settings.city) }))
        .filter((x): x is { w: Workshop; s: WorkshopSession } => !!x.s)
        .filter(({ w, s }) => (!category || w.category === category) && (!price || (price === "free" ? !s.price : !!s.price)) && (!format || w.format === format))
        .sort((a, b) => a.s.startsAt.localeCompare(b.s.startsAt)),
    [d, category, price, format, cityOnly, settings.city],
  );
  const myBookings = d.enrollments
    .filter((e) => e.userId === meId)
    .map((e) => ({ e, w: d.workshops.find((w) => w.id === e.workshopId), s: d.sessions.find((s) => s.id === e.sessionId) }))
    .filter((x): x is { e: Enrollment; w: Workshop; s: WorkshopSession } => !!x.w && !!x.s)
    .sort((a, b) => a.s.startsAt.localeCompare(b.s.startsAt));
  const myWorkshops = myBookings;
  const myTutorials = d.tutorialPurchases.filter((p) => p.userId === meId).map((p) => d.tutorials.find((x) => x.id === p.tutorialId)!).filter(Boolean);
  const enrolledIds = new Set(myBookings.map((x) => x.e.sessionId));
  const offlineElsewhere = d.sessions.filter((s) => s.format === "offline" && s.status === "scheduled" && s.city !== settings.city && new Date(s.startsAt).getTime() > Date.now()).length;

  const reset = () => {
    setCategory("");
    setLevel("");
    setDuration("");
    setPrice("");
    setFormat("");
  };

  return (
    <div>
      <PageHeader title={t("learn.title")} subtitle={t("learn.subtitle")} />
      <Tabs
        value={tab}
        onChange={(v) => {
          setTab(v);
          history.replaceState(null, "", `?tab=${v}`);
        }}
        items={[
          { value: "materials", label: t("learn.materials"), count: d.tutorials.filter((x) => x.status === "published").length },
          { value: "workshops", label: t("learn.workshops") },
          { value: "mine", label: t("learn.mine"), count: myWorkshops.length + myTutorials.length },
        ]}
        className="mb-5 w-fit"
      />

      {tab !== "mine" && (
        <div className="mb-6 space-y-3">
          <div className="scrollbar-none -mx-1 flex gap-2 overflow-x-auto px-1">
            <Chip active={!category} onClick={() => setCategory("")}>
              {t("feed.all")}
            </Chip>
            {CATEGORIES.map((c) => (
              <Chip
                key={c.id}
                color={c.color}
                active={category === c.id}
                onClick={() => {
                  setCategory(c.id);
                  actions.viewCategory(c.id);
                }}
              >
                {cat(c.id)}
              </Chip>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            {tab === "materials" ? (
              <>
                <Select value={level} onChange={(e) => setLevel(e.target.value as Level)} aria-label={t("learn.level")} className="sm:w-48">
                  <option value="">{t("learn.anyLevel")}</option>
                  {(["beginner", "intermediate", "advanced"] as Level[]).map((l) => (
                    <option key={l} value={l}>
                      {t(`level.${l}`)}
                    </option>
                  ))}
                </Select>
                <Select value={duration} onChange={(e) => setDuration(e.target.value as typeof duration)} aria-label={t("learn.duration")} className="sm:w-48">
                  <option value="">{t("learn.anyDuration")}</option>
                  <option value="short">{t("learn.short")}</option>
                  <option value="mid">{t("learn.mid")}</option>
                  <option value="long">{t("learn.long")}</option>
                </Select>
              </>
            ) : (
              <Select value={format} onChange={(e) => setFormat(e.target.value as typeof format)} aria-label={t("learn.format")} className="sm:w-48">
                <option value="">{t("learn.anyFormat")}</option>
                <option value="online">{t("workshop.online")}</option>
                <option value="offline">{t("workshop.offline")}</option>
              </Select>
            )}
            <Select value={price} onChange={(e) => setPrice(e.target.value as typeof price)} aria-label={t("learn.price")} className="sm:w-44">
              <option value="">{t("learn.anyPrice")}</option>
              <option value="free">{t("learn.free")}</option>
              <option value="paid">{t("learn.paid")}</option>
            </Select>
          </div>
          {tab === "workshops" && (
            <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3 text-sm">
              <MapPin className="size-4 text-rust" />
              <span className="text-muted">{t("learn.yourCity")}</span>
              <Select
                value={settings.city}
                onChange={(e) => actions.updateSettings({ city: e.target.value })}
                aria-label={t("settings.city")}
                className="h-9 w-auto min-w-40"
              >
                {region(settings.country).cities.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </Select>
              <label className="ms-auto inline-flex cursor-pointer items-center gap-2 font-semibold text-ink">
                <input type="checkbox" checked={!cityOnly} onChange={(e) => setCityOnly(!e.target.checked)} className="size-4 accent-ink" />
                {t("learn.showAllCities", { count: offlineElsewhere })}
              </label>
            </div>
          )}
        </div>
      )}

      {tab === "materials" &&
        (tutorials.length ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {tutorials.map((x) => (
              <TutorialCard key={x.id} tut={x} />
            ))}
          </div>
        ) : (
          <EmptyState title={t("learn.noResults")} action={<Button onClick={reset}>{t("feed.resetFilter")}</Button>} />
        ))}
      {tab === "workshops" &&
        (workshops.length ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {workshops.map(({ w, s }) => (
              <WorkshopCard key={w.id} w={w} session={s} enrolled={enrolledIds.has(s.id)} />
            ))}
          </div>
        ) : (
          <EmptyState
            title={t("learn.noWorkshops")}
            text={t("learn.noWorkshopsText", { city: settings.city })}
            action={
              <Button
                onClick={() => {
                  setCityOnly(false);
                  reset();
                }}
              >
                {t("learn.showAllCitiesShort")}
              </Button>
            }
          />
        ))}
      {tab === "mine" && (
        <div className="space-y-8">
          <section>
            <SectionTitle>{t("learn.myWorkshops")}</SectionTitle>
            {myWorkshops.length ? (
              <div className="grid gap-4 lg:grid-cols-2">
                {myWorkshops.map(({ e, w, s }) => (
                  <WorkshopCard key={e.id} w={w} session={s} enrolled />
                ))}
              </div>
            ) : (
              <EmptyState title={t("learn.noEnrollments")} action={<Button onClick={() => setTab("workshops")}>{t("learn.workshops")}</Button>} />
            )}
          </section>
          <section>
            <SectionTitle>{t("learn.myTutorials")}</SectionTitle>
            {myTutorials.length ? (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {myTutorials.map((x) => (
                  <TutorialCard key={x.id} tut={x} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted">{t("learn.noPurchases")}</p>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
