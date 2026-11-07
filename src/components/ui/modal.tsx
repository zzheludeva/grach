"use client";
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n/I18nProvider";

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  size = "md",
  className,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}) {
  const { t } = useI18n();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    setTimeout(() => ref.current?.querySelector<HTMLElement>("input,textarea,button,select,a")?.focus(), 30);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      prev?.focus?.();
    };
  }, [open, onClose]);
  if (!open || typeof document === "undefined") return null;
  const widths = { sm: "sm:max-w-md", md: "sm:max-w-lg", lg: "sm:max-w-2xl", xl: "sm:max-w-5xl" };
  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-ink-deep/50 backdrop-blur-[2px]" onClick={onClose} />
      <div
        ref={ref}
        className={cn(
          "relative flex max-h-[92dvh] w-full animate-fade-up flex-col overflow-hidden rounded-t-3xl bg-surface shadow-[var(--shadow-pop)] sm:rounded-3xl",
          widths[size],
          className,
        )}
      >
        {title !== undefined && (
          <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5">
            <h2 className="truncate text-lg font-bold text-ink">{title}</h2>
            <button onClick={onClose} className="rounded-lg p-2 text-muted hover:bg-ink-soft hover:text-ink" aria-label={t("common.close")}>
              <X className="size-5" />
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-line px-5 py-3.5">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
