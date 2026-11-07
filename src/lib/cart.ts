import type { SeedData } from "@/data/seed";
import type { CartItem, CountryCode, Product, User } from "./types";
import { cartOf } from "./selectors";

export type LineIssue = "unavailable" | "priceChanged" | "noShipping" | "qtyReduced" | null;
export interface CartLine {
  item: CartItem;
  product: Product;
  issue: LineIssue;
  maxQty: number;
}
export interface SellerGroup {
  seller: User;
  lines: CartLine[];
  currency: Product["price"]["currency"];
  subtotal: number;
  checkoutable: CartLine[];
}

export function cartGroups(d: SeedData, me: string | null, country: CountryCode): SellerGroup[] {
  const lines: CartLine[] = cartOf(d, me)
    .map((item) => {
      const product = d.products.find((p) => p.id === item.productId);
      if (!product) return null;
      const maxQty = product.availability === "in_stock" ? product.stock : 10;
      let issue: LineIssue = null;
      if (product.availability === "sold_out" || maxQty === 0) issue = "unavailable";
      else if (!product.shipsTo.includes(country)) issue = "noShipping";
      else if (product.price.amount !== item.priceAtAdd.amount || product.price.currency !== item.priceAtAdd.currency) issue = "priceChanged";
      else if (item.qty > maxQty) issue = "qtyReduced";
      return { item, product, issue, maxQty };
    })
    .filter(Boolean) as CartLine[];
  const map = new Map<string, CartLine[]>();
  lines.forEach((l) => map.set(l.product.sellerId, [...(map.get(l.product.sellerId) ?? []), l]));
  return [...map.entries()].map(([sellerId, ls]) => {
    const ok = ls.filter((l) => !l.issue);
    return {
      seller: d.users.find((u) => u.id === sellerId)!,
      lines: ls,
      currency: ls[0].product.price.currency,
      subtotal: Math.round(ok.reduce((s, l) => s + l.product.price.amount * l.item.qty, 0) * 100) / 100,
      checkoutable: ok,
    };
  });
}
