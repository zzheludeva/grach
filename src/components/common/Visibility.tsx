"use client";
import { Globe, Link2, Lock } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";
import type { Visibility } from "@/lib/types";
import { Badge } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

const ICON = { public: Globe, link: Link2, private: Lock } as const;
export const VISIBILITIES: Visibility[] = ["public", "link", "private"];

/** Three access options as radio cards (tutorials and collections use the same choice). */
export function VisibilityPicker({ value, onChange, name = "visibility" }: { value: Visibility; onChange: (v: Visibility) => void; name?: string }) {
  const { t } = useI18n();
  return (
    <div role="radiogroup" aria-label={t("vis.title")} className="grid gap-2 sm:grid-cols-3">
      {VISIBILITIES.map((v) => {
        const Icon = ICON[v];
        const on = value === v;
        return (
          <label
            key={v}
            className={cn(
              "flex min-h-14 cursor-pointer items-start gap-2.5 rounded-xl border p-3 transition-colors",
              on ? "border-ink bg-ink-soft/60" : "border-line bg-surface hover:border-ink/40",
            )}
          >
            <input type="radio" name={name} value={v} checked={on} onChange={() => onChange(v)} className="sr-only" />
            <Icon className={cn("mt-0.5 size-4 shrink-0", v === "public" ? "text-teal" : v === "link" ? "text-rust" : "text-muted")} />
            <span className="min-w-0">
              <span className="block text-sm font-bold text-ink">{t(`vis.${v}`)}</span>
              <span className="block text-xs text-muted">{t(`vis.${v}Hint`)}</span>
            </span>
          </label>
        );
      })}
    </div>
  );
}

export function VisibilityBadge({ value }: { value: Visibility }) {
  const { t } = useI18n();
  const Icon = ICON[value];
  return (
    <Badge tone={value === "public" ? "info" : value === "link" ? "rust" : "neutral"}>
      <Icon className="size-3" /> {t(`vis.${value}`)}
    </Badge>
  );
}
