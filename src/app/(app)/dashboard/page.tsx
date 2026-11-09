"use client";
import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Coins, Eye, Heart, Lightbulb, Package, ShoppingBag, TrendingUp, Users, Table2, ChartColumnBig, FastForward, Store, GraduationCap, Plus, Info } from "lucide-react";
import { useStore } from "@/lib/store";
import { useI18n } from "@/i18n/I18nProvider";
import { authorAnalytics } from "@/lib/analytics";
import { Badge, Card, DemoNote, EmptyState, PageHeader, SectionTitle, Tabs } from "@/components/ui/primitives";
import { Button, ButtonLink } from "@/components/ui/button";
import { FollowersChart, IncomeChart, SERIES } from "@/components/dashboard/Charts";
import { STATUS_TONE, sellerNext, pendingReady, nextStep, bucketOf } from "@/lib/orders";
import { nextSession, seatsTaken } from "@/lib/workshops";
import { orderLabelKey } from "@/components/common/OrderStatusBadge";
import { userById } from "@/lib/selectors";
import { useShell } from "@/components/shell/AppShell";
import { useToast } from "@/components/ui/toast";
import type { CurrencyCode } from "@/lib/types";

export default function Dashboard() {
  const { state, me, meId, settings, actions } = useStore();
  const { t, money, num, cat, date, relative } = useI18n();
  const { openComposer } = useShell();
  const toast = useToast();
  const d = state!.data;
  const [period, setPeriod] = useState<"30" | "90" | "180">("90");
  const [view, setView] = useState<"chart" | "table">("chart");
  const currency: CurrencyCode = d.products.find((p) => p.sellerId === meId)?.price.currency ?? d.tutorials.find((x) => x.authorId === meId && x.price)?.price?.currency ?? settings.currency;
  const a = useMemo(() => authorAnalytics(d, meId!, Number(period), currency), [d, meId, period, currency]);
  const monthLabel = (dt: Date) => new Intl.DateTimeFormat(t("meta.code"), { month: "short" }).format(dt);
  const chartData = a.months.map((m) => ({ label: monthLabel(m.date), products: m.products, workshops: m.workshops, tutorials: m.tutorials }));
  const followerData = a.followerSeries.map((f) => ({ label: monthLabel(new Date(f.date)), count: f.count }));

  const recs = useMemo(() => {
    const r: { title: string; text: string; basis: string; href?: string }[] = [];
    const topSaved = [...a.productStats].sort((x, y) => y.saves + y.orders * 2 - (x.saves + x.orders * 2))[0];
    if (topSaved && (topSaved.saves || topSaved.orders))
      r.push({ title: t("dashboard.rec.productTitle", { title: topSaved.p.title }), text: t("dashboard.rec.productText"), basis: t("dashboard.rec.productBasis", { orders: topSaved.orders, saves: topSaved.saves }), href: `/market/${topSaved.p.id}` });
    const lowConv = a.productStats.find((x) => x.views > 800 && x.orders <= 1);
    if (lowConv) r.push({ title: t("dashboard.rec.convTitle", { title: lowConv.p.title }), text: t("dashboard.rec.convText"), basis: t("dashboard.rec.convBasis", { views: lowConv.views, orders: lowConv.orders }), href: `/market/${lowConv.p.id}` });
    if (a.catInterest[0]) r.push({ title: t("dashboard.rec.catTitle", { cat: cat(a.catInterest[0][0] as never) }), text: t("dashboard.rec.catText"), basis: t("dashboard.rec.catBasis") });
    const topPost = a.postStats[0];
    if (topPost) r.push({ title: t("dashboard.rec.postTitle", { title: topPost.p.title }), text: t("dashboard.rec.postText"), basis: t("dashboard.rec.postBasis", { likes: topPost.likes, comments: topPost.comments }), href: `/post/${topPost.p.id}` });
    const tip = a.postStats.find((x) => x.p.kind === "tip");
    const soldTut = a.myTutorials.map((tu) => ({ tu, n: d.tutorialPurchases.filter((p) => p.tutorialId === tu.id).length })).sort((x, y) => y.n - x.n)[0];
    if (soldTut && soldTut.n > 0) r.push({ title: t("dashboard.rec.wsTitle"), text: t("dashboard.rec.wsTextTutorial", { title: soldTut.tu.title, count: soldTut.n }), basis: t("dashboard.rec.wsBasis") });
    else if (tip) r.push({ title: t("dashboard.rec.wsTitle"), text: t("dashboard.rec.wsTextTip", { title: tip.p.title }), basis: t("dashboard.rec.wsBasis") });
    return r;
  }, [a, d, t, cat]);

  // Orders that still need work (completed and cancelled ones are in "Sales").
  const activeOrders = a.incoming.filter((o) => bucketOf(o.status) === "active");

  const kpis = [
    { icon: Coins, label: t("dashboard.kIncome"), value: money({ amount: a.income.total, currency }), hint: t("dashboard.forPeriod") },
    { icon: ShoppingBag, label: t("dashboard.kSales"), value: num(a.units), hint: t("dashboard.unitsSold") },
    { icon: Package, label: t("dashboard.kOrders"), value: num(a.ordersCount), hint: t("dashboard.forPeriod") },
    { icon: TrendingUp, label: t("dashboard.kAvg"), value: a.ordersCount ? money({ amount: Math.round(a.avgCheck), currency }) : "—", hint: t("dashboard.products") },
    { icon: Users, label: t("dashboard.kFollowers"), value: num(a.followers), hint: t("dashboard.newFollowers", { count: a.newFollowers }) },
    { icon: Eye, label: t("dashboard.kViews"), value: num(a.totalViews), hint: t("dashboard.engagement", { value: num(a.engagement * 100, { maximumFractionDigits: 1 }) }) },
  ];

  return (
    <div>
      <PageHeader
        title={t("dashboard.title")}
        subtitle={t("dashboard.subtitle")}
        actions={
          <Tabs
            size="sm"
            value={period}
            onChange={setPeriod}
            items={[
              { value: "30", label: t("dashboard.p30") },
              { value: "90", label: t("dashboard.p90") },
              { value: "180", label: t("dashboard.p180") },
            ]}
          />
        }
      />
      <DemoNote className="mb-5">{t("dashboard.dataNote")}</DemoNote>

      {!a.hasCommerce && (
        <Card className="mb-6 overflow-hidden">
          <div className="grid gap-0 md:grid-cols-[1fr_1.2fr]">
            <div className="grout p-6 text-white">
              <p className="font-display text-3xl">{t("dashboard.startTitle")}</p>
              <p className="mt-2 text-sm text-white/75">{t("dashboard.startText")}</p>
            </div>
            <div className="grid gap-3 p-5 sm:grid-cols-3">
              <button onClick={() => openComposer()} className="rounded-2xl border border-line p-4 text-start hover:border-ink/40">
                <Plus className="mb-2 size-5 text-rose" />
                <p className="font-bold text-ink">{t("dashboard.step1")}</p>
                <p className="text-xs text-muted">{t("dashboard.step1Text")}</p>
              </button>
              <Link href="/dashboard/products/new" className="rounded-2xl border border-line p-4 hover:border-ink/40">
                <Store className="mb-2 size-5 text-teal" />
                <p className="font-bold text-ink">{t("dashboard.step2")}</p>
                <p className="text-xs text-muted">{t("dashboard.step2Text")}</p>
              </Link>
              <Link href="/dashboard/workshops/new" className="rounded-2xl border border-line p-4 hover:border-ink/40">
                <GraduationCap className="mb-2 size-5 text-saffron" />
                <p className="font-bold text-ink">{t("dashboard.step3")}</p>
                <p className="text-xs text-muted">{t("dashboard.step3Text")}</p>
              </Link>
            </div>
          </div>
        </Card>
      )}

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {kpis.map(({ icon: Icon, label, value, hint }) => (
          <Card key={label} className="p-4">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-muted">
              <Icon className="size-3.5" /> <span className="truncate">{label}</span>
            </p>
            <p className="nums mt-1.5 truncate text-xl font-bold text-ink sm:text-2xl">{value}</p>
            <p className="truncate text-[11px] text-faint">{hint}</p>
          </Card>
        ))}
      </div>
      {a.otherCurrencySales > 0 && <p className="-mt-3 mb-5 text-xs text-faint">{t("dashboard.otherCurrency", { count: a.otherCurrencySales, currency })}</p>}

      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr] [&>*]:min-w-0">
        <Card className="p-5">
          <SectionTitle
            action={
              <div className="flex gap-1">
                <button onClick={() => setView("chart")} aria-pressed={view === "chart"} aria-label={t("dashboard.chartView")} className={`rounded-lg p-1.5 ${view === "chart" ? "bg-ink-soft text-ink" : "text-faint"}`}>
                  <ChartColumnBig className="size-4" />
                </button>
                <button onClick={() => setView("table")} aria-pressed={view === "table"} aria-label={t("dashboard.tableView")} className={`rounded-lg p-1.5 ${view === "table" ? "bg-ink-soft text-ink" : "text-faint"}`}>
                  <Table2 className="size-4" />
                </button>
              </div>
            }
          >
            {t("dashboard.incomeBySource")}
          </SectionTitle>
          <div className="mb-3 flex flex-wrap gap-x-5 gap-y-2 text-sm">
            {SERIES.map((s) => (
              <span key={s.key} className="inline-flex items-center gap-2">
                <span className="size-3 rounded-[3px]" style={{ background: s.color }} />
                <span className="text-muted">{t(`dashboard.src.${s.key}`)}</span>
                <b className="nums text-ink">{money({ amount: a.income[s.key], currency })}</b>
              </span>
            ))}
          </div>
          {view === "chart" ? (
            <IncomeChart data={chartData} currency={currency} />
          ) : (
            <div className="overflow-x-auto">
              <table className="nums w-full text-sm">
                <thead>
                  <tr className="text-start text-xs text-faint">
                    <th className="py-2 text-start font-semibold">{t("dashboard.month")}</th>
                    {SERIES.map((s) => (
                      <th key={s.key} className="py-2 text-end font-semibold">{t(`dashboard.src.${s.key}`)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {chartData.map((r) => (
                    <tr key={r.label}>
                      <td className="py-2 text-ink">{r.label}</td>
                      {SERIES.map((s) => (
                        <td key={s.key} className="py-2 text-end">{money({ amount: r[s.key], currency })}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="mt-2 text-xs text-faint">{t("dashboard.chartNote", { currency })}</p>
        </Card>

        <Card className="p-4 sm:p-5">
          <SectionTitle action={<ButtonLink href="/orders?role=seller" variant="ghost" size="sm">{t("nav2.allSales")}</ButtonLink>}>{t("dashboard.incoming")}</SectionTitle>
          {activeOrders.length === 0 ? (
            <p className="text-sm text-muted">{t("dashboard.noIncoming")}</p>
          ) : (
            <ul className="divide-y divide-line">
              {[...activeOrders].sort((x, y) => Number(nextStep(y).who === "seller") - Number(nextStep(x).who === "seller")).slice(0, 6).map((o) => {
                const buyer = userById(d, o.buyerId);
                const n = sellerNext(o);
                const waiting = pendingReady(o);
                return (
                  <li key={o.id} className="flex flex-wrap items-center gap-2 py-2.5">
                    <div className="min-w-0 flex-1 basis-48">
                      <p className="nums text-sm font-bold text-ink">
                        {o.number} <span className="font-normal text-muted">· {buyer?.name}</span>
                      </p>
                      <p className="truncate text-xs text-muted">
                        {o.items.map((i) => `${i.title} ×${i.qty}`).join(", ")} · {relative(o.createdAt)}
                      </p>
                    </div>
                    <span className="nums text-sm font-semibold">{money(o.total)}</span>
                    <Badge tone={STATUS_TONE[o.status]}>{t(orderLabelKey(o))}</Badge>
                    {waiting && <Badge tone="warn">{t("ord.awaitingBuyer")}</Badge>}
                    {/* Steps with proof (photos, tracking) are done on the order page. */}
                    <ButtonLink href={`/orders/${o.id}`} size="sm" variant={n ? "soft" : "ghost"}>
                      {n ? <FastForward className="size-3.5" /> : null} {n ? (n === "ready" ? t("ordx.action.ready") : t(`ord.action.${n}`)) : t("ord.open")}
                    </ButtonLink>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2 [&>*]:min-w-0">
        <Card className="p-5">
          <SectionTitle>{t("dashboard.salesTitle")}</SectionTitle>
          {a.productStats.length === 0 ? (
            <EmptyState title={t("dashboard.noProducts")} className="py-8" />
          ) : (
            <div className="overflow-x-auto">
              <table className="nums w-full min-w-[460px] text-sm">
                <thead>
                  <tr className="text-xs text-faint">
                    <th className="py-2 text-start font-semibold">{t("dashboard.product")}</th>
                    <th className="py-2 text-end font-semibold">{t("dashboard.units")}</th>
                    <th className="py-2 text-end font-semibold">{t("dashboard.revenue")}</th>
                    <th className="py-2 text-end font-semibold">{t("dashboard.views")}</th>
                    <th className="py-2 text-end font-semibold">{t("dashboard.conversion")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {a.productStats.map((x) => (
                    <tr key={x.p.id}>
                      <td className="py-2">
                        <Link href={`/market/${x.p.id}`} className="flex items-center gap-2 hover:underline">
                          <Image src={x.p.images[0]} alt="" width={32} height={32} className="size-8 rounded-md object-cover" />
                          <span className="truncate font-semibold text-ink">{x.p.title}</span>
                        </Link>
                      </td>
                      <td className="py-2 text-end">{num(x.units)}</td>
                      <td className="py-2 text-end font-semibold">{money({ amount: x.revenue, currency: x.p.price.currency })}</td>
                      <td className="py-2 text-end text-muted">{num(x.views)}</td>
                      <td className="py-2 text-end">{num(x.conversion * 100, { maximumFractionDigits: 2 })}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-2 text-xs text-faint">{t("dashboard.conversionNote")}</p>
            </div>
          )}
        </Card>

        <Card className="p-5">
          <SectionTitle>{t("dashboard.audienceTitle")}</SectionTitle>
          <p className="mb-1 text-xs font-semibold text-muted">{t("dashboard.followersGrowth")}</p>
          <FollowersChart data={followerData} />
          <p className="mb-2 mt-4 text-xs font-semibold text-muted">{t("dashboard.topContent")}</p>
          {a.postStats.length === 0 ? (
            <p className="text-sm text-muted">{t("dashboard.noPosts")}</p>
          ) : (
            <ul className="space-y-2">
              {a.postStats.slice(0, 4).map((x) => (
                <li key={x.p.id}>
                  <Link href={`/post/${x.p.id}`} className="flex items-center gap-3 rounded-xl p-1 hover:bg-bg">
                    <Image src={x.p.images[0]} alt="" width={40} height={40} unoptimized={x.p.images[0].startsWith("data:")} className="size-10 rounded-lg object-cover" />
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">{x.p.title}</span>
                    <span className="nums inline-flex shrink-0 items-center gap-1 text-xs text-muted">
                      <Heart className="size-3.5" /> {num(x.likes)} · {num(x.engagement * 100, { maximumFractionDigits: 1 })}%
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2 [&>*]:min-w-0">
        <Card className="p-5">
          <SectionTitle>
            <span className="inline-flex items-center gap-2">{t("dashboard.recsTitle")}</span>
          </SectionTitle>
          <p className="mb-3 flex items-start gap-1.5 text-xs text-muted">
            <Info className="mt-0.5 size-3.5 shrink-0" /> {t("dashboard.recsNote")}
          </p>
          {recs.length === 0 ? (
            <p className="text-sm text-muted">{t("dashboard.recsEmpty")}</p>
          ) : (
            <ul className="space-y-2.5">
              {recs.map((r, i) => (
                <li key={i} className="rounded-xl border border-line bg-bg/50 p-3">
                  <p className="flex items-start gap-2 text-sm font-bold text-ink">
                    <Lightbulb className="mt-0.5 size-4 shrink-0 text-saffron" />
                    {r.href ? <Link href={r.href} className="hover:underline">{r.title}</Link> : r.title}
                  </p>
                  <p className="mt-1 ps-6 text-[13px] text-text/85">{r.text}</p>
                  <p className="mt-1 ps-6 text-[11px] text-faint">{r.basis}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card className="p-5">
          <SectionTitle>{t("dashboard.myWorkshops")}</SectionTitle>
          {a.myWorkshops.length === 0 ? (
            <div className="text-sm text-muted">
              <p>{t("dashboard.noWorkshops")}</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {a.myWorkshops.slice(0, 5).map((w) => {
                const nx = nextSession(d, w.id);
                const list = nx ? a.enroll.filter((e) => e.sessionId === nx.id) : [];
                return (
                  <li key={w.id} className="rounded-xl border border-line p-3">
                    <Link href={`/dashboard/workshops/${w.id}`} className="font-bold text-ink hover:underline">{w.title}</Link>
                    <p className="nums text-xs text-muted">
                      {nx ? `${date(nx.startsAt, "datetime")} · ${t("workshop.taken", { taken: seatsTaken(d, nx), total: nx.seatsTotal })}` : t("ws.noDates")}
                    </p>
                    {list.length > 0 && (
                      <p className="mt-1 text-xs text-muted">
                        {t("dashboard.inAppEnrollments")}: {list.map((e) => userById(d, e.userId)?.name).join(", ")}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          {a.myTutorials.length > 0 && (
            <p className="mt-3 text-xs text-muted">{t("dashboard.tutorialsSold", { count: d.tutorialPurchases.filter((p) => a.myTutorials.some((x) => x.id === p.tutorialId)).length })}</p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <ButtonLink href="/dashboard/workshops" variant="soft" size="sm">
              {t("nav.myWorkshops")}
            </ButtonLink>
            <ButtonLink href={`/profile/${me!.username}`} variant="ghost" size="sm">
              {t("dashboard.viewProfile")}
            </ButtonLink>
          </div>
        </Card>
      </div>
    </div>
  );
}
