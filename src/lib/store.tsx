"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { buildSeed, type SeedData } from "@/data/seed";
import type {
  AIConversation,
  AIMessage,
  Address,
  AppNotification,
  CategoryId,
  CountryCode,
  FavoriteType,
  Locale,
  Order,
  OrderStatus,
  Post,
  SavedIdea,
  Settings,
  User,
} from "./types";
import { DAY, uid } from "./utils";
import { region } from "./regions";
import { detectLocale } from "@/i18n/config";
import { nextStatus, canCancel } from "./orders";

/**
 * Client-side demo repository. All mutations go through `actions`, so swapping
 * this for Supabase calls later only touches this file (see supabase/schema.sql).
 * State is persisted to localStorage and survives reloads and language changes.
 */

const STORAGE_KEY = "remeslo:v3";

export interface AppState {
  version: 3;
  sessionUserId: string | null;
  deviceLang: Locale;
  langSuggested: boolean;
  settingsByUser: Record<string, Settings>;
  data: SeedData;
}

function defaultSettings(country: CountryCode, lang: Locale, city?: string): Settings {
  const r = region(country);
  return { lang, country, timeZone: r.defaultTimeZone, currency: r.currency, city: city ?? r.cities[0] };
}

function initialState(lang: Locale): AppState {
  return {
    version: 3,
    sessionUserId: null,
    deviceLang: lang,
    langSuggested: true,
    settingsByUser: {
      u_anya: { ...defaultSettings("RU", "ru", "Казань") },
      u_marina: { ...defaultSettings("RU", "ru", "Санкт-Петербург") },
      u_lucas: { ...defaultSettings("BR", "pt-BR", "São Paulo") },
    },
    data: buildSeed(),
  };
}

type Ctx = ReturnType<typeof useBuildStore>;
const StoreCtx = createContext<Ctx | null>(null);

