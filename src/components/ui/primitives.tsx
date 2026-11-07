"use client";
import { forwardRef, useId } from "react";
import Link from "next/link";
import { Star } from "lucide-react";
import { cn, initials } from "@/lib/utils";

export function Card({ className, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-[var(--radius-tile)] border border-line bg-surface shadow-[var(--shadow-tile)]", className)} {...rest} />;
}

const badgeTones = {
  neutral: "bg-ink-soft text-ink",
  info: "bg-teal-soft text-ink",
  warn: "bg-saffron-soft text-[#7a4a00]",
  success: "bg-[#e1f3e6] text-[#1f6b3a]",
  danger: "bg-rose-soft text-rose-deep",
  rust: "bg-rust-soft text-rust",
  dark: "bg-ink text-white",
  glass: "bg-white/90 text-ink backdrop-blur",
} as const;
export function Badge({ tone = "neutral", className, children, ...rest }: React.HTMLAttributes<HTMLSpanElement> & { tone?: keyof typeof badgeTones }) {
  return (
    <span className={cn("inline-flex max-w-full items-center gap-1 truncate rounded-md px-2 py-0.5 text-xs font-semibold", badgeTones[tone], className)} {...rest}>
      {children}
    </span>
  );
}

export function Chip({
  active,
  color,
  className,
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean; color?: string }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={cn(
        "inline-flex h-9 shrink-0 items-center gap-2 whitespace-nowrap rounded-full border px-3.5 text-[13px] font-semibold transition-colors",
        active ? "border-ink bg-ink text-white" : "border-line bg-surface text-ink hover:border-ink/40",
        className,
      )}
      {...rest}
    >
      {color && <span className="size-2.5 rotate-45 rounded-[2px]" style={{ background: color }} aria-hidden />}
      {children}
    </button>
  );
}

export function Label({ className, ...rest }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("mb-1.5 block text-[13px] font-semibold text-ink", className)} {...rest} />;
}

const inputBase =
  "w-full rounded-xl border border-line bg-surface px-3.5 text-[15px] text-text placeholder:text-faint transition-colors focus:border-teal focus:outline-none focus:ring-3 focus:ring-teal/20 disabled:bg-bg aria-[invalid=true]:border-rose";

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...rest }, ref) {
  return <input ref={ref} className={cn(inputBase, "h-11", className)} {...rest} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className, ...rest }, ref) {
  return <textarea ref={ref} className={cn(inputBase, "min-h-24 py-2.5 leading-relaxed", className)} {...rest} />;
});

export const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(function Select({ className, children, ...rest }, ref) {
  return (
    <select
      ref={ref}
      className={cn(
        inputBase,
        "h-11 appearance-none bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='none' stroke='%2315484c' stroke-width='2'%3E%3Cpath d='m4 6 4 4 4-4'/%3E%3C/svg%3E\")] bg-[length:16px] bg-[right_12px_center] bg-no-repeat pe-9",
        className,
      )}
      {...rest}
    >
      {children}
    </select>
  );
});

