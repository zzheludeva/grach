"use client";
import { useState } from "react";
import { Plus, X } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";
import { Input } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ProjectItem } from "@/lib/types";

/** Editable list of project items (plan steps, checklist stages). */
export function ItemList({
  items,
  onChange,
  addLabel,
  empty,
  checkable = false,
  numbered = false,
}: {
  items: ProjectItem[];
  onChange: (items: ProjectItem[]) => void;
  addLabel: string;
  empty: string;
  checkable?: boolean;
  numbered?: boolean;
}) {
  const { t } = useI18n();
  const [text, setText] = useState("");
  const add = () => {
    const v = text.trim();
    if (!v) return;
    onChange([...items, { id: `pi_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, text: v, done: checkable ? false : undefined, at: new Date().toISOString() }]);
    setText("");
  };
  return (
    <div>
      {items.length === 0 ? (
        <p className="mb-2 text-sm text-muted">{empty}</p>
      ) : (
        <ol className="mb-3 space-y-1.5">
          {items.map((it, i) => (
            <li key={it.id} className="group flex items-start gap-2 rounded-xl px-2 py-1.5 hover:bg-bg">
              {checkable ? (
                <input
                  type="checkbox"
                  checked={!!it.done}
                  onChange={() => onChange(items.map((x) => (x.id === it.id ? { ...x, done: !x.done } : x)))}
                  className="mt-1 size-4 shrink-0 accent-[var(--color-teal)]"
                  aria-label={it.text}
                />
              ) : numbered ? (
                <span className="nums mt-0.5 w-5 shrink-0 text-sm font-bold text-rust">{i + 1}.</span>
              ) : null}
              <span className={cn("min-w-0 flex-1 text-sm text-ink", checkable && it.done && "text-muted line-through")}>{it.text}</span>
              <button
                type="button"
                onClick={() => onChange(items.filter((x) => x.id !== it.id))}
                className="rounded-md p-1 text-faint opacity-60 hover:text-rose-deep group-hover:opacity-100"
                aria-label={`${t("common.delete")}: ${it.text}`}
              >
                <X className="size-3.5" />
              </button>
            </li>
          ))}
        </ol>
      )}
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}
      >
        <Input value={text} onChange={(e) => setText(e.target.value)} placeholder={addLabel} aria-label={addLabel} className="h-10" maxLength={300} />
        <Button type="submit" variant="soft" className="w-10 shrink-0 px-0" disabled={!text.trim()} aria-label={addLabel}>
          <Plus className="size-4" />
        </Button>
      </form>
    </div>
  );
}

/** Editable tag list (materials, tools). */
export function TagList({ values, onChange, addLabel }: { values: string[]; onChange: (v: string[]) => void; addLabel: string }) {
  const { t } = useI18n();
  const [text, setText] = useState("");
  const add = () => {
    const parts = text.split(",").map((x) => x.trim()).filter(Boolean).filter((x) => !values.includes(x));
    if (!parts.length) return;
    onChange([...values, ...parts]);
    setText("");
  };
  return (
    <div>
      {values.length > 0 && (
        <ul className="mb-2 flex flex-wrap gap-1.5">
          {values.map((v) => (
            <li key={v} className="inline-flex items-center gap-1 rounded-full border border-line bg-bg px-2.5 py-1 text-[13px] text-ink">
              {v}
              <button type="button" onClick={() => onChange(values.filter((x) => x !== v))} className="text-faint hover:text-rose-deep" aria-label={`${t("common.delete")}: ${v}`}>
                <X className="size-3" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}
      >
        <Input value={text} onChange={(e) => setText(e.target.value)} placeholder={addLabel} aria-label={addLabel} className="h-10" maxLength={200} />
        <Button type="submit" variant="soft" className="w-10 shrink-0 px-0" disabled={!text.trim()} aria-label={addLabel}>
          <Plus className="size-4" />
        </Button>
      </form>
    </div>
  );
}
