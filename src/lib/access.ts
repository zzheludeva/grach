import type { SeedData } from "@/data/seed";
import type { Collection, FavoriteType, Tutorial, Visibility } from "./types";

/**
 * Access rules for tutorials and collections. The same rules are enforced by Supabase RLS and the
 * security-definer functions in supabase/migrations/20261124_iteration6.sql; in the demo every page and
 * list goes through these helpers, so a private object can't be opened by a direct URL either.
 *
 *  - public  → anyone; listed in catalogues, profiles and search;
 *  - private → only the owner (also when it is inside someone's public collection);
 *  - link    → anyone who opened the secret link (?k=token). Never listed anywhere. Opening the link once
 *              grants access to that person until the owner regenerates the link or changes visibility.
 * A tutorial's own visibility always wins over the visibility of a collection that contains it.
 */

export const visibilityOf = (x: { visibility?: Visibility }): Visibility => x.visibility ?? "public";

/** Random, unguessable share token (base64url, 128 bits). */
export function newShareToken() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function hasGrant(d: SeedData, viewerId: string | null, kind: "tutorial" | "collection", id: string, token?: string) {
  if (!viewerId || !token) return false;
  return (d.linkGrants ?? []).some((g) => g.userId === viewerId && g.kind === kind && g.id === id && g.token === token);
}

/** Shown in catalogues, search, profiles and recommendations. */
export function isTutorialListed(t: Tutorial) {
  return t.status === "published" && visibilityOf(t) === "public";
}

export type AccessResult = "owner" | "allowed" | "denied";

export function tutorialAccess(d: SeedData, t: Tutorial | undefined, viewerId: string | null, key?: string | null): AccessResult {
  if (!t) return "denied";
  if (viewerId && t.authorId === viewerId) return "owner";
  if (t.status !== "published") return "denied";
  const v = visibilityOf(t);
  if (v === "public") return "allowed";
  if (v === "private") return "denied";
  // link
  if (key && t.shareToken && key === t.shareToken) return "allowed";
  return hasGrant(d, viewerId, "tutorial", t.id, t.shareToken) ? "allowed" : "denied";
}

export function collectionAccess(d: SeedData, c: Collection | undefined, viewerId: string | null, key?: string | null): AccessResult {
  if (!c) return "denied";
  if (viewerId && c.ownerId === viewerId) return "owner";
  if (c.visibility === "public") return "allowed";
  if (c.visibility === "private") return "denied";
  if (key && key === c.shareToken) return "allowed";
  return hasGrant(d, viewerId, "collection", c.id, c.shareToken) ? "allowed" : "denied";
}

/** Can this viewer see a referenced object inside a collection? Each object keeps its own rules. */
export function itemVisible(d: SeedData, type: FavoriteType, id: string, viewerId: string | null): boolean {
  if (type === "tutorial") return tutorialAccess(d, d.tutorials.find((x) => x.id === id), viewerId) !== "denied";
  if (type === "product") {
    const p = d.products.find((x) => x.id === id);
    return !!p && (p.status === "published" || p.sellerId === viewerId);
  }
  if (type === "workshop") {
    const w = d.workshops.find((x) => x.id === id);
    return !!w && (w.status !== "draft" || w.hostId === viewerId);
  }
  return d.posts.some((x) => x.id === id);
}

export function tutorialLink(t: Tutorial, origin = "") {
  return `${origin}/learn/tutorial/${t.id}${visibilityOf(t) === "link" && t.shareToken ? `?k=${t.shareToken}` : ""}`;
}
export function collectionLink(c: Collection, origin = "") {
  return `${origin}/collections/${c.id}${c.visibility === "link" ? `?k=${c.shareToken}` : ""}`;
}
