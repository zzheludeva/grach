import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Providers } from "@/components/shell/Providers";

const pie = localFont({ src: "../fonts/UnlimitedPie.ttf", variable: "--font-pie", display: "swap" });
const raleway = localFont({ src: "../fonts/Raleway.ttf", variable: "--font-raleway", display: "swap", weight: "100 900" });

export const metadata: Metadata = {
  title: "GRACH",
  description: "Творческое сообщество и экосистема handmade: вдохновение, обучение, маркетплейс и ИИ-студия.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#15484c",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" suppressHydrationWarning className={`${pie.variable} ${raleway.variable}`}>
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
