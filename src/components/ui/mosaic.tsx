"use client";
import { hashStr, cn } from "@/lib/utils";
import { useI18nOptional } from "@/i18n/I18nProvider";

const PALETTE = ["#f66483", "#ff9f00", "#be6334", "#15484c", "#30b8b2", "#ffffff"];

/** Deterministic hand-cut-mosaic pattern, inspired by the reference tiles. */
export function Mosaic({ seed = "remeslo", cols = 14, rows = 5, className, light = false }: { seed?: string; cols?: number; rows?: number; className?: string; light?: boolean }) {
  const cells: React.ReactNode[] = [];
  const w = 100 / cols;
  const h = 100 / rows;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const k = hashStr(`${seed}-${r}-${c}`);
      const color = PALETTE[k % (light ? 6 : 5)];
      const jx = ((k >> 3) % 10) / 10;
      const jy = ((k >> 7) % 10) / 10;
      const x = c * w;
      const y = r * h;
      const g = 0.9;
      // irregular quadrilateral tile
      const pts = [
        [x + g + jx * 0.8, y + g],
        [x + w - g, y + g + jy * 0.8],
        [x + w - g - jy * 0.6, y + h - g],
        [x + g, y + h - g - jx * 0.6],
      ]
        .map((p) => p.join(","))
        .join(" ");
      cells.push(<polygon key={`${r}-${c}`} points={pts} fill={color} opacity={0.92 - ((k >> 11) % 4) * 0.08} />);
    }
  }
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className={cn("block", className)} aria-hidden>
      <rect width="100" height="100" fill={light ? "#efe9e1" : "#0e3336"} />
      {cells}
    </svg>
  );
}

/** Brand: ГРАЧ for the Russian interface, GRACH for all other languages. */
export function useBrandName() {
  const i18n = useI18nOptional();
  return i18n ? i18n.t("brand.name") : "GRACH";
}

export function Logo({ className, withText = true, light = false }: { className?: string; withText?: boolean; light?: boolean }) {
  const name = useBrandName();
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <svg viewBox="0 0 32 32" className="size-8 shrink-0" aria-hidden>
        <path d="M2 3 L14.5 2 L15 14.5 L3 15 Z" fill="#f66483" />
        <path d="M17 2 L30 3 L29 14 L17.5 15 Z" fill="#ff9f00" />
        <path d="M3 17 L15 17.5 L14 30 L2 29 Z" fill="#30b8b2" />
        <path d="M17.5 17 L29.5 18 L30 30 L18 29.5 Z" fill="#be6334" />
      </svg>
      {withText && <span className={cn("font-display text-[26px] leading-none", light ? "text-white" : "text-ink")}>{name}</span>}
    </span>
  );
}
