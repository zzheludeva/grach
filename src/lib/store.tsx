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
  Product,
  Project,
  SavedIdea,
  Settings,
  User,
  Workshop,
  WorkshopSession,
  Enrollment,
  Tutorial,
  OrderEvent,
  Message,
} from "./types";
import { applyTemplateToSession, dueReminder, legacyEnrollment, seatsLeft, sessionAudience, significantChanges, splitLegacy, templateDiffForSessions, type ApplyMode, type LegacyWorkshop } from "./workshops";
import { pendingReady, canConfirmReceived, canRemindReady, canSellerCancel, validateTransition, type TransitionError, type TransitionProof } from "./orders";
import { DAY, uid } from "./utils";
import { region } from "./regions";
import { detectLocale } from "@/i18n/config";
import { canCancel } from "./orders";

/**
 * Client-side demo repository. All mutations go through `actions`, so swapping
 * this for Supabase calls later only touches this file (see supabase/schema.sql).
 * State is persisted to localStorage and survives reloads and language changes.
 */

const STORAGE_KEY = "remeslo:v3";

export interface AppState {
  version: 6;
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
    version: 6,
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
    if (s && (s.version as number) === 3) s = migrateV3(s);
    if (s && (s.version as number) === 4) s = migrateV4(s);
    if (s && (s.version as number) === 5) s = migrateV5(s);
    if (!s || s.version !== 6) s = initialState(detectLocale(navigator.languages));
    setState(s);
    loaded.current = true;
  }, []);

  const [storageError, setStorageError] = useState(false);
  useEffect(() => {
    if (!state || !loaded.current) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      setStorageError(false);
    } catch {
      // Usually the browser quota (photos are stored locally in the demo). Surface it — never fail silently.
      setStorageError(true);
    }
  }, [state]);

  /*
   * Organizer reminders (24 h and 1 h before a session). In the demo the local database is
   * checked on load and every minute; in production the same rule runs as a scheduled job
   * (pg_cron → send_session_reminders() in the Supabase migration). Each window is sent once.
   */
  useEffect(() => {
    if (!state) return;
    const tick = () =>
      setState((s) => {
        if (!s) return s;
        const nowMs = Date.now();
        const sent = new Set(s.data.reminderLog ?? []);
        const fresh: AppNotification[] = [];
        for (const ses of s.data.sessions ?? []) {
          const w = s.data.workshops.find((x) => x.id === ses.workshopId);
          if (!w || w.status !== "published") continue;
          const prefs = s.settingsByUser[ses.hostId]?.notify ?? { remind24h: true, remind1h: true };
          const kind = dueReminder(ses, nowMs, prefs, sent);
          if (!kind) continue;
          sent.add(`${ses.id}:${kind}`);
          if (kind === "1h") sent.add(`${ses.id}:24h`);
          const count = (ses.externalSeats ?? 0) + s.data.enrollments.filter((e) => e.sessionId === ses.id).reduce((n, e) => n + e.seats, 0);
          fresh.push({
            id: `n_rem_${ses.id}_${kind}`,
            userId: ses.hostId,
            type: "workshop",
            key: kind === "24h" ? "reminder24" : "reminder1",
            params: { title: w.title, startsAt: ses.startsAt, format: `@workshop.${ses.format}`, count },
            href: `/dashboard/workshops/${w.id}`,
            at: new Date(nowMs).toISOString(),
            read: false,
          });
        }
        if (!fresh.length) return s;
        return { ...s, data: { ...s.data, reminderLog: [...sent], notifications: [...fresh, ...s.data.notifications.filter((n) => !fresh.some((f) => f.id === n.id))] } };
      });
    tick();
    const t = setInterval(tick, 60_000);
    return () => clearInterval(t);
    // run once the state is loaded
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state !== null]);

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
      /**
       * One personal conversation per pair of users. Optional context (order, workshop/session) is stored
       * on the message so both sides see what it is about. The recipient gets one unread notification per
       * conversation (updated, not duplicated, while unread).
       */
      sendMessage(toId: string, text: string, extra: { image?: string; orderId?: string; workshopId?: string; sessionId?: string } = {}) {
        if (!meId || toId === meId || (!text.trim() && !extra.image)) return;
        const at = now();
        update((d) => {
          const meUser = d.users.find((u) => u.id === meId);
          if (!d.users.some((u) => u.id === toId) || !meUser) return;
          const ctx = Object.fromEntries(Object.entries(extra).filter(([, v]) => !!v));
          const workshop = extra.workshopId ? d.workshops.find((w) => w.id === extra.workshopId) : undefined;
          const existing = d.notifications.find((n) => n.userId === toId && n.key === "newMessage" && n.actorId === meId && !n.read);
          const note: AppNotification = {
            id: existing?.id ?? uid("n"), userId: toId, type: "system", actorId: meId, key: workshop ? "newMessageWorkshop" : "newMessage",
            params: { name: meUser.name, title: workshop?.title ?? "" }, href: `/messages/${meUser.username}`, at, read: false,
          };
          return {
            messages: [...d.messages, { id: uid("m"), fromId: meId, toId, text: text.trim(), at, ...ctx }],
            notifications: [note, ...d.notifications.filter((n) => n.id !== note.id && !(n.userId === toId && n.actorId === meId && !n.read && n.key.startsWith("newMessage")))],
          };
        });
      },

      /* ---------- cart & orders ---------- */
      addToCart(productId: string, qty = 1) {
        if (!meId) return;
        update((d) => {
          const p = d.products.find((x) => x.id === productId);
          if (!p || p.status !== "published" || p.availability === "sold_out" || p.sellerId === meId) return;
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
      /** Buyer cancels before production; seller cancels before shipping, with a reason. The other side is notified. */
      cancelOrder(orderId: string, reason = ""): boolean {
        const snap = stateRef.current;
        const o = snap?.data.orders.find((x) => x.id === orderId);
        if (!meId || !o) return false;
        const asBuyer = o.buyerId === meId && canCancel(o.status);
        const asSeller = o.sellerId === meId && canSellerCancel(o.status) && reason.trim().length >= 3;
        if (!asBuyer && !asSeller) return false;
        const at = now();
        const note: AppNotification = {
          id: uid("n"), userId: asBuyer ? o.sellerId : o.buyerId, type: "order", actorId: meId,
          key: asBuyer ? "orderCancelledByBuyer" : "orderCancelledBySeller", params: { number: o.number, reason: reason.trim() }, href: `/orders/${o.id}`, at, read: false,
        };
        update((d) => ({
          orders: d.orders.map((x) =>
            x.id === orderId
              ? { ...x, status: "cancelled", eta: undefined, cancelledBy: meId, cancelReason: reason.trim() || undefined, history: [...x.history, { status: "cancelled", from: x.status, by: meId, at, comment: reason.trim() || undefined }] }
              : x,
          ),
          notifications: [note, ...d.notifications.filter((n) => n.id !== note.id)],
        }));
        return true;
      },
      /**
       * Seller moves the order one step forward. "ready" needs photos and becomes a readiness request
       * the buyer must answer; "handed_over" needs a tracking number (with carrier) or link and is only
       * possible after the buyer confirmed readiness. Readiness photos are also sent in messages.
       */
      transitionOrder(orderId: string, to: OrderStatus, proof: TransitionProof, messageText = ""): { ok: true } | { error: TransitionError } {
        const snap = stateRef.current;
        const o = snap?.data.orders.find((x) => x.id === orderId);
        if (!meId || !snap || !o) return { error: "forbidden" };
        const err = validateTransition(o, meId, to, proof);
        if (err) return { error: err };
        const at = now();
        const clean = (v?: string) => (v && v.trim() ? v.trim() : undefined);
        const photos = to === "ready" ? (proof.photos ?? []).filter(Boolean) : [];
        const ev: OrderEvent = {
          status: to,
          from: o.status,
          at,
          by: meId,
          comment: clean(proof.comment),
          photo: photos[0],
          photos: photos.length ? photos : undefined,
          carrier: clean(proof.carrier),
          trackingNumber: clean(proof.trackingNumber),
          trackingUrl: clean(proof.trackingUrl),
          ack: to === "ready" ? "pending" : undefined,
        };
        const key = to === "ready" ? "orderReadyRequest" : to === "handed_over" ? "orderShipped" : "orderStep";
        const note: AppNotification = {
          id: uid("n"), userId: o.buyerId, type: "order", actorId: meId, key, params: { number: o.number, status: `@orderStatus.${to}` }, href: `/orders/${o.id}`, at, read: false,
        };
        const text = [messageText, clean(proof.comment)].filter(Boolean).join("\n\n");
        const msgs: Message[] = photos.map((src, i) => ({ id: uid("m"), fromId: meId, toId: o.buyerId, text: i === 0 ? text : "", image: src, orderId: o.id, at }));
        update((d) => ({
          orders: d.orders.map((x) =>
            x.id === orderId
              ? {
                  ...x,
                  status: to,
                  history: [...x.history, ev],
                  ...(to === "ready"
                    ? { readyPhoto: photos[0], readyPhotos: photos, readyRequestedAt: at, readyConfirmedAt: undefined, readyRemindedAt: undefined, readyRejection: undefined }
                    : {}),
                  shipment: to === "handed_over" ? { carrier: ev.carrier, number: ev.trackingNumber, url: ev.trackingUrl, at } : x.shipment,
                }
              : x,
          ),
          notifications: [note, ...d.notifications.filter((n) => n.id !== note.id)],
          messages: [...d.messages.filter((m) => !msgs.some((x) => x.id === m.id)), ...msgs],
        }));
        return { ok: true };
      },
      /** Buyer confirms that the finished item matches the order and may be shipped. */
      confirmReady(orderId: string): boolean {
        const snap = stateRef.current;
        const o = snap?.data.orders.find((x) => x.id === orderId);
        const req = o && pendingReady(o);
        if (!meId || !o || o.buyerId !== meId || !req) return false;
        const at = now();
        const note: AppNotification = { id: uid("n"), userId: o.sellerId, type: "order", actorId: meId, key: "orderReadyConfirmed", params: { number: o.number }, href: `/orders/${o.id}`, at, read: false };
        update((d) => ({
          orders: d.orders.map((x) =>
            x.id === orderId
              ? { ...x, readyConfirmedAt: at, history: [...x.history.map((h) => (h === req || (h.at === req.at && h.status === "ready" && !h.kind) ? { ...h, ack: "confirmed" as const } : h)), { status: "ready", at, by: meId, kind: "readyConfirmed" }] }
              : x,
          ),
          notifications: [note, ...d.notifications.filter((n) => n.id !== note.id)],
        }));
        return true;
      },
      /** Buyer rejects readiness with a comment: the order goes back to the seller ("preparing") to fix the remarks. */
      rejectReady(orderId: string, reason: string): boolean {
        const snap = stateRef.current;
        const o = snap?.data.orders.find((x) => x.id === orderId);
        const req = o && pendingReady(o);
        const r = reason.trim();
        if (!meId || !o || o.buyerId !== meId || !req || r.length < 3) return false;
        const at = now();
        const note: AppNotification = { id: uid("n"), userId: o.sellerId, type: "order", actorId: meId, key: "orderReadyRejected", params: { number: o.number, reason: r }, href: `/orders/${o.id}`, at, read: false };
        update((d) => ({
          orders: d.orders.map((x) => {
            if (x.id !== orderId) return x;
            const h = x.history.map((e) => (e.at === req.at && e.status === "ready" && !e.kind ? { ...e, ack: "rejected" as const, rejectReason: r } : e));
            h.push({ status: "preparing", from: "ready", at, by: meId, comment: r, revert: true, kind: "readyRejected" });
            return { ...x, status: "preparing", history: h, readyPhoto: undefined, readyPhotos: undefined, readyRequestedAt: undefined, readyRemindedAt: undefined, readyRejection: { reason: r, at } };
          }),
          notifications: [note, ...d.notifications.filter((n) => n.id !== note.id)],
        }));
        return true;
      },
      /** Seller reminds a buyer who hasn't answered the readiness request (at most once per 24 h). */
      remindReady(orderId: string): boolean {
        const snap = stateRef.current;
        const o = snap?.data.orders.find((x) => x.id === orderId);
        if (!meId || !o || o.sellerId !== meId || !canRemindReady(o)) return false;
        const at = now();
        const note: AppNotification = { id: uid("n"), userId: o.buyerId, type: "order", actorId: meId, key: "orderReadyReminder", params: { number: o.number }, href: `/orders/${o.id}`, at, read: false };
        update((d) => ({
          orders: d.orders.map((x) => (x.id === orderId ? { ...x, readyRemindedAt: at, history: [...x.history, { status: "ready", at, by: meId, kind: "readyReminder" }] } : x)),
          notifications: [note, ...d.notifications.filter((n) => n.id !== note.id)],
        }));
        return true;
      },
      /** Buyer confirms receipt after shipping → the order is completed. Never automatic. */
      confirmReceived(orderId: string) {
        const snap = stateRef.current;
        const o = snap?.data.orders.find((x) => x.id === orderId);
        if (!meId || !o || o.buyerId !== meId || !canConfirmReceived(o.status)) return false;
        const at = now();
        const note: AppNotification = { id: uid("n"), userId: o.sellerId, type: "order", actorId: meId, key: "orderReceived", params: { number: o.number }, href: `/orders/${o.id}`, at, read: false };
        update((d) => ({
          orders: d.orders.map((x) => (x.id === orderId ? { ...x, status: "received", eta: undefined, history: [...x.history, { status: "received", from: x.status, by: meId, at }] } : x)),
          notifications: [note, ...d.notifications.filter((n) => n.id !== note.id)],
        }));
        return true;
      },
      addProductReview(orderId: string, productId: string, rating: number, text: string) {
        if (!meId) return;
        update((d) => ({
          productReviews: [{ productId, authorId: meId, rating, text, at: now() }, ...d.productReviews],
          orders: d.orders.map((o) => (o.id === orderId ? { ...o, reviewed: true } : o)),
        }));
      },

      /* ---------- learning ---------- */
      /** Books seats on a concrete session. One booking per user and session; seats are re-counted. */
      enroll(sessionId: string, seats = 1): "ok" | "full" | "duplicate" | "closed" {
        const snap = stateRef.current;
        if (!meId || !snap) return "closed";
        const s = snap.data.sessions.find((x) => x.id === sessionId);
        const w = s && snap.data.workshops.find((x) => x.id === s.workshopId);
        if (!s || !w || w.status !== "published" || s.status !== "scheduled" || new Date(s.startsAt).getTime() <= Date.now()) return "closed";
        if (s.hostId === meId) return "closed";
        if (snap.data.enrollments.some((e) => e.userId === meId && e.sessionId === sessionId)) return "duplicate";
        const n = Math.max(1, Math.floor(seats));
        if (n > seatsLeft(snap.data, s)) return "full";
        const at = now();
        const booking: Enrollment = { id: uid("e"), userId: meId, sessionId, workshopId: w.id, seats: n, at };
        const note: AppNotification = { id: uid("n"), userId: w.hostId, type: "workshop", actorId: meId, key: "enrolledSession", params: { title: w.title, count: n }, href: `/dashboard/workshops/${w.id}`, at, read: false };
        update((d) => ({
          enrollments: [...d.enrollments.filter((e) => !(e.userId === meId && e.sessionId === sessionId)), booking],
          notifications: [note, ...d.notifications.filter((x) => x.id !== note.id)],
        }));
        return "ok";
      },
      cancelEnrollment(sessionId: string) {
        if (!meId) return;
        update((d) => {
          if (!d.enrollments.some((e) => e.userId === meId && e.sessionId === sessionId)) return;
          return { enrollments: d.enrollments.filter((e) => !(e.userId === meId && e.sessionId === sessionId)) };
        });
      },
      /**
       * Organizer adds a registered user to their own session. Same checks as self-booking: the session must be
       * upcoming and not cancelled, no double booking, the seat limit is respected.
       */
      addParticipant(sessionId: string, userId: string, seats = 1): "ok" | "full" | "duplicate" | "closed" | "forbidden" {
        const snap = stateRef.current;
        if (!meId || !snap) return "forbidden";
        const s = snap.data.sessions.find((x) => x.id === sessionId);
        const w = s && snap.data.workshops.find((x) => x.id === s.workshopId);
        if (!s || !w || s.hostId !== meId || w.hostId !== meId) return "forbidden";
        if (userId === meId || !snap.data.users.some((u) => u.id === userId)) return "forbidden";
        if (s.status !== "scheduled" || new Date(s.startsAt).getTime() <= Date.now() || w.status === "archived") return "closed";
        if (snap.data.enrollments.some((e) => e.userId === userId && e.sessionId === sessionId)) return "duplicate";
        const n = Math.max(1, Math.floor(seats));
        if (n > seatsLeft(snap.data, s)) return "full";
        const at = now();
        const booking: Enrollment = { id: uid("e"), userId, sessionId, workshopId: w.id, seats: n, at, addedBy: meId };
        const note: AppNotification = { id: uid("n"), userId, type: "workshop", actorId: meId, key: "addedToSession", params: { title: w.title, startsAt: s.startsAt }, href: `/learn/workshop/${w.id}?session=${s.id}`, at, read: false };
        update((d) => ({
          enrollments: [...d.enrollments.filter((e) => !(e.userId === userId && e.sessionId === sessionId)), booking],
          notifications: [note, ...d.notifications.filter((x) => x.id !== note.id)],
        }));
        return "ok";
      },
      /** Host removes a participant's booking from their own session. */
      removeBooking(enrollmentId: string) {
        update((d) => {
          const e = d.enrollments.find((x) => x.id === enrollmentId);
          const s = e && d.sessions.find((x) => x.id === e.sessionId);
          if (!e || !s || s.hostId !== meId) return;
          return {
            enrollments: d.enrollments.filter((x) => x.id !== enrollmentId),
            notifications: [{ id: uid("n"), userId: e.userId, type: "workshop" as const, actorId: meId!, key: "bookingRemoved", params: { title: d.workshops.find((w) => w.id === s.workshopId)?.title ?? "" }, href: `/learn/workshop/${s.workshopId}`, at: now(), read: false }, ...d.notifications],
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
      /* ---------- projects (personal, private by default) ---------- */
      createProject(input: Partial<Omit<Project, "id" | "userId" | "createdAt" | "updatedAt">> & { title: string }, fromIdeaId?: string) {
        if (!meId) return "";
        const id = uid("prj");
        const at = now();
        const project: Project = {
          description: "",
          idea: "",
          recommendations: [],
          materials: [],
          tools: [],
          plan: [],
          checklist: [],
          notes: [],
          photos: [],
          status: "idea",
          ...input,
          id,
          userId: meId,
          createdAt: at,
          updatedAt: at,
        };
        update((d) => ({
          projects: [project, ...(d.projects ?? [])],
          ideas: fromIdeaId ? d.ideas.map((i) => (i.id === fromIdeaId && i.userId === meId ? { ...i, isProject: true, projectId: id } : i)) : d.ideas,
        }));
        return id;
      },
      updateProject(id: string, patch: Partial<Project> | ((p: Project) => Partial<Project>)) {
        if (!meId) return;
        update((d) => ({
          projects: d.projects.map((p) => {
            if (p.id !== id || p.userId !== meId) return p; // only the owner can change a project
            const ch = typeof patch === "function" ? patch(p) : patch;
            const { id: _i, userId: _u, createdAt: _c, ...safe } = ch as Project;
            return { ...p, ...safe, updatedAt: now() };
          }),
        }));
      },
      deleteProject(id: string) {
        if (!meId) return;
        update((d) => ({
          projects: d.projects.filter((p) => !(p.id === id && p.userId === meId)),
          ideas: d.ideas.map((i) => (i.projectId === id ? { ...i, isProject: false, projectId: undefined } : i)),
          conversations: d.conversations.map((c) => (c.projectId === id ? { ...c, projectId: undefined } : c)),
        }));
      },

      /* ---------- seller: products ---------- */
      saveProduct(input: ProductInput, opts: { id?: string; status: Product["status"] }): { id: string } | { error: "forbidden" | "not_found" } {
        const snap = stateRef.current;
        if (!meId || !snap) return { error: "forbidden" };
        const existing = opts.id ? snap.data.products.find((p) => p.id === opts.id) : undefined;
        if (opts.id && !existing) return { error: "not_found" };
        if (existing && existing.sellerId !== meId) return { error: "forbidden" };
        const at = now();
        const id = existing?.id ?? uid("pr");
        const availability: Product["availability"] = input.saleType === "ready" ? (input.stock > 0 ? "in_stock" : "sold_out") : "made_to_order";
        const author = snap.data.users.find((u) => u.id === meId);
        const product: Product = {
          ...(existing ?? { views: 0, createdAt: at, lang: author?.contentLang ?? "ru", story: "" }),
          ...input,
          id,
          sellerId: meId,
          availability,
          status: opts.status,
          updatedAt: at,
        } as Product;
        update((d) => ({ products: existing ? d.products.map((p) => (p.id === id ? product : p)) : [product, ...d.products] }));
        return { id };
      },
      setProductStatus(id: string, status: Product["status"]) {
        update((d) => ({ products: d.products.map((p) => (p.id === id && p.sellerId === meId ? { ...p, status, updatedAt: now() } : p)) }));
      },
      deleteProduct(id: string) {
        update((d) => {
          const p = d.products.find((x) => x.id === id);
          if (!p || p.sellerId !== meId) return;
          // Orders keep their own snapshot (title, photo, price), so history stays intact.
          const carts = Object.fromEntries(Object.entries(d.carts).map(([u, items]) => [u, items.filter((c) => c.productId !== id)]));
          return { products: d.products.filter((x) => x.id !== id), carts, favorites: d.favorites.filter((f) => !(f.type === "product" && f.id === id)) };
        });
      },
      viewProduct(id: string) {
        update((d) => {
          const p = d.products.find((x) => x.id === id);
          if (!p || p.sellerId === meId || p.status !== "published") return;
          return { products: d.products.map((x) => (x.id === id ? { ...x, views: x.views + 1 } : x)) };
        });
      },

      /* ---------- host: workshop templates & sessions ---------- */
      /**
       * Saves a template. Published sessions keep their own copy of price/terms/venue:
       * `applyMode` decides whether changes also reach future sessions (see lib/workshops).
       */
      saveWorkshop(input: WorkshopInput, opts: { id?: string; publish?: boolean; applyMode?: ApplyMode }): { id: string; updatedSessions: number; notified: number } | { error: "forbidden" | "not_found" } {
        const snap = stateRef.current;
        if (!meId || !snap) return { error: "forbidden" };
        const existing = opts.id ? snap.data.workshops.find((w) => w.id === opts.id) : undefined;
        if (opts.id && !existing) return { error: "not_found" };
        if (existing && existing.hostId !== meId) return { error: "forbidden" };
        const at = now();
        const id = existing?.id ?? uid("w");
        const author = snap.data.users.find((u) => u.id === meId);
        const status: Workshop["status"] = opts.publish ? "published" : existing?.status ?? "draft";
        const next: Workshop = { ...(existing ?? { createdAt: at, lang: author?.contentLang ?? "ru" }), ...input, id, hostId: meId, status, updatedAt: at } as Workshop;
        let sessions = snap.data.sessions;
        let notes: AppNotification[] = [];
        let updatedSessions = 0;
        if (existing && opts.applyMode && opts.applyMode !== "new") {
          const diff = templateDiffForSessions(existing, next);
          if (diff.price || diff.terms || diff.place) {
            sessions = sessions.map((s) => {
              if (s.workshopId !== id || s.status !== "scheduled" || new Date(s.startsAt).getTime() <= Date.now()) return s;
              const booked = snap.data.enrollments.some((e) => e.sessionId === s.id);
              if (opts.applyMode === "empty" && booked) return s;
              const ns = { ...applyTemplateToSession(s, next, diff), updatedAt: at };
              const changes = significantChanges(s, ns);
              if (!changes.length) return s;
              updatedSessions += 1;
              notes = notes.concat(
                sessionAudience(snap.data, s).map((userId) => ({
                  id: uid("n"), userId, type: "workshop" as const, actorId: meId, key: "sessionChanged", params: { title: next.title }, href: `/learn/workshop/${id}?session=${s.id}`, changes, at, read: false,
                })),
              );
              return ns;
            });
          }
        }
        update((d) => ({
          workshops: existing ? d.workshops.map((w) => (w.id === id ? next : w)) : [next, ...d.workshops],
          sessions,
          notifications: [...notes, ...d.notifications.filter((n) => !notes.some((x) => x.id === n.id))],
        }));
        return { id, updatedSessions, notified: notes.length };
      },
      archiveWorkshop(id: string, archived: boolean) {
        update((d) => ({ workshops: d.workshops.map((w) => (w.id === id && w.hostId === meId && w.status !== "draft" ? { ...w, status: archived ? "archived" : "published", updatedAt: now() } : w)) }));
      },
      deleteWorkshopDraft(id: string) {
        update((d) => {
          const w = d.workshops.find((x) => x.id === id);
          if (!w || w.hostId !== meId || w.status !== "draft") return;
          return { workshops: d.workshops.filter((x) => x.id !== id), sessions: d.sessions.filter((s) => s.workshopId !== id) };
        });
      },
      /** Adds or edits one session. Significant edits notify the people booked on that session (once each). */
      saveSession(workshopId: string, input: SessionInput, sessionId?: string): { id: string; notified: number } | { error: "forbidden" | "not_found" | "seats" } {
        const snap = stateRef.current;
        const w = snap?.data.workshops.find((x) => x.id === workshopId);
        if (!meId || !snap || !w) return { error: "not_found" };
        if (w.hostId !== meId) return { error: "forbidden" };
        const existing = sessionId ? snap.data.sessions.find((s) => s.id === sessionId && s.workshopId === workshopId) : undefined;
        if (sessionId && !existing) return { error: "not_found" };
        if (existing?.status === "cancelled") return { error: "forbidden" };
        if (existing) {
          const taken = (existing.externalSeats ?? 0) + snap.data.enrollments.filter((e) => e.sessionId === existing.id).reduce((n, e) => n + e.seats, 0);
          if (input.seatsTotal < taken) return { error: "seats" };
        }
        const at = now();
        const id = existing?.id ?? uid("s");
        const next: WorkshopSession = {
          ...(existing ?? { createdAt: at, externalSeats: 0, status: "scheduled" as const }),
          ...input,
          id,
          workshopId,
          hostId: meId,
          updatedAt: at,
        } as WorkshopSession;
        let notes: AppNotification[] = [];
        if (existing) {
          const changes = significantChanges(existing, next);
          if (changes.length)
            notes = sessionAudience(snap.data, existing).map((userId) => ({
              id: uid("n"), userId, type: "workshop" as const, actorId: meId, key: "sessionChanged", params: { title: w.title }, href: `/learn/workshop/${w.id}?session=${id}`, changes, at, read: false,
            }));
        }
        update((d) => ({
          sessions: existing ? d.sessions.map((s) => (s.id === id ? next : s)) : [...d.sessions, next],
          notifications: [...notes, ...d.notifications.filter((n) => !notes.some((x) => x.id === n.id))],
        }));
        return { id, notified: notes.length };
      },
      /** Cancels one session (the workshop and its other dates stay). Booked participants are notified. */
      cancelSession(sessionId: string): number {
        const snap = stateRef.current;
        const s = snap?.data.sessions.find((x) => x.id === sessionId);
        const w = s && snap!.data.workshops.find((x) => x.id === s.workshopId);
        if (!meId || !snap || !s || !w || s.hostId !== meId || s.status !== "scheduled") return 0;
        const at = now();
        const notes: AppNotification[] = sessionAudience(snap.data, s).map((userId) => ({
          id: uid("n"), userId, type: "workshop" as const, actorId: meId, key: "sessionCancelled", params: { title: w.title, startsAt: s.startsAt }, href: `/learn/workshop/${w.id}`, at, read: false,
        }));
        update((d) => ({
          sessions: d.sessions.map((x) => (x.id === sessionId ? { ...x, status: "cancelled" as const, cancelledAt: at, updatedAt: at } : x)),
          notifications: [...notes, ...d.notifications.filter((n) => !notes.some((x) => x.id === n.id))],
        }));
        return notes.length;
      },

      /* ---------- authors: tutorials ---------- */
      saveTutorial(input: TutorialInput, opts: { id?: string; status: Tutorial["status"] }): { id: string } | { error: "forbidden" | "not_found" } {
        const snap = stateRef.current;
        if (!meId || !snap) return { error: "forbidden" };
        const existing = opts.id ? snap.data.tutorials.find((x) => x.id === opts.id) : undefined;
        if (opts.id && !existing) return { error: "not_found" };
        if (existing && existing.authorId !== meId) return { error: "forbidden" };
        const at = now();
        const id = existing?.id ?? uid("t");
        const author = snap.data.users.find((u) => u.id === meId);
        const tut: Tutorial = {
          ...(existing ?? { createdAt: at, reviews: [], views: 0, lang: author?.contentLang ?? "ru" }),
          ...input,
          format: input.videoUrl ? "video" : "steps",
          id,
          authorId: meId,
          status: opts.status,
          updatedAt: at,
        } as Tutorial;
        update((d) => ({ tutorials: existing ? d.tutorials.map((x) => (x.id === id ? tut : x)) : [tut, ...d.tutorials] }));
        return { id };
      },
      setTutorialStatus(id: string, status: Tutorial["status"]) {
        update((d) => ({ tutorials: d.tutorials.map((x) => (x.id === id && x.authorId === meId ? { ...x, status, updatedAt: now() } : x)) }));
      },
      deleteTutorial(id: string) {
        update((d) => {
          const tu = d.tutorials.find((x) => x.id === id);
          if (!tu || tu.authorId !== meId) return;
          // Purchases stay as payment records; the material itself and saves are removed.
          return { tutorials: d.tutorials.filter((x) => x.id !== id), favorites: d.favorites.filter((f) => !(f.type === "tutorial" && f.id === id)) };
        });
      },
      viewTutorial(id: string) {
        update((d) => {
          const tu = d.tutorials.find((x) => x.id === id);
          if (!tu || tu.authorId === meId || tu.status !== "published") return;
          return { tutorials: d.tutorials.map((x) => (x.id === id ? { ...x, views: (x.views ?? 0) + 1 } : x)) };
        });
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

  return { state, ready: state !== null, me, meId, settings, actions, storageError };
}

export type ProductInput = Omit<Product, "id" | "sellerId" | "availability" | "status" | "createdAt" | "updatedAt" | "views" | "lang" | "story"> & { story?: string };
export type WorkshopInput = Omit<Workshop, "id" | "hostId" | "status" | "createdAt" | "updatedAt" | "lang">;
export type SessionInput = Omit<WorkshopSession, "id" | "workshopId" | "hostId" | "status" | "createdAt" | "updatedAt" | "cancelledAt" | "externalSeats">;
export type TutorialInput = Omit<Tutorial, "id" | "authorId" | "status" | "createdAt" | "updatedAt" | "views" | "lang" | "reviews" | "format">;

/** Upgrades a v3 demo database in place: keeps every user change, fills new fields, adds new demo records. */
function migrateV3(old: AppState): AppState {
  const fresh = buildSeed();
  const d = old.data as SeedData & { projects?: Project[] };
  const techOf = new Map<string, string | undefined>([
    ...fresh.posts.map((p) => [p.id, p.technique] as const),
    ...fresh.products.map((p) => [p.id, p.technique] as const),
    ...fresh.tutorials.map((p) => [p.id, p.technique] as const),
  ]);
  const products = d.products.map((p) => ({
    ...p,
    status: p.status ?? "published",
    saleType: p.saleType ?? (p.availability === "made_to_order" ? "to_order" : "ready"),
    technique: p.technique ?? techOf.get(p.id),
  })) as Product[];
  // Workshops stay in the old one-date shape here; migrateV4 splits them into templates + sessions.
  const workshops = (d.workshops as unknown as LegacyWorkshop[]).map((w) => ({ ...w, status: w.status ?? "published" }));
  const addMissing = <T extends { id: string }>(list: T[], extra: T[]) => [...list, ...extra.filter((x) => !list.some((y) => y.id === x.id))];
  let projects: Project[] = d.projects ?? [];
  const ideas = d.ideas.map((i) => {
    if (!i.isProject || i.projectId) return i;
    const pid = i.id === "i1" ? "prj1" : `prj_${i.id}`;
    if (pid !== "prj1") {
      projects = [...projects, { id: pid, userId: i.userId, title: i.title, description: i.text, idea: i.text, recommendations: [], materials: [], tools: [], plan: [], checklist: [], notes: [], photos: [], conversationId: i.conversationId, status: "idea", createdAt: i.createdAt, updatedAt: i.createdAt }];
    }
    return { ...i, projectId: pid };
  });
  return {
    ...old,
    version: 4 as unknown as 6, // intermediate step, finished by migrateV4
    data: {
      ...d,
      posts: d.posts.map((p) => ({ ...p, technique: p.technique ?? techOf.get(p.id) })),
      tutorials: d.tutorials.map((x) => ({ ...x, technique: x.technique ?? techOf.get(x.id), format: x.format ?? "steps" })),
      products: addMissing(products, fresh.products.filter((p) => p.id === "pr17")),
      workshops: workshops as unknown as Workshop[],
      projects: addMissing(projects, fresh.projects),
      ideas,
    },
  };
}

/**
 * v4 → v5: one-date workshops (and former "events") become templates with one session each;
 * bookings are attached to that session. Nothing is deleted: cancelled ones keep their
 * cancelled session, drafts stay drafts. Tutorials get an authoring status.
 */
function migrateV4(old: AppState): AppState {
  const fresh = buildSeed();
  const d = old.data as SeedData & { sessions?: WorkshopSession[] };
  if (d.sessions) return { ...old, version: 5 as unknown as 6 };
  const legacy = d.workshops as unknown as LegacyWorkshop[];
  const legacyEnrollments = d.enrollments as unknown as { userId: string; workshopId: string; at: string }[];
  const enrollments = legacyEnrollments.map(legacyEnrollment);
  const workshops: Workshop[] = [];
  const sessions: WorkshopSession[] = [];
  for (const lw of legacy) {
    const { template, session } = splitLegacy(lw, enrollments.filter((e) => e.workshopId === lw.id).length);
    workshops.push(template);
    sessions.push(session);
  }
  // Extra demo dates for seeded templates that exist in this database.
  for (const s of fresh.sessions.filter((x) => !x.id.endsWith("_s1"))) {
    if (workshops.some((w) => w.id === s.workshopId)) sessions.push(s);
  }
  const extraBookings = fresh.enrollments.filter((e) => sessions.some((s) => s.id === e.sessionId) && !enrollments.some((x) => x.id === e.id) && !e.sessionId.endsWith("_s1"));
  const tutorials = d.tutorials.map((x) => ({ ...x, status: x.status ?? "published", views: x.views ?? fresh.tutorials.find((f) => f.id === x.id)?.views ?? 0 })) as Tutorial[];
  const draft = fresh.tutorials.find((x) => x.id === "t10");
  return {
    ...old,
    version: 5 as unknown as 6, // finished by migrateV5
    data: {
      ...d,
      workshops,
      sessions,
      enrollments: [...enrollments, ...extraBookings],
      tutorials: draft && !tutorials.some((x) => x.id === "t10") ? [...tutorials, draft] : tutorials,
      reminderLog: d.reminderLog ?? [],
      // Notifications about former events keep working: their links point at the same template id.
    },
  };
}

/**
 * v5 → v6: only two buyer confirmations remain (readiness and receipt).
 * Orders waiting in "ready" get a readiness request derived from their history; buyer answers pending on
 * other steps are dropped (no longer required). Readiness demo orders are added. No data is removed.
 */
function migrateV5(old: AppState): AppState {
  const fresh = buildSeed();
  const orders = old.data.orders.map((o) => {
    const history = o.history.map((h) => (h.ack === "pending" && h.status !== "ready" ? { ...h, ack: undefined } : h));
    if (o.status !== "ready" || o.readyRequestedAt) return { ...o, history };
    const req = [...history].reverse().find((h) => h.status === "ready" && !h.kind && h.from);
    const photos = req?.photos ?? (req?.photo ?? o.readyPhoto ? [(req?.photo ?? o.readyPhoto)!] : []);
    const confirmed = req?.ack === "confirmed";
    return {
      ...o,
      history: history.map((h) => (h === req && !h.ack ? { ...h, ack: "pending" as const } : h)),
      readyPhotos: photos,
      readyPhoto: photos[0],
      readyRequestedAt: req?.at ?? o.createdAt,
      readyConfirmedAt: confirmed ? req!.at : undefined,
    };
  });
  const users = new Set(old.data.users.map((u) => u.id));
  const products = new Set(old.data.products.map((p) => p.id));
  const extra = fresh.orders.filter((o) => o.id.startsWith("o2") && !orders.some((x) => x.id === o.id) && users.has(o.buyerId) && users.has(o.sellerId) && o.items.every((i) => products.has(i.productId)));
  return { ...old, version: 6, data: { ...old.data, orders: [...orders, ...extra] } };
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