function useBuildStore() {
  const [state, setState] = useState<AppState | null>(null);
  const loaded = useRef(false);
  // Latest state for actions that must compute values (ids, numbers) outside pure updaters.
  const stateRef = useRef<AppState | null>(null);
  stateRef.current = state;

  useEffect(() => {
    let s: AppState | null = null;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) s = JSON.parse(raw) as AppState;
    } catch {}
    if (!s || s.version !== 3) s = initialState(detectLocale(navigator.languages));
    setState(s);
    loaded.current = true;
  }, []);

  useEffect(() => {
    if (!state || !loaded.current) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {}
  }, [state]);

  const update = useCallback((fn: (d: SeedData, s: AppState) => Partial<SeedData> | void) => {
    setState((s) => {
      if (!s) return s;
      const patch = fn(s.data, s);
      if (!patch) return s;
      return { ...s, data: { ...s.data, ...patch } };
    });
  }, []);

  const meId = state?.sessionUserId ?? null;
  const me = useMemo(() => (state && meId ? state.data.users.find((u) => u.id === meId) ?? null : null), [state, meId]);
  const settings: Settings = useMemo(() => {
    if (state && meId && state.settingsByUser[meId]) return state.settingsByUser[meId];
    return defaultSettings("RU", state?.deviceLang ?? "en");
  }, [state, meId]);

  const now = () => new Date().toISOString();

  const notify = useCallback(
    (d: SeedData, n: Omit<AppNotification, "id" | "at" | "read">): AppNotification[] => {
      if (n.userId === meId && n.type !== "order" && n.type !== "system" && n.type !== "workshop") return d.notifications;
      return [{ ...n, id: uid("n"), at: now(), read: false }, ...d.notifications];
    },
    [meId],
  );

  const actions = useMemo(
    () => ({
      /* ---------- session & settings ---------- */
      login(userId: string) {
        setState((s) => {
          if (!s) return s;
          const existing = s.settingsByUser[userId];
          const u = s.data.users.find((x) => x.id === userId);
          const country = (existing?.country ?? (u?.country === "BR" ? "BR" : "RU")) as CountryCode;
          // Keep the language the person is currently using — language is never forced by account country.
          const lang = s.deviceLang;
          return {
            ...s,
            sessionUserId: userId,
            settingsByUser: { ...s.settingsByUser, [userId]: { ...(existing ?? defaultSettings(country, lang, u?.city)), lang } },
          };
        });
      },
      logout() {
        setState((s) => (s ? { ...s, sessionUserId: null } : s));
      },
      setDeviceLang(lang: Locale) {
        setState((s) => (s ? { ...s, deviceLang: lang, langSuggested: false } : s));
      },
      dismissLangSuggestion() {
        setState((s) => (s ? { ...s, langSuggested: false } : s));
      },
      register(user: Omit<User, "id" | "joinedAt">, st: Settings) {
        const id = uid("u");
        setState((s) => {
          if (!s) return s;
          const newUser: User = { ...user, id, joinedAt: now() };
          return {
            ...s,
            sessionUserId: id,
            deviceLang: st.lang,
            settingsByUser: { ...s.settingsByUser, [id]: st },
            data: {
              ...s.data,
              users: [...s.data.users, newUser],
              categoryViews: { ...s.data.categoryViews, [id]: {} },
              notifications: [
                { id: uid("n"), userId: id, type: "system", key: "welcome", at: now(), read: false, href: "/feed" },
                ...s.data.notifications,
              ],
            },
          };
        });
        return id;
      },
      updateSettings(patch: Partial<Settings>) {
        setState((s) => {
          if (!s || !s.sessionUserId) return s;
          const cur = s.settingsByUser[s.sessionUserId] ?? defaultSettings("RU", s.deviceLang);
          const next = { ...cur, ...patch };
          // Changing country updates regional defaults but NEVER the interface language.
          if (patch.country && patch.country !== cur.country) {
            const r = region(patch.country);
            next.timeZone = patch.timeZone ?? r.defaultTimeZone;
            next.currency = patch.currency ?? r.currency;
            next.city = patch.city ?? r.cities[0];
          }
          return {
            ...s,
            deviceLang: patch.lang ?? s.deviceLang,
            langSuggested: patch.lang ? false : s.langSuggested,
            settingsByUser: { ...s.settingsByUser, [s.sessionUserId]: next },
          };
        });
      },
      updateProfile(patch: Partial<User>) {
        update((d) => ({ users: d.users.map((u) => (u.id === meId ? { ...u, ...patch } : u)) }));
      },
      resetDemo() {
        const lang = state?.deviceLang ?? "ru";
        const fresh = initialState(lang);
        setState({ ...fresh, sessionUserId: null, langSuggested: false });
      },

      /* ---------- social ---------- */
      toggleLike(postId: string) {
        if (!meId) return;
        update((d) => {
          const has = d.likes.some((l) => l.userId === meId && l.postId === postId);
          const post = d.posts.find((p) => p.id === postId);
          if (has) return { likes: d.likes.filter((l) => !(l.userId === meId && l.postId === postId)) };
          return {
            likes: [...d.likes, { userId: meId, postId, at: now() }],
            notifications: post ? notify(d, { userId: post.authorId, type: "like", actorId: meId, key: "like", params: { title: post.title }, href: `/post/${postId}` }) : d.notifications,
            categoryViews: post?.category ? bumpCat(d, meId, post.category, 2) : d.categoryViews,
          };
        });
      },
      addComment(postId: string, text: string) {
        if (!meId || !text.trim()) return;
        update((d) => {
          const post = d.posts.find((p) => p.id === postId);
          return {
            comments: [...d.comments, { id: uid("c"), postId, authorId: meId, text: text.trim(), createdAt: now() }],
            notifications: post ? notify(d, { userId: post.authorId, type: "comment", actorId: meId, key: "comment", params: { title: post.title }, href: `/post/${postId}` }) : d.notifications,
          };
        });
      },
      deleteComment(commentId: string) {
        update((d) => ({ comments: d.comments.filter((c) => !(c.id === commentId && c.authorId === meId)) }));
      },
      createPost(p: Omit<Post, "id" | "authorId" | "createdAt" | "views" | "lang">) {
        if (!meId) return "";
        const id = uid("p");
        update((d) => {
          const author = d.users.find((u) => u.id === meId);
          return { posts: [{ ...p, id, authorId: meId, createdAt: now(), views: 0, lang: author?.contentLang ?? "ru" }, ...d.posts] };
        });
        return id;
      },
      deletePost(postId: string) {
        update((d) => ({ posts: d.posts.filter((p) => !(p.id === postId && p.authorId === meId)) }));
      },
      toggleFollow(userId: string) {
        if (!meId || userId === meId) return; // never follow yourself
        update((d) => {
          const has = d.follows.some((f) => f.followerId === meId && f.followingId === userId);
          if (has) return { follows: d.follows.filter((f) => !(f.followerId === meId && f.followingId === userId)) };
          return {
            follows: [...d.follows, { followerId: meId, followingId: userId, at: now() }],
            notifications: notify(d, { userId, type: "follow", actorId: meId, key: "follow", href: `/profile/${d.users.find((u) => u.id === meId)?.username}` }),
          };
        });
      },
      toggleFavorite(type: FavoriteType, id: string) {
        if (!meId) return;
        update((d) => {
          const has = d.favorites.some((f) => f.userId === meId && f.type === type && f.id === id);
          if (has) return { favorites: d.favorites.filter((f) => !(f.userId === meId && f.type === type && f.id === id)) };
          return { favorites: [{ userId: meId, type, id, at: now() }, ...d.favorites] };
        });
      },
      viewCategory(cat: CategoryId) {
        if (!meId) return;
        update((d) => ({ categoryViews: bumpCat(d, meId, cat, 1) }));
      },
      viewPost(postId: string) {
        update((d) => ({ posts: d.posts.map((p) => (p.id === postId ? { ...p, views: p.views + 1 } : p)) }));
      },
      sendMessage(toId: string, text: string) {
        if (!meId || !text.trim()) return;
        update((d) => ({ messages: [...d.messages, { id: uid("m"), fromId: meId, toId, text: text.trim(), at: now() }] }));
      },

      /* ---------- cart & orders ---------- */
      addToCart(productId: string, qty = 1) {
        if (!meId) return;
        update((d) => {
          const p = d.products.find((x) => x.id === productId);
          if (!p || p.availability === "sold_out") return;
          const cart = d.carts[meId] ?? [];
          const ex = cart.find((c) => c.productId === productId);
          const max = p.availability === "in_stock" ? p.stock : 10;
          const next = ex
            ? cart.map((c) => (c.productId === productId ? { ...c, qty: Math.min(max, c.qty + qty) } : c))
            : [...cart, { productId, qty: Math.min(max, qty), priceAtAdd: p.price, addedAt: now() }];
          return { carts: { ...d.carts, [meId]: next } };
        });
      },
      setCartQty(productId: string, qty: number) {
        if (!meId) return;
        update((d) => {
          const p = d.products.find((x) => x.id === productId);
          const max = p?.availability === "in_stock" ? p.stock : 10;
          const q = Math.max(1, Math.min(max, qty));
          return { carts: { ...d.carts, [meId]: (d.carts[meId] ?? []).map((c) => (c.productId === productId ? { ...c, qty: q } : c)) } };
        });
      },
      removeFromCart(productId: string) {
        if (!meId) return;
        update((d) => ({ carts: { ...d.carts, [meId]: (d.carts[meId] ?? []).filter((c) => c.productId !== productId) } }));
      },
      acceptPrice(productId: string) {
        if (!meId) return;
        update((d) => {
          const p = d.products.find((x) => x.id === productId);
          if (!p) return;
          return { carts: { ...d.carts, [meId]: (d.carts[meId] ?? []).map((c) => (c.productId === productId ? { ...c, priceAtAdd: p.price } : c)) } };
        });
      },
      saveAddress(a: Omit<Address, "id" | "userId">) {
        if (!meId) return "";
        const id = uid("a");
        update((d) => ({ addresses: [...d.addresses, { ...a, id, userId: meId }] }));
        return id;
      },
      placeOrder(input: { address: Order["address"]; deliveryMethod: string; groups: { sellerId: string; items: Order["items"]; shipping: Order["shipping"] }[] }) {
        const snap = stateRef.current;
        if (!meId || !snap) return [] as string[];
        // Build everything with side effects (ids, timestamps) OUTSIDE the state updater,
        // so React Strict Mode's double-invoked updaters stay pure.
        const groupId = uid("g");
        const created = now();
        const base = 1100 + snap.data.orders.length;
        const m = region(input.address.country).delivery.find((x) => x.id === input.deliveryMethod);
        const newOrders: Order[] = input.groups.map((g, i) => {
          const cur = g.items[0].unitPrice.currency;
          const subtotal = g.items.reduce((sum, it) => sum + it.unitPrice.amount * it.qty, 0);
          const makeDays = Math.max(
            0,
            ...g.items.map((it) => {
              const p = snap.data.products.find((x) => x.id === it.productId);
              return p?.availability === "made_to_order" ? p.makeDays ?? 0 : 0;
            }),
          );
          return {
            id: uid("o"),
            number: `RM-${base + i}`,
            groupId,
            buyerId: meId,
            sellerId: g.sellerId,
            createdAt: created,
            items: g.items,
            deliveryMethod: input.deliveryMethod,
            address: input.address,
            subtotal: { amount: round2(subtotal), currency: cur },
            shipping: g.shipping,
            total: { amount: round2(subtotal + g.shipping.amount), currency: cur },
            status: "pending" as OrderStatus,
            history: [{ status: "pending" as OrderStatus, at: created }],
            tracking: `DEMO-${input.address.country}-${Math.floor(100000 + Math.random() * 900000)}`,
            eta: new Date(Date.now() + ((m?.days[1] ?? 10) + makeDays) * DAY).toISOString(),
          };
        });
        const newNotifications: AppNotification[] = newOrders.flatMap((o) => [
          { id: uid("n"), userId: o.sellerId, type: "order" as const, key: "newOrder", params: { number: o.number }, href: "/dashboard", at: created, read: false },
          { id: uid("n"), userId: meId, type: "order" as const, key: "orderPlaced", params: { number: o.number }, href: `/orders/${o.id}`, at: created, read: false },
        ]);
        const bought = new Set(input.groups.flatMap((g) => g.items.map((i) => i.productId)));
        const allItems = input.groups.flatMap((g) => g.items);
        update((d) => ({
          orders: [...newOrders, ...d.orders.filter((o) => o.groupId !== groupId)],
          products: d.products.map((p) => {
            const it = allItems.find((i) => i.productId === p.id);
            if (!it || p.availability !== "in_stock") return p;
            const stock = Math.max(0, p.stock - it.qty);
            return { ...p, stock, availability: stock === 0 ? ("sold_out" as const) : p.availability };
          }),
          carts: { ...d.carts, [meId]: (d.carts[meId] ?? []).filter((c) => !bought.has(c.productId)) },
          notifications: [...newNotifications, ...d.notifications.filter((n) => !newNotifications.some((x) => x.id === n.id))],
        }));
        return newOrders.map((o) => o.id);
      },
      cancelOrder(orderId: string) {
        update((d) => ({
          orders: d.orders.map((o) =>
            o.id === orderId && canCancel(o.status) ? { ...o, status: "cancelled", eta: undefined, history: [...o.history, { status: "cancelled", at: now() }] } : o,
          ),
        }));
      },
      /** Demo-only: moves the order to the next lifecycle stage (no real carrier). */
      advanceOrder(orderId: string) {
        update((d) => ({
          orders: d.orders.map((o) => {
            if (o.id !== orderId) return o;
            const n = nextStatus(o.status);
            if (!n) return o;
            return { ...o, status: n, eta: n === "delivered" || n === "received" ? undefined : o.eta, history: [...o.history, { status: n, at: now() }] };
          }),
          notifications: (() => {
            const o = d.orders.find((x) => x.id === orderId);
            if (!o) return d.notifications;
            return [{ id: uid("n"), userId: o.buyerId, type: "order", key: "orderStatus", params: { number: o.number }, href: `/orders/${o.id}`, at: now(), read: true }, ...d.notifications];
          })(),
        }));
      },
      confirmReceived(orderId: string) {
        update((d) => ({
          orders: d.orders.map((o) => {
            if (o.id !== orderId || !["arrived", "delivered"].includes(o.status)) return o;
            const hist = [...o.history];
            if (o.status === "arrived") hist.push({ status: "delivered", at: now() });
            hist.push({ status: "received", at: now() });
            return { ...o, status: "received", eta: undefined, history: hist };
          }),
        }));
      },
      addProductReview(orderId: string, productId: string, rating: number, text: string) {
        if (!meId) return;
        update((d) => ({
          productReviews: [{ productId, authorId: meId, rating, text, at: now() }, ...d.productReviews],
          orders: d.orders.map((o) => (o.id === orderId ? { ...o, reviewed: true } : o)),
        }));
      },

      /* ---------- learning ---------- */
      enroll(workshopId: string) {
        if (!meId) return false;
        let ok = false;
        update((d) => {
          const w = d.workshops.find((x) => x.id === workshopId);
          if (!w || w.seatsTaken >= w.seatsTotal || d.enrollments.some((e) => e.userId === meId && e.workshopId === workshopId)) return;
          ok = true;
          return {
            enrollments: [...d.enrollments, { userId: meId, workshopId, at: now() }],
            workshops: d.workshops.map((x) => (x.id === workshopId ? { ...x, seatsTaken: x.seatsTaken + 1 } : x)),
            notifications: [
              { id: uid("n"), userId: w.hostId, type: "workshop", actorId: meId, key: "enrolled", params: { title: w.title }, href: `/learn/workshop/${w.id}`, at: now(), read: false },
              ...d.notifications,
            ],
          };
        });
        return ok;
      },
      cancelEnrollment(workshopId: string) {
        if (!meId) return;
        update((d) => {
          if (!d.enrollments.some((e) => e.userId === meId && e.workshopId === workshopId)) return;
          return {
            enrollments: d.enrollments.filter((e) => !(e.userId === meId && e.workshopId === workshopId)),
            workshops: d.workshops.map((x) => (x.id === workshopId ? { ...x, seatsTaken: Math.max(0, x.seatsTaken - 1) } : x)),
          };
        });
      },
      buyTutorial(tutorialId: string) {
        if (!meId) return;
        update((d) => {
          const t = d.tutorials.find((x) => x.id === tutorialId);
          if (!t?.price || d.tutorialPurchases.some((p) => p.userId === meId && p.tutorialId === tutorialId)) return;
          return { tutorialPurchases: [...d.tutorialPurchases, { userId: meId, tutorialId, at: now(), price: t.price }] };
        });
      },
      addTutorialReview(tutorialId: string, rating: number, text: string) {
        if (!meId) return;
        update((d) => ({
          tutorials: d.tutorials.map((t) => (t.id === tutorialId ? { ...t, reviews: [{ authorId: meId, rating, text, at: now() }, ...t.reviews] } : t)),
        }));
      },

      /* ---------- AI studio ---------- */
      upsertConversation(c: AIConversation) {
        update((d) => {
          const exists = d.conversations.some((x) => x.id === c.id);
          return { conversations: exists ? d.conversations.map((x) => (x.id === c.id ? c : x)) : [c, ...d.conversations] };
        });
      },
      appendMessages(convId: string, msgs: AIMessage[], patch: Partial<AIConversation> = {}) {
        update((d) => ({
          conversations: d.conversations.map((c) => (c.id === convId ? { ...c, ...patch, messages: [...c.messages, ...msgs], updatedAt: now() } : c)),
        }));
      },
      deleteConversation(convId: string) {
        update((d) => ({ conversations: d.conversations.filter((c) => c.id !== convId) }));
      },
      saveIdea(idea: Omit<SavedIdea, "id" | "userId" | "createdAt" | "isProject">) {
        if (!meId) return "";
        const id = uid("i");
        update((d) => ({ ideas: [{ ...idea, id, userId: meId, createdAt: now(), isProject: false }, ...d.ideas] }));
        return id;
      },
      makeProject(ideaId: string) {
        update((d) => ({ ideas: d.ideas.map((i) => (i.id === ideaId ? { ...i, isProject: true } : i)) }));
      },
      deleteIdea(ideaId: string) {
        update((d) => ({ ideas: d.ideas.filter((i) => i.id !== ideaId) }));
      },

      /* ---------- notifications ---------- */
      markAllRead() {
        update((d) => ({ notifications: d.notifications.map((n) => (n.userId === meId ? { ...n, read: true } : n)) }));
      },
      markRead(id: string) {
        update((d) => ({ notifications: d.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)) }));
      },
    }),
    [meId, update, notify, state?.deviceLang],
  );

  return { state, ready: state !== null, me, meId, settings, actions };
}

function bumpCat(d: SeedData, userId: string, cat: string, by: number) {
  const cur = d.categoryViews[userId] ?? {};
  return { ...d.categoryViews, [userId]: { ...cur, [cat]: (cur[cat] ?? 0) + by } };
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const store = useBuildStore();
  return <StoreCtx.Provider value={store}>{children}</StoreCtx.Provider>;
}

export function useStore() {
  const s = useContext(StoreCtx);
  if (!s) throw new Error("useStore outside provider");
  return s;
}

/** Convenience hook for pages that require the data to be loaded. */
export function useData() {
  const s = useStore();
  return { ...s, data: s.state!.data };
}
