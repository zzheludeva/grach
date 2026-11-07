import { Sparkles, GraduationCap, Store, WandSparkles, ChartColumnBig, Bookmark, Package, MessageCircle, Bell, ShoppingCart } from "lucide-react";

export const MAIN_NAV = [
  { href: "/feed", key: "feed", icon: Sparkles },
  { href: "/learn", key: "learn", icon: GraduationCap },
  { href: "/market", key: "market", icon: Store },
  { href: "/studio", key: "studio", icon: WandSparkles },
  { href: "/dashboard", key: "dashboard", icon: ChartColumnBig },
] as const;

export const USER_NAV = [
  { href: "/favorites", key: "favorites", icon: Bookmark },
  { href: "/cart", key: "cart", icon: ShoppingCart },
  { href: "/orders", key: "orders", icon: Package },
  { href: "/messages", key: "messages", icon: MessageCircle },
  { href: "/notifications", key: "notifications", icon: Bell },
] as const;
