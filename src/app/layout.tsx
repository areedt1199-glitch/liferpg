import { cookies } from "next/headers";
import { supabaseConfig } from "@/lib/supabase/config";
import { ProgressProvider } from "@/features/account/progress-provider";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";
import "./globals.css";
export const metadata: Metadata = { title: "liferpg · การผจญภัยของคุณ", description: "เปลี่ยนเป้าหมายในชีวิตจริงให้เป็นการผจญภัย ทีละก้าวในจังหวะของคุณ" };
export default async function RootLayout({ children }: { children: ReactNode }) {
  const mode = (await cookies()).get("liferpg-mode")?.value === "demo" ? "demo" : "account";
  return <html lang="th"><body><ProgressProvider mode={mode} configured={!!supabaseConfig()}><AppShell>{children}</AppShell></ProgressProvider></body></html>;
}
