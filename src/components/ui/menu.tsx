"use client";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export function Dropdown({
  trigger,
  children,
  align = "end",
  side = "bottom",
  className,
}: {
  trigger: (props: { onClick: () => void; "aria-expanded": boolean; "aria-haspopup": "menu" }) => React.ReactNode;
  children: (close: () => void) => React.ReactNode;
  align?: "start" | "end";
  side?: "bottom" | "top";
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  return (
    <div ref={ref} className="relative">
      {trigger({ onClick: () => setOpen((o) => !o), "aria-expanded": open, "aria-haspopup": "menu" })}
      {open && (
        <div
          role="menu"
          className={cn(
            "absolute z-[70] min-w-56 animate-fade-up rounded-2xl border border-line bg-surface p-1.5 shadow-[var(--shadow-pop)]",
            align === "end" ? "end-0" : "start-0",
            side === "bottom" ? "top-full mt-2" : "bottom-full mb-2",
            className,
          )}
        >
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}

export function MenuItem({
  icon,
  children,
  onClick,
  className,
  trailing,
}: {
  icon?: React.ReactNode;
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  trailing?: React.ReactNode;
}) {
  return (
    <button
      role="menuitem"
      onClick={onClick}
      className={cn("flex w-full items-center gap-3 rounded-xl px-3 py-2 text-start text-sm font-medium text-ink hover:bg-ink-soft/70", className)}
    >
      {icon && <span className="text-muted [&>svg]:size-4">{icon}</span>}
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {trailing}
    </button>
  );
}
