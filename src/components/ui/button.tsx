"use client";
import { forwardRef } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

const variants = {
  primary: "bg-ink text-white hover:bg-ink-deep shadow-[0_1px_0_rgba(0,0,0,.08)]",
  accent: "bg-rose text-white hover:bg-rose-deep",
  secondary: "bg-surface text-ink border border-line hover:border-ink/40 hover:bg-ink-soft/40",
  soft: "bg-ink-soft text-ink hover:bg-ink-soft/70",
  ghost: "text-ink hover:bg-ink-soft/60",
  danger: "bg-surface text-rose-deep border border-rose/40 hover:bg-rose-soft",
  saffron: "bg-saffron text-ink-deep hover:brightness-95",
} as const;
const sizes = {
  sm: "h-8 px-3 text-[13px] gap-1.5 rounded-lg",
  md: "h-10 px-4 text-sm gap-2 rounded-xl",
  lg: "h-12 px-6 text-[15px] gap-2 rounded-xl",
} as const;

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
  loading?: boolean;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "primary", size = "md", loading, children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(
        "inline-flex select-none items-center justify-center whitespace-nowrap font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant],
        sizes[size],
        className,
      )}
      disabled={disabled || loading}
      {...rest}
    >
      {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
});

export function ButtonLink({
  href,
  variant = "primary",
  size = "md",
  className,
  children,
  ...rest
}: { href: string; variant?: keyof typeof variants; size?: keyof typeof sizes; className?: string; children: React.ReactNode } & Omit<
  React.AnchorHTMLAttributes<HTMLAnchorElement>,
  "href"
>) {
  return (
    <Link
      href={href}
      className={cn("inline-flex items-center justify-center whitespace-nowrap font-semibold transition-colors", variants[variant], sizes[size], className)}
      {...rest}
    >
      {children}
    </Link>
  );
}

export const IconButton = forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string; active?: boolean }>(
  function IconButton({ className, label, active, children, ...rest }, ref) {
    return (
      <button
        ref={ref}
        aria-label={label}
        title={label}
        className={cn(
          "inline-flex size-10 shrink-0 items-center justify-center rounded-xl text-ink transition-colors hover:bg-ink-soft/70 disabled:opacity-40",
          active && "bg-ink-soft",
          className,
        )}
        {...rest}
      >
        {children}
      </button>
    );
  },
);
