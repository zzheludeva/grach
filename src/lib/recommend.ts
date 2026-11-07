import type { SeedData } from "@/data/seed";
import type { CategoryId, Post } from "./types";
import { likeCount } from "./selectors";
import { hashStr } from "./utils";
import { CATEGORIES } from "@/i18n/content";

export type FeedMode = "foryou" | "following" | "popular" | "new";
export interface FeedEntry {
  post: Post;
  discovery?: boolean; // shown to widen horizons
  reason?: "interest" | "following" | "engaged" | "popular" | "discovery";
}

/**
 * MVP recommendation logic (transparent, rule-based):
 *  score = interests (+3) + follows author (+4) + category engagement (0..3)
 *        + popularity (log likes) + freshness (0..2)
 * Then a diversity pass: no two posts in a row from the same author, and every
 * 5th slot is a "new direction" post from a category the user hasn't explored.
 */
export function buildFeed(d: SeedData, me: string | null, mode: FeedMode, category: CategoryId | null): FeedEntry[] {
  let posts = d.posts.slice();
  if (category) posts = posts.filter((p) => p.category === category);
  const user = me ? d.users.find((u) => u.id === me) : undefined;
  const following = new Set(d.follows.filter((f) => f.followerId === me).map((f) => f.followingId));

  if (mode === "new") return posts.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map((post) => ({ post }));
  if (mode === "popular")
    return posts
      .filter((p) => Date.now() - new Date(p.createdAt).getTime() < 30 * 86400000)
      .sort((a, b) => likeCount(d, b.id) - likeCount(d, a.id))
      .map((post) => ({ post, reason: "popular" }));
  if (mode === "following")
    return posts
      .filter((p) => following.has(p.authorId))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((post) => ({ post, reason: "following" }));

  // "For you"
  const interests = new Set(user?.interests ?? []);
  const views = (me && d.categoryViews[me]) || {};
  const maxView = Math.max(1, ...Object.values(views));
  const explored = new Set<string>([...interests, ...Object.keys(views).filter((k) => views[k] > 0)]);

  const scored = posts
    .filter((p) => p.authorId !== me)
    .map((p) => {
      let score = 0;
      let reason: FeedEntry["reason"] = "popular";
      if (p.category && interests.has(p.category)) {
        score += 3;
        reason = "interest";
      }
      if (following.has(p.authorId)) {
        score += 4;
        reason = "following";
      }
      if (p.category && views[p.category]) {
        score += (3 * views[p.category]) / maxView;
        if (reason === "popular") reason = "engaged";
      }
      score += Math.log10(1 + likeCount(d, p.id));
      const ageDays = (Date.now() - new Date(p.createdAt).getTime()) / 86400000;
      score += Math.max(0, 2 - ageDays / 7);
      score += (hashStr(p.id + (me ?? "")) % 100) / 400; // tiny deterministic jitter
      return { post: p, score, reason };
    })
    .sort((a, b) => b.score - a.score);

  const discoveryPool = category
    ? []
    : scored.filter((s) => s.post.category && !explored.has(s.post.category)).map((s) => s.post);
  const discoveryIds = new Set<string>();
  const main = scored.filter((s) => !discoveryPool.includes(s.post));

  // Diversity: avoid same author back-to-back
  const out: FeedEntry[] = [];
  const queue = main.slice();
  let dIdx = 0;
  while (queue.length || dIdx < discoveryPool.length) {
    if ((out.length + 1) % 5 === 0 && dIdx < discoveryPool.length) {
      const p = discoveryPool[dIdx++];
      discoveryIds.add(p.id);
      out.push({ post: p, discovery: true, reason: "discovery" });
      continue;
    }
    if (!queue.length) {
      const p = discoveryPool[dIdx++];
      out.push({ post: p, discovery: true, reason: "discovery" });
      continue;
    }
    const last = out[out.length - 1]?.post.authorId;
    let idx = queue.findIndex((q) => q.post.authorId !== last);
    if (idx < 0) idx = 0;
    const [pick] = queue.splice(idx, 1);
    out.push({ post: pick.post, reason: pick.reason });
  }
  return out;
}

/** Categories the user has not explored yet — used by the "new direction" block. */
export function unexploredCategories(d: SeedData, me: string | null): CategoryId[] {
  const user = me ? d.users.find((u) => u.id === me) : undefined;
  const views = (me && d.categoryViews[me]) || {};
  const explored = new Set<string>([...(user?.interests ?? []), ...Object.keys(views)]);
  return CATEGORIES.map((c) => c.id).filter((c) => !explored.has(c) && c !== "other" && d.posts.some((p) => p.category === c));
}
