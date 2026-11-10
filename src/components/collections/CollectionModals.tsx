"use client";
import { useState } from "react";
import { Check, FolderPlus, Plus } from "lucide-react";
import { useStore } from "@/lib/store";
import { useI18n } from "@/i18n/I18nProvider";
import type { Collection, FavoriteType, Visibility } from "@/lib/types";
import { Field, Input, Textarea } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { VisibilityBadge, VisibilityPicker } from "@/components/common/Visibility";
import { cn } from "@/lib/utils";

/** Create or edit a collection: title, optional description, visibility. */
export function CollectionEditModal({
  open,
  onClose,
  collection,
  firstItem,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  collection?: Collection;
  firstItem?: { type: FavoriteType; id: string };
  onSaved?: (id: string) => void;
}) {
  const { t } = useI18n();
  const { actions } = useStore();
  const toast = useToast();
  const [title, setTitle] = useState(collection?.title ?? "");
  const [description, setDescription] = useState(collection?.description ?? "");
  const [visibility, setVisibility] = useState<Visibility>(collection?.visibility ?? "private");
  const [err, setErr] = useState(false);
  const save = () => {
    if (!title.trim()) return setErr(true);
    if (collection) {
      actions.updateCollection(collection.id, { title, description, visibility });
      toast({ text: t("colx.toast.saved") });
      onSaved?.(collection.id);
    } else {
      const id = actions.createCollection({ title, description, visibility }, firstItem);
      if (!id) return;
      toast({ text: firstItem ? t("colx.toast.createdWith") : t("colx.toast.created") });
      onSaved?.(id);
    }
    onClose();
  };
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={collection ? t("colx.edit") : t("colx.new")}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>{t("common.cancel")}</Button>
          <Button onClick={save}>{collection ? t("common.save") : t("colx.create")}</Button>
        </>
      }
    >
      <div className="space-y-4 p-5">
        <Field label={t("colx.titleLabel")} error={err ? t("colx.titleRequired") : undefined}>
          {(id, d) => <Input id={id} aria-describedby={d} aria-invalid={err} value={title} onChange={(e) => { setTitle(e.target.value); setErr(false); }} maxLength={80} placeholder={t("colx.titlePh")} />}
        </Field>
        <Field label={`${t("colx.descLabel")} (${t("common.optional")})`}>
          {(id) => <Textarea id={id} rows={2} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={300} />}
        </Field>
        <div>
          <p className="mb-1.5 text-[13px] font-semibold text-ink">{t("vis.title")}</p>
          <VisibilityPicker value={visibility} onChange={setVisibility} name="col-visibility" />
        </div>
      </div>
    </Modal>
  );
}

/** "Add to collection": tick existing collections or create a new one with this item — without leaving the page. */
export function CollectionPicker({ item, onClose }: { item: { type: FavoriteType; id: string } | null; onClose: () => void }) {
  const { t } = useI18n();
  const { state, meId, actions } = useStore();
  const toast = useToast();
  const [creating, setCreating] = useState(false);
  const mine = (state?.data.collections ?? []).filter((c) => c.ownerId === meId);
  if (!item) return null;
  return (
    <>
      <Modal
        open={!creating}
        onClose={onClose}
        title={t("colx.addTo")}
        footer={<Button onClick={onClose}>{t("colx.done")}</Button>}
      >
        <div className="space-y-2 p-5">
          {mine.length === 0 && <p className="text-sm text-muted">{t("colx.noneYet")}</p>}
          <ul className="max-h-80 space-y-1.5 overflow-y-auto">
            {mine.map((c) => {
              const has = c.items.some((i) => i.type === item.type && i.id === item.id);
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    aria-pressed={has}
                    onClick={() => {
                      if (has) {
                        actions.removeFromCollection(c.id, item.type, item.id);
                        toast({ text: t("colx.toast.removed", { title: c.title }), tone: "info" });
                      } else {
                        actions.addToCollection(c.id, item.type, item.id);
                        toast({ text: t("colx.toast.added", { title: c.title }) });
                      }
                    }}
                    className={cn("flex min-h-12 w-full items-center gap-3 rounded-xl border px-3 py-2 text-start", has ? "border-ink bg-ink-soft/60" : "border-line hover:border-ink/40")}
                  >
                    <span className={cn("flex size-6 shrink-0 items-center justify-center rounded-md border", has ? "border-ink bg-ink text-white" : "border-line bg-surface")}>
                      {has && <Check className="size-4" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold text-ink">{c.title}</span>
                      <span className="block text-xs text-muted">{t("colx.items", { count: c.items.length })}</span>
                    </span>
                    <VisibilityBadge value={c.visibility} />
                  </button>
                </li>
              );
            })}
          </ul>
          <Button variant="secondary" className="w-full justify-center" onClick={() => setCreating(true)}>
            <FolderPlus className="size-4" /> {t("colx.newWithItem")}
          </Button>
        </div>
      </Modal>
      {creating && <CollectionEditModal open firstItem={item} onClose={() => { setCreating(false); onClose(); }} />}
    </>
  );
}

/** Button for detail pages: opens the collection picker for this object. */
export function AddToCollectionButton({ type, id, className, onOpen }: { type: FavoriteType; id: string; className?: string; onOpen: (item: { type: FavoriteType; id: string }) => void }) {
  const { t } = useI18n();
  return (
    <button
      type="button"
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); onOpen({ type, id }); }}
      className={cn("inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-line bg-surface px-4 text-sm font-semibold text-ink transition-colors hover:border-ink/40", className)}
    >
      <Plus className="size-4" /> {t("colx.addTo")}
    </button>
  );
}
