"use client";
import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowDown, ArrowUp, Copy, FolderOpen, Pencil, RefreshCw, Trash, X } from "lucide-react";
import { useStore } from "@/lib/store";
import { useI18n } from "@/i18n/I18nProvider";
import { collectionAccess, collectionLink, itemVisible } from "@/lib/access";
import { userById } from "@/lib/selectors";
import { Avatar, EmptyState } from "@/components/ui/primitives";
import { Button, ButtonLink } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { BackLink } from "@/components/common/BackLink";
import { VisibilityBadge } from "@/components/common/Visibility";
import { CollectionItem } from "@/components/collections/CollectionViews";
import { CollectionEditModal } from "@/components/collections/CollectionModals";

/**
 * A collection page. Access: owner always; public — everyone; link — with a valid ?k= (then remembered for
 * this person); private — owner only. Private and missing collections look the same to others.
 * Every item keeps its own access rules (a private tutorial stays hidden inside a public collection).
 */
export default function CollectionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const sp = useSearchParams();
  const key = sp.get("k");
  const router = useRouter();
  const { state, meId, actions } = useStore();
  const { t, relative } = useI18n();
  const toast = useToast();
  const d = state!.data;
  const c = d.collections.find((x) => x.id === id);
  const access = collectionAccess(d, c, meId, key);
  const [edit, setEdit] = useState(false);
  const [del, setDel] = useState(false);

  useEffect(() => {
    if (key && access === "allowed") actions.redeemLink("collection", id, key);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, access]);

  if (!c || access === "denied") {
    return <EmptyState icon={<FolderOpen className="size-6" />} title={t("colx.unavailable")} text={t("colx.unavailableText")} action={<ButtonLink href="/favorites?tab=collections">{t("colx.tab")}</ButtonLink>} />;
  }
  const owner = access === "owner";
  const author = userById(d, c.ownerId);
  const shown = owner ? c.items : c.items.filter((i) => itemVisible(d, i.type, i.id, meId));
  const copy = () => {
    navigator.clipboard?.writeText(collectionLink(c, window.location.origin)).catch(() => {});
    toast({ text: t("vis.copied") });
  };

  return (
    <div className="mx-auto max-w-6xl">
      <BackLink fallback={owner ? "/favorites?tab=collections" : author ? `/profile/${author.username}` : "/feed"} fallbackLabel={owner ? t("colx.tab") : author?.name ?? t("nav.feed")} className="mb-2" />
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 max-w-2xl">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <VisibilityBadge value={c.visibility} />
            <span className="text-xs text-faint">{t("colx.items", { count: shown.length })} · {t("colx.updated", { when: relative(c.updatedAt) })}</span>
          </div>
          <h1 className="hyphens-auto break-words font-display text-[26px] leading-tight text-ink min-[400px]:text-3xl sm:text-4xl">{c.title}</h1>
          {c.description && <p className="mt-2 whitespace-pre-line text-[15px] text-muted">{c.description}</p>}
          {author && !owner && (
            <Link href={`/profile/${author.username}`} className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-ink hover:underline">
              <Avatar name={author.name} color={author.avatarColor} size={28} /> {author.name}
            </Link>
          )}
        </div>
        {owner && (
          <div className="flex flex-wrap gap-2">
            {c.visibility !== "private" && (
              <Button variant="secondary" size="sm" onClick={copy}><Copy className="size-3.5" /> {t("vis.copy")}</Button>
            )}
            <Button variant="soft" size="sm" onClick={() => setEdit(true)}><Pencil className="size-3.5" /> {t("common.edit")}</Button>
            {c.visibility === "link" && (
              <Button variant="ghost" size="sm" onClick={() => { actions.regenerateCollectionLink(c.id); toast({ text: t("vis.regenerated"), tone: "info" }); }} title={t("vis.regenerateHint")}>
                <RefreshCw className="size-3.5" /> {t("vis.regenerate")}
              </Button>
            )}
            <Button variant="ghost" size="sm" className="text-rose-deep" onClick={() => setDel(true)}><Trash className="size-3.5" /> {t("common.delete")}</Button>
          </div>
        )}
      </div>
      {owner && <p className="-mt-3 mb-5 text-xs text-muted">{t(`vis.${c.visibility}Hint`)}</p>}

      {shown.length === 0 ? (
        <EmptyState icon={<FolderOpen className="size-6" />} title={t("colx.emptyItems")} text={owner ? t("colx.emptyItemsText") : undefined} />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {shown.map((it, i) => (
            <li key={`${it.type}:${it.id}`} className="relative">
              <CollectionItem type={it.type} id={it.id} />
              {owner && (
                <div className="mt-1.5 flex items-center justify-between gap-1">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-faint">{t(`favorites.tab.${it.type}`)}</span>
                  <div className="flex gap-0.5">
                    <button onClick={() => actions.moveCollectionItem(c.id, i, -1)} disabled={i === 0} className="inline-flex size-9 items-center justify-center rounded-lg text-muted hover:bg-ink-soft disabled:opacity-30" aria-label={t("colx.moveUp")}><ArrowUp className="size-4" /></button>
                    <button onClick={() => actions.moveCollectionItem(c.id, i, 1)} disabled={i === shown.length - 1} className="inline-flex size-9 items-center justify-center rounded-lg text-muted hover:bg-ink-soft disabled:opacity-30" aria-label={t("colx.moveDown")}><ArrowDown className="size-4" /></button>
                    <button
                      onClick={() => { actions.removeFromCollection(c.id, it.type, it.id); toast({ text: t("colx.toast.removedKept"), tone: "info" }); }}
                      className="inline-flex size-9 items-center justify-center rounded-lg text-muted hover:bg-rose-soft hover:text-rose-deep"
                      aria-label={t("colx.removeItem")}
                      title={t("colx.removeItem")}
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {edit && <CollectionEditModal open collection={c} onClose={() => setEdit(false)} />}
      <Modal
        open={del}
        onClose={() => setDel(false)}
        title={t("colx.deleteTitle")}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDel(false)}>{t("common.cancel")}</Button>
            <Button variant="danger" onClick={() => { actions.deleteCollection(c.id); setDel(false); toast({ text: t("colx.toast.deleted"), tone: "info" }); router.replace("/favorites?tab=collections"); }}>{t("common.delete")}</Button>
          </>
        }
      >
        <p className="p-5 text-sm text-muted">{t("colx.deleteText")}</p>
      </Modal>
    </div>
  );
}
