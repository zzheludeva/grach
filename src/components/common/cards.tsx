"use client";
import Link from "next/link";
import Image from "next/image";
import { Clock, MapPin, MonitorPlay, Users } from "lucide-react";
import { useStore } from "@/lib/store";
import { useI18n } from "@/i18n/I18nProvider";
import type { Product, Tutorial, Workshop, WorkshopSession } from "@/lib/types";
import { rating, userById, canShipTo } from "@/lib/selectors";
import { Badge, Stars } from "@/components/ui/primitives";
import { SaveButton } from "./actions";
import { cn } from "@/lib/utils";
import { nextSession, seatsLeft, sessionPhase, upcomingSessions } from "@/lib/workshops";

export function Price({ value, className }: { value: Product["price"]; className?: string }) {
  const { money, settings } = { ...useI18n(), settings: useStore().settings };
  const foreign = value.currency !== settings.currency;
  const { t } = useI18n();
  return (
    <span className={cn("nums inline-flex items-baseline gap-1.5", className)}>
      <span>{money(value)}</span>
      {foreign && (
        <span className="rounded bg-ink-soft px-1 text-[10px] font-bold uppercase tracking-wide text-muted" title={t("money.originalCurrency")}>
          {value.currency}
        </span>
      )}
    </span>
  );
}

export function ProductCard({ p }: { p: Product }) {
  const { state, settings } = useStore();
  const { t } = useI18n();
  const seller = userById(state!.data, p.sellerId);
  const ships = canShipTo(p, settings.country);
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-[var(--radius-tile)] border border-line bg-surface shadow-[var(--shadow-tile)]">
      <Link href={`/market/${p.id}`} className="relative block aspect-[4/5] overflow-hidden bg-line/40">
        <Image src={p.images[0]} alt={p.title} fill sizes="(max-width: 640px) 50vw, 25vw" className={cn("object-cover transition-transform duration-500 group-hover:scale-[1.04]", p.availability === "sold_out" && "grayscale-[60%]")} />
        <span className="absolute start-2 top-2 flex flex-col items-start gap-1">
          {p.availability === "made_to_order" && <Badge tone="glass">{t("product.madeToOrderShort", { count: p.makeDays ?? 0 })}</Badge>}
          {p.availability === "sold_out" && <Badge tone="dark">{t("product.soldOut")}</Badge>}
        </span>
      </Link>
      <SaveButton type="product" id={p.id} variant="glass" className="absolute end-2 top-2" />
      <div className="flex flex-1 flex-col p-3">
        <Link href={`/market/${p.id}`} className="line-clamp-2 text-sm font-bold leading-snug text-ink hover:underline" lang={p.lang}>
          {p.title}
        </Link>
        {seller && (
          <Link href={`/profile/${seller.username}`} className="mt-0.5 truncate text-xs text-muted hover:text-ink">
            {seller.name}
          </Link>
        )}
        <div className="mt-auto flex flex-wrap items-end justify-between gap-1 pt-2">
          <Price value={p.price} className="text-[15px] font-bold text-ink" />
          {!ships && <span className="text-[11px] font-semibold text-rust">{t("product.noShipShort")}</span>}
        </div>
      </div>
    </article>
  );
}

export function TutorialCard({ tut }: { tut: Tutorial }) {
  const { state } = useStore();
  const { t, cat, money } = useI18n();
  const author = userById(state!.data, tut.authorId);
  const r = rating(tut.reviews);
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-[var(--radius-tile)] border border-line bg-surface shadow-[var(--shadow-tile)]">
      <Link href={`/learn/tutorial/${tut.id}`} className="relative block aspect-[16/10] overflow-hidden bg-line/40">
        <Image src={tut.cover} alt={tut.title} fill sizes="(max-width: 640px) 100vw, 33vw" className="object-cover transition-transform duration-500 group-hover:scale-[1.04]" />
        <span className="absolute start-2 top-2 flex gap-1">
          <Badge tone="glass">{cat(tut.category)}</Badge>
          <Badge tone={tut.price ? "dark" : "success"}>{tut.price ? money(tut.price) : t("learn.free")}</Badge>
        </span>
      </Link>
      <SaveButton type="tutorial" id={tut.id} variant="glass" className="absolute end-2 top-2" />
      <div className="flex flex-1 flex-col p-3.5">
        <Link href={`/learn/tutorial/${tut.id}`} className="line-clamp-2 font-bold leading-snug text-ink hover:underline" lang={tut.lang}>
          {tut.title}
        </Link>
        {author && <p className="mt-0.5 truncate text-xs text-muted">{author.name}</p>}
        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-3 text-xs text-muted">
          <span className="inline-flex items-center gap-1">
            <span className={cn("size-2 rounded-full", tut.level === "beginner" ? "bg-teal" : tut.level === "intermediate" ? "bg-saffron" : "bg-rose")} />
            {t(`level.${tut.level}`)}
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock className="size-3.5" />
            {t("learn.minutes", { count: tut.durationMin })}
          </span>
          {r !== null && (
            <span className="inline-flex items-center gap-1">
              <Stars value={r} /> <span className="nums">{r}</span>
            </span>
          )}
        </div>
      </div>
    </article>
  );
}

