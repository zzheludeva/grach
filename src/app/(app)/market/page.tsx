"use client";
import { useMemo } from "react";
import { Search, Truck } from "lucide-react";
import { useStore } from "@/lib/store";
import { useQueryFlag, useQueryState } from "@/lib/nav-history";
import { useI18n } from "@/i18n/I18nProvider";
import { CATEGORIES, categorySearchTerms } from "@/i18n/content";
import { Chip, EmptyState, Input, PageHeader, Select } from "@/components/ui/primitives";
import { ProductCard } from "@/components/common/cards";
import { Button } from "@/components/ui/button";
import type { CategoryId } from "@/lib/types";
import { norm } from "@/lib/utils";

type Sort = "new" | "priceAsc" | "priceDesc" | "popular";

export default function Market() {
  const { state, settings, actions } = useStore();
  const { t, cat } = useI18n();
  const d = state!.data;
  // Query, filters and sort live in the URL so returning from a product restores the same list.
  const [q, setQ] = useQueryState<string>("q", "");
  const [category, setCategory] = useQueryState<CategoryId | "">("cat", "", ["", ...CATEGORIES.map((c) => c.id)]);
  const [sort, setSort] = useQueryState<Sort>("sort", "new", ["new", "popular", "priceAsc", "priceDesc"] as Sort[]);
  const [avail, setAvail] = useQueryState<"" | "in_stock" | "made_to_order">("avail", "", ["", "in_stock", "made_to_order"]);
  const [shipsHere, setShipsHere] = useQueryFlag("ships", false);

  const list = useMemo(() => {
    const nq = norm(q.trim());
    let l = d.products.filter((p) => {
      if (p.status !== "published") return false;
      if (category && p.category !== category) return false;
      if (avail && p.availability !== avail) return false;
      if (shipsHere && !p.shipsTo.includes(settings.country)) return false;
      if (!nq) return true;
      const hay = norm(`${p.title} ${p.summary} ${p.materials.join(" ")} ${d.users.find((u) => u.id === p.sellerId)?.name ?? ""}`);
      return hay.includes(nq) || categorySearchTerms(p.category).some((s) => norm(s).includes(nq));
    });
    // Price sort only compares within one currency — mixed currencies are grouped, never converted.
    l = l.slice().sort((a, b) => {
      if (sort === "new") return b.createdAt.localeCompare(a.createdAt);
      if (sort === "popular") return b.views - a.views;
      if (a.price.currency !== b.price.currency) return a.price.currency === settings.currency ? -1 : b.price.currency === settings.currency ? 1 : a.price.currency.localeCompare(b.price.currency);
      return sort === "priceAsc" ? a.price.amount - b.price.amount : b.price.amount - a.price.amount;
    });
    // sold out at the end
    return [...l.filter((p) => p.availability !== "sold_out"), ...l.filter((p) => p.availability === "sold_out")];
  }, [d, q, category, sort, avail, shipsHere, settings]);

  return (
    <div>
      <PageHeader title={t("market.title")} subtitle={t("market.subtitle")} />
      <div className="mb-5 space-y-3">
        <div className="flex flex-wrap gap-2">
          <div className="relative min-w-0 flex-1 basis-64">
            <Search className="pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-faint" />
            <Input type="search" enterKeyHint="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("market.search")} aria-label={t("market.search")} className="ps-10" />
          </div>
          <Select value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label={t("market.sort")} className="w-auto min-w-44 flex-1 sm:flex-none">
            <option value="new">{t("market.sortNew")}</option>
            <option value="popular">{t("market.sortPopular")}</option>
            <option value="priceAsc">{t("market.sortPriceAsc")}</option>
            <option value="priceDesc">{t("market.sortPriceDesc")}</option>
          </Select>
          <Select value={avail} onChange={(e) => setAvail(e.target.value as typeof avail)} aria-label={t("market.availability")} className="w-auto min-w-44 flex-1 sm:flex-none">
            <option value="">{t("market.anyAvailability")}</option>
            <option value="in_stock">{t("product.inStock")}</option>
            <option value="made_to_order">{t("product.madeToOrder")}</option>
          </Select>
        </div>
        <div className="scrollbar-none -mx-1 flex gap-2 overflow-x-auto px-1">
          <Chip active={!category} onClick={() => setCategory("")}>
            {t("feed.all")}
          </Chip>
          {CATEGORIES.filter((c) => d.products.some((p) => p.status === "published" && p.category === c.id)).map((c) => (
            <Chip
              key={c.id}
              color={c.color}
              active={category === c.id}
              onClick={() => {
                setCategory(c.id);
                actions.viewCategory(c.id);
              }}
            >
              {cat(c.id)}
            </Chip>
          ))}
        </div>
        <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-ink">
          <input type="checkbox" checked={shipsHere} onChange={(e) => setShipsHere(e.target.checked)} className="size-4 accent-ink" />
          <Truck className="size-4 text-muted" />
          {t("market.shipsTo", { country: t(`countries.${settings.country}`) })}
        </label>
      </div>
      <p className="mb-3 text-xs text-faint">{t("market.currencyNote")}</p>
      {list.length === 0 ? (
        <EmptyState
          title={t("market.nothing")}
          action={
            <Button
              onClick={() => {
                setQ("");
                setCategory("");
                setAvail("");
                setShipsHere(false);
              }}
            >
              {t("feed.resetFilter")}
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
          {list.map((p) => (
            <ProductCard key={p.id} p={p} />
          ))}
        </div>
      )}
    </div>
  );
}
