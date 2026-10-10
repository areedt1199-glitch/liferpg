"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Icon, type IconName } from "@/components/ui/icon";
const menu: { href: string; label: string; icon: IconName }[] = [
  { href: "/today", label: "วันนี้", icon: "sun" },
  { href: "/goals", label: "เป้าหมาย", icon: "compass" },
  { href: "/character", label: "ตัวละคร", icon: "person" },
  { href: "/profile", label: "โปรไฟล์", icon: "profile" },
];
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if(pathname==='/login')return <>{children}</>;
  if (/^\/quests\/[^/]+\/focus$/.test(pathname)) {
    return <div className="focus-shell"><a className="skip-link" href="#main">ข้ามไปเนื้อหา</a><main id="main" tabIndex={-1}>{children}</main></div>;
  }
  return <div className="app-shell">
    <a className="skip-link" href="#main">ข้ามไปเนื้อหา</a>
    <aside className="sidebar">
      <Link className="brand" href="/today"><Icon name="leaf" />liferpg<span>.</span></Link>
      <p className="brand-caption">ชีวิตจริง การผจญภัยของคุณ</p>
      <nav className="navigation" aria-label="เมนูหลัก">{menu.map(item => { const active = pathname === item.href || (item.href === "/goals" && (pathname.startsWith("/goals/") || pathname.startsWith("/quests/"))); return <Link key={item.href} href={item.href} className={`nav-item ${active ? "active" : ""}`} aria-current={active ? "page" : undefined}><Icon name={item.icon} /><span>{item.label}</span></Link>; })}</nav>
      <div className="sidebar-note"><Icon name="leaf" /><p>ทุกก้าวเล็ก ๆ<br />คือส่วนหนึ่งของการเติบโต</p><span>ต้นแบบ MVP</span></div>
    </aside>
    <div className="workspace"><header className="topbar"><span>พื้นที่สำหรับการเติบโตของคุณ</span><span className="prototype-badge">ต้นแบบ</span></header><nav className="growth-navigation" aria-label="สำรวจเพิ่มเติม">{[['/careers','เส้นทาง'],['/shop','ร้านค้า'],['/chat','ผู้ช่วย'],['/progress','กราฟ']].map(([href,label])=><Link key={href} href={href} aria-current={pathname===href?'page':undefined}>{label}</Link>)}</nav><main id="main" tabIndex={-1}>{children}</main><footer className="page-footer">เติบโตทีละก้าว ในจังหวะของคุณ <span>liferpg / จุดเริ่มต้น</span></footer></div>
  </div>;
}