/** Workshop template card: shows the nearest scheduled session (date, seats) if there is one. */
export function WorkshopCard({ w, enrolled, session }: { w: Workshop; enrolled?: boolean; session?: WorkshopSession }) {
  const { state } = useStore();
  const { t, money, date } = useI18n();
  const d = state!.data;
  const host = userById(d, w.hostId);
  const s = session ?? nextSession(d, w.id);
  const phase = s ? sessionPhase(s) : null;
  const left = s ? seatsLeft(d, s) : 0;
  const more = upcomingSessions(d, w.id).length - (s && phase === "upcoming" ? 1 : 0);
  const price = s?.price !== undefined ? s.price : w.price;
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-[var(--radius-tile)] border border-line bg-surface shadow-[var(--shadow-tile)] sm:flex-row">
      <Link href={`/learn/workshop/${w.id}${s ? `?session=${s.id}` : ""}`} className="relative block aspect-[16/10] shrink-0 overflow-hidden bg-line/40 sm:aspect-auto sm:w-56">
        <Image src={w.cover} alt={w.title} fill sizes="(max-width: 640px) 100vw, 224px" unoptimized={w.cover.startsWith("data:")} className="object-cover transition-transform duration-500 group-hover:scale-[1.04]" />
        {s && (
          <div className="absolute start-2 top-2 rounded-xl bg-white/95 px-2.5 py-1.5 text-center shadow-sm">
            <p className="text-[11px] font-bold uppercase text-rose-deep">{date(s.startsAt, "weekday").split(",")[0]}</p>
            <p className="nums text-sm font-bold leading-tight text-ink">{date(s.startsAt, "medium")}</p>
          </div>
        )}
      </Link>
      <SaveButton type="workshop" id={w.id} variant="glass" className="absolute end-2 top-2" />
      <div className="flex min-w-0 flex-1 flex-col p-4">
        <div className="mb-1.5 flex flex-wrap gap-1.5">
          <Badge tone={w.format === "online" ? "info" : "rust"}>
            {w.format === "online" ? <MonitorPlay className="size-3" /> : <MapPin className="size-3" />}
            {t(`workshop.${w.format}`)}
            {w.format === "offline" && (s?.city ?? w.city) ? ` · ${s?.city ?? w.city}` : ""}
          </Badge>
          {enrolled && phase !== "cancelled" && <Badge tone="success">{t("workshop.enrolled")}</Badge>}
          {phase && phase !== "upcoming" && <Badge tone={phase === "cancelled" ? "danger" : "neutral"}>{t(`ws.phase.${phase}`)}</Badge>}
          {w.status === "archived" && <Badge>{t("ws.status.archived")}</Badge>}
        </div>
        <Link href={`/learn/workshop/${w.id}`} className="line-clamp-2 font-bold leading-snug text-ink hover:underline" lang={w.lang}>
          {w.title}
        </Link>
        {host && <p className="mt-0.5 truncate text-xs text-muted">{t("workshop.host", { name: host.name })}</p>}
        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-3">
          <span className="nums text-[15px] font-bold text-ink">{price ? money(price) : t("learn.free")}</span>
          {s && phase === "upcoming" ? (
            <span className={cn("inline-flex items-center gap-1 text-xs font-semibold", left <= 0 ? "text-rose-deep" : left <= 3 ? "text-rust" : "text-muted")}>
              <Users className="size-3.5" />
              {left <= 0 ? t("workshop.full") : t("workshop.seatsLeft", { count: left })}
            </span>
          ) : !s ? (
            <span className="text-xs font-semibold text-muted">{t("ws.noDates")}</span>
          ) : null}
        </div>
        {s && (
          <p className="mt-1 text-xs text-faint">
            {date(s.startsAt, "time")} · {t("workshop.yourTime")}
            {more > 0 && <> · {t("ws.moreDates", { count: more })}</>}
          </p>
        )}
      </div>
    </article>
  );
}
