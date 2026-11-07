"use client";
import { Heart, Bookmark, UserPlus, UserCheck } from "lucide-react";
import { useStore } from "@/lib/store";
import { useI18n } from "@/i18n/I18nProvider";
import { isFav, isFollowing, isLiked, likeCount } from "@/lib/selectors";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import type { FavoriteType } from "@/lib/types";
import { useState } from "react";

export function LikeButton({ postId, className, showCount = true }: { postId: string; className?: string; showCount?: boolean }) {
  const { state, meId, actions } = useStore();
  const { t, num } = useI18n();
  const d = state!.data;
  const liked = isLiked(d, meId, postId);
  const [bump, setBump] = useState(0);
  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        actions.toggleLike(postId);
        setBump((b) => b + 1);
      }}
      aria-pressed={liked}
      aria-label={liked ? t("post.unlike") : t("post.like")}
      className={cn("inline-flex items-center gap-1.5 rounded-lg px-1.5 py-1 text-sm font-semibold transition-colors", liked ? "text-rose-deep" : "text-muted hover:text-rose-deep", className)}
    >
      <Heart key={bump} className={cn("size-[18px]", liked && "animate-pop fill-rose text-rose")} />
      {showCount && <span className="nums">{num(likeCount(d, postId))}</span>}
    </button>
  );
}

export function SaveButton({
  type,
  id,
  className,
  variant = "icon",
}: {
  type: FavoriteType;
  id: string;
  className?: string;
  variant?: "icon" | "glass" | "button";
}) {
  const { state, meId, actions } = useStore();
  const { t } = useI18n();
  const toast = useToast();
  const saved = isFav(state!.data, meId, type, id);
  const onClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    actions.toggleFavorite(type, id);
    toast({
      text: saved ? t("favorites.removed") : t("favorites.added"),
      tone: saved ? "info" : "success",
      action: saved ? undefined : { label: t("favorites.open"), href: `/favorites?tab=${type}` },
    });
  };
  const label = saved ? t("favorites.unsave") : t("favorites.save");
  if (variant === "button")
    return (
      <button
        onClick={onClick}
        aria-pressed={saved}
        className={cn(
          "inline-flex h-10 items-center gap-2 rounded-xl border px-4 text-sm font-semibold transition-colors",
          saved ? "border-ink bg-ink-soft text-ink" : "border-line bg-surface text-ink hover:border-ink/40",
          className,
        )}
      >
        <Bookmark className={cn("size-4", saved && "fill-ink")} />
        {saved ? t("favorites.saved") : t("favorites.save")}
      </button>
    );
  return (
    <button
      onClick={onClick}
      aria-pressed={saved}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex items-center justify-center rounded-lg transition-colors",
        variant === "glass" ? "size-9 bg-white/90 text-ink shadow-sm backdrop-blur hover:bg-white" : "p-1.5 text-muted hover:text-ink",
        className,
      )}
    >
      <Bookmark className={cn("size-[18px]", saved && "fill-ink text-ink")} />
    </button>
  );
}

export function FollowButton({ userId, size = "sm", className }: { userId: string; size?: "sm" | "md"; className?: string }) {
  const { state, meId, actions } = useStore();
  const { t } = useI18n();
  if (!meId || userId === meId) return null;
  const following = isFollowing(state!.data, meId, userId);
  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        actions.toggleFollow(userId);
      }}
      aria-pressed={following}
      className={cn(
        "inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg font-semibold transition-colors",
        size === "sm" ? "h-8 px-3 text-[13px]" : "h-10 px-4 text-sm",
        following ? "border border-line bg-surface text-muted hover:border-rose/50 hover:text-rose-deep" : "bg-ink text-white hover:bg-ink-deep",
        className,
      )}
    >
      {following ? <UserCheck className="size-4" /> : <UserPlus className="size-4" />}
      {following ? t("follow.following") : t("follow.follow")}
    </button>
  );
}
