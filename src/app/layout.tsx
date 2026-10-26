import { cookies } from "next/headers";
import { Cinzel, Noto_Sans_Thai, Pixelify_Sans, Trirong } from "next/font/google";
import { supabaseConfig } from "@/lib/supabase/config";
import { ProgressProvider } from "@/features/account/progress-provider";
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";
import "./globals.css";
const body = Noto_Sans_Thai({ subsets: ["thai", "latin"], variable: "--font-body", display: "swap" });
// "Adventurer's journal" type: storybook serif headings, Cinzel inscriptions, pixel numerals for game stats; body stays plain for reading.
const display = Trirong({ subsets: ["thai", "latin"], weight: ["500", "600", "700"], variable: "--font-display", display: "swap" });
const rune = Cinzel({ subsets: ["latin"], weight: ["600", "700"], variable: "--font-rune", display: "swap" });
const pixel = Pixelify_Sans({ subsets: ["latin"], weight: ["500", "600"], variable: "--font-pixel", display: "swap" });
export const metadata: Metadata = { title: "liferpg · การผจญภัยของคุณ", description: "เปลี่ยนการพัฒนาตัวเองสายเทค ทั้ง AI, Dev และเกม ให้เป็นการผจญภัย ทีละก้าวในจังหวะของคุณ" };
export const viewport: Viewport = { themeColor: "#173e32" };
export default async function RootLayout({ children }: { children: ReactNode }) {
  const mode = (await cookies()).get("liferpg-mode")?.value === "demo" ? "demo" : "account";
  return <html lang="th" className={`${body.variable} ${display.variable} ${rune.variable} ${pixel.variable}`}><body><ProgressProvider mode={mode} configured={!!supabaseConfig()}><AppShell>{children}</AppShell></ProgressProvider></body></html>;
}
