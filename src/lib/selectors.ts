import type { SeedData } from "@/data/seed";
import type { CartItem, FavoriteType, Money, Product } from "./types";

export const userById = (d: SeedData, id: string) => d.users.find((u) => u.id === id);
export const userByName = (d: SeedData, username: string) => d.users.find((u) => u.username === username);

/** Seeded demo counter of likes from the wider (non-demo) community + real likes in the app. */
export function likeCount(d: SeedData, postId: string) {
  const post = d.posts.find((p) => p.id === postId);
  const base = post ? Math.floor(post.views / 14) : 0;
  return base + d.likes.filter((l) => l.postId === postId).length;
}
export const isLiked = (d: SeedData, me: string | null, postId: string) => !!me && d.likes.some((l) => l.userId === me && l.postId === postId);
export const commentsOf = (d: SeedData, postId: string) => d.comments.filter((c) => c.postId === postId).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
export const isFav = (d: SeedData, me: string | null, type: FavoriteType, id: string) => !!me && d.favorites.some((f) => f.userId === me && f.type === type && f.id === id);
export const isFollowing = (d: SeedData, me: string | null, id: string) => !!me && d.follows.some((f) => f.followerId === me && f.followingId === id);
export const followersOf = (d: SeedData, id: string) => d.follows.filter((f) => f.followingId === id);
export const followingOf = (d: SeedData, id: string) => d.follows.filter((f) => f.followerId === id);
export const postsOf = (d: SeedData, id: string) => d.posts.filter((p) => p.authorId === id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
/** Public listings: drafts/hidden products and draft events are never shown on profiles. */
export const productsOf = (d: SeedData, id: string) => d.products.filter((p) => p.sellerId === id && p.status === "published");
export const workshopsOf = (d: SeedData, id: string) => d.workshops.filter((w) => w.hostId === id && w.status !== "draft");
export const tutorialsOf = (d: SeedData, id: string) => d.tutorials.filter((t) => t.authorId === id);

export function cartOf(d: SeedData, me: string | null): CartItem[] {
  return me ? d.carts[me] ?? [] : [];
}
export function cartCount(d: SeedData, me: string | null) {
  return cartOf(d, me).reduce((s, c) => s + c.qty, 0);
}

export function rating(reviews: { rating: number }[]) {
  if (!reviews.length) return null;
  return Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10;
}

export function canShipTo(p: Product, country: string) {
  return p.shipsTo.includes(country);
}

/** Sums money values grouped by currency — there is no currency conversion. */
export function sumByCurrency(items: Money[]): Money[] {
  const map = new Map<string, number>();
  items.forEach((m) => map.set(m.currency, (map.get(m.currency) ?? 0) + m.amount));
  return [...map.entries()].map(([currency, amount]) => ({ currency: currency as Money["currency"], amount: Math.round(amount * 100) / 100 }));
}

export function unreadCount(d: SeedData, me: string | null) {
  return me ? d.notifications.filter((n) => n.userId === me && !n.read).length : 0;
}