export function Field({
  label,
  error,
  hint,
  children,
  className,
}: {
  label: string;
  error?: string | null;
  hint?: string;
  children: (id: string, describedBy?: string) => React.ReactNode;
  className?: string;
}) {
  const id = useId();
  const descId = error || hint ? `${id}-desc` : undefined;
  return (
    <div className={className}>
      <Label htmlFor={id}>{label}</Label>
      {children(id, descId)}
      {error ? (
        <p id={descId} className="mt-1 text-xs font-semibold text-rose-deep" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p id={descId} className="mt-1 text-xs text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function Tabs<T extends string>({
  value,
  onChange,
  items,
  className,
  size = "md",
}: {
  value: T;
  onChange: (v: T) => void;
  items: { value: T; label: string; count?: number }[];
  className?: string;
  size?: "sm" | "md";
}) {
  return (
    <div role="tablist" className={cn("scrollbar-none flex max-w-full gap-1 overflow-x-auto rounded-xl bg-ink-soft/60 p-1", className)}>
      {items.map((it) => (
        <button
          key={it.value}
          role="tab"
          aria-selected={value === it.value}
          onClick={() => onChange(it.value)}
          className={cn(
            "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg font-semibold transition-colors",
            size === "sm" ? "h-8 px-3 text-[13px]" : "h-9 px-3.5 text-sm",
            value === it.value ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink",
          )}
        >
          {it.label}
          {it.count !== undefined && <span className={cn("nums rounded-md px-1.5 text-[11px]", value === it.value ? "bg-ink-soft" : "bg-white/60")}>{it.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-lg bg-line/70", className)} />;
}

export function Spinner({ className, label }: { className?: string; label?: string }) {
  return (
    <div className={cn("flex items-center justify-center gap-2 text-muted", className)} role="status">
      <span className="relative flex size-6">
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className="absolute size-2.5 animate-pulse rounded-[2px]"
            style={{
              background: ["#f66483", "#ff9f00", "#30b8b2", "#be6334"][i],
              left: i % 2 ? 14 : 0,
              top: i > 1 ? 14 : 0,
              animationDelay: `${i * 150}ms`,
            }}
          />
        ))}
      </span>
      {label && <span className="text-sm">{label}</span>}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  text,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  text?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center rounded-[var(--radius-tile)] border border-dashed border-line bg-surface/60 px-6 py-12 text-center", className)}>
      <div className="mb-4 grid grid-cols-2 gap-1" aria-hidden>
        {icon ? (
          <div className="col-span-2 flex size-14 items-center justify-center rounded-2xl bg-ink-soft text-ink">{icon}</div>
        ) : (
          ["#f66483", "#ff9f00", "#30b8b2", "#be6334"].map((c) => <span key={c} className="size-5 rounded-[4px]" style={{ background: c }} />)
        )}
      </div>
      <h3 className="text-lg font-bold text-ink">{title}</h3>
      {text && <p className="mt-1 max-w-sm text-sm text-muted">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Avatar({
  name,
  color,
  size = 40,
  href,
  className,
}: {
  name: string;
  color: string;
  size?: number;
  href?: string;
  className?: string;
}) {
  const el = (
    <span
      className={cn("relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-bold text-white ring-2 ring-white", className)}
      style={{ width: size, height: size, background: color, fontSize: Math.max(11, size * 0.36) }}
      aria-hidden={!!href}
    >
      <span className="absolute -right-1 -top-1 size-[38%] rotate-12 rounded-[3px] bg-white/20" />
      <span className="relative">{initials(name)}</span>
    </span>
  );
  return href ? (
    <Link href={href} aria-label={name} className="shrink-0 rounded-full">
      {el}
    </Link>
  ) : (
    el
  );
}

export function Stars({ value, className }: { value: number; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-0.5", className)} aria-label={`${value}/5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={cn("size-3.5", i <= Math.round(value) ? "fill-saffron text-saffron" : "text-line")} aria-hidden />
      ))}
    </span>
  );
}

export function PageHeader({ title, subtitle, actions, className }: { title: string; subtitle?: string; actions?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("mb-6 flex flex-wrap items-end justify-between gap-4", className)}>
      <div className="min-w-0">
        <h1 className="font-display text-3xl leading-tight text-ink sm:text-4xl">{title}</h1>
        {subtitle && <p className="mt-1.5 max-w-2xl text-[15px] text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function SectionTitle({ children, action, className }: { children: React.ReactNode; action?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("mb-3 flex items-center justify-between gap-3", className)}>
      <h2 className="flex min-w-0 items-center gap-2 text-lg font-bold text-ink">
        <span className="size-2.5 shrink-0 rotate-45 rounded-[2px] bg-saffron" aria-hidden />
        <span className="truncate">{children}</span>
      </h2>
      {action}
    </div>
  );
}

export function DemoNote({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-start gap-2 rounded-xl border border-saffron/40 bg-saffron-soft/70 px-3 py-2 text-[13px] text-[#6b4300]", className)}>
      <span className="mt-1 size-2 shrink-0 rotate-45 rounded-[1px] bg-saffron" aria-hidden />
      <span>{children}</span>
    </div>
  );
}
