import type { SeedData } from "@/data/seed";
import type { CurrencyCode } from "./types";
import { DAY } from "./utils";
import { likeCount } from "./selectors";

/**
 * Author analytics computed ONLY from the app's own records (orders, enrollments,
 * tutorial purchases, follows, likes, comments). Views are seeded demo counters.
 * No forecasting.
 */
export function authorAnalytics(d: SeedData, me: string, periodDays: number, currency: CurrencyCode) {
  const since = Date.now() - periodDays * DAY;
  const inPeriod = (iso: string) => new Date(iso).getTime() >= since;
  const myProducts = d.products.filter((p) => p.sellerId === me);
  const myWorkshops = d.workshops.filter((w) => w.hostId === me);
  const myTutorials = d.tutorials.filter((t) => t.authorId === me);
  const sales = d.orders.filter((o) => o.sellerId === me && o.status !== "cancelled");
  const salesP = sales.filter((o) => inPeriod(o.createdAt) && o.subtotal.currency === currency);
  const enroll = d.enrollments.filter((e) => myWorkshops.some((w) => w.id === e.workshopId));
  const enrollP = enroll.filter((e) => inPeriod(e.at));
  const tps = d.tutorialPurchases.filter((p) => myTutorials.some((t) => t.id === p.tutorialId));
  const tpsP = tps.filter((p) => inPeriod(p.at) && p.price.currency === currency);
  const wsPrice = (id: string) => {
    const w = myWorkshops.find((x) => x.id === id);
    return w?.price && w.price.currency === currency ? w.price.amount : 0;
  };

  const incomeProducts = salesP.reduce((s, o) => s + o.subtotal.amount, 0);
  const incomeWorkshops = enrollP.reduce((s, e) => s + wsPrice(e.workshopId), 0);
  const incomeTutorials = tpsP.reduce((s, p) => s + p.price.amount, 0);
  const units = salesP.reduce((s, o) => s + o.items.reduce((a, i) => a + i.qty, 0), 0);
  const ordersCount = salesP.length;
  const avgCheck = ordersCount ? incomeProducts / ordersCount : 0;
  const otherCurrencySales = sales.filter((o) => inPeriod(o.createdAt) && o.subtotal.currency !== currency).length;

  // Monthly series (last 6 calendar months)
  const months: { key: string; date: Date; products: number; workshops: number; tutorials: number }[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const dt = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ key: `${dt.getFullYear()}-${dt.getMonth()}`, date: dt, products: 0, workshops: 0, tutorials: 0 });
  }
  const mk = (iso: string) => {
    const x = new Date(iso);
    return `${x.getFullYear()}-${x.getMonth()}`;
  };
  sales.filter((o) => o.subtotal.currency === currency).forEach((o) => {
    const m = months.find((x) => x.key === mk(o.createdAt));
    if (m) m.products += o.subtotal.amount;
  });
  enroll.forEach((e) => {
    const m = months.find((x) => x.key === mk(e.at));
    if (m) m.workshops += wsPrice(e.workshopId);
  });
  tps.filter((p) => p.price.currency === currency).forEach((p) => {
    const m = months.find((x) => x.key === mk(p.at));
    if (m) m.tutorials += p.price.amount;
  });

  // Product performance
  const productStats = myProducts
    .map((p) => {
      const ords = sales.filter((o) => o.items.some((i) => i.productId === p.id));
      const u = ords.reduce((s, o) => s + (o.items.find((i) => i.productId === p.id)?.qty ?? 0), 0);
      const rev = ords.reduce((s, o) => s + (o.items.find((i) => i.productId === p.id)?.unitPrice.amount ?? 0) * (o.items.find((i) => i.productId === p.id)?.qty ?? 0), 0);
      const saves = d.favorites.filter((f) => f.type === "product" && f.id === p.id).length;
      return { p, units: u, revenue: rev, orders: ords.length, views: p.views, conversion: p.views ? ords.length / p.views : 0, saves };
    })
    .sort((a, b) => b.revenue - a.revenue);

  // Audience
  const followers = d.follows.filter((f) => f.followingId === me).sort((a, b) => a.at.localeCompare(b.at));
  const followerSeries: { date: string; count: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59);
    followerSeries.push({ date: end.toISOString(), count: followers.filter((f) => new Date(f.at) <= end).length });
  }
  const newFollowers = followers.filter((f) => inPeriod(f.at)).length;
  const posts = d.posts.filter((p) => p.authorId === me);
  const postStats = posts
    .map((p) => {
      const l = likeCount(d, p.id);
      const c = d.comments.filter((x) => x.postId === p.id).length;
      const s = d.favorites.filter((f) => f.type === "post" && f.id === p.id).length;
      return { p, likes: l, comments: c, saves: s, engagement: p.views ? (l + c + s) / p.views : 0 };
    })
    .sort((a, b) => b.likes + b.comments * 3 - (a.likes + a.comments * 3));
  const totalViews = posts.reduce((s, p) => s + p.views, 0);
  const engagement = totalViews ? postStats.reduce((s, x) => s + x.likes + x.comments + x.saves, 0) / totalViews : 0;

  // Category interest = engagement on my posts grouped by category
  const catInterest = new Map<string, number>();
  postStats.forEach((x) => x.p.category && catInterest.set(x.p.category, (catInterest.get(x.p.category) ?? 0) + x.likes + x.comments * 3 + x.saves * 2));

  return {
    hasCommerce: myProducts.length + myWorkshops.length + myTutorials.length > 0,
    income: { products: incomeProducts, workshops: incomeWorkshops, tutorials: incomeTutorials, total: incomeProducts + incomeWorkshops + incomeTutorials },
    units,
    ordersCount,
    avgCheck,
    otherCurrencySales,
    months,
    productStats,
    followers: followers.length,
    newFollowers,
    followerSeries,
    postStats,
    totalViews,
    engagement,
    catInterest: [...catInterest.entries()].sort((a, b) => b[1] - a[1]),
    myWorkshops,
    myTutorials,
    enroll,
    incoming: d.orders.filter((o) => o.sellerId === me).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  };
}
