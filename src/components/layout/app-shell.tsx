"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";
import { Icon, type IconName } from "@/components/ui/icon";
import { PlayerHud } from "@/features/character/player-hud";
import { LevelUp } from "@/features/character/level-up";
import { BadgeToast } from "@/features/character/badge-grid";
import { PendingGoal } from "@/features/onboarding/path-finder-quiz";
import { ChatFloat } from "@/features/chat/chat-float";
type MenuItem = { href: string; label: string; icon: IconName; tab?: boolean; short?: string };
// Grouped sidebar menu; `tab` items also appear in the mobile bottom bar, the rest live under "เพิ่มเติม".
const groups: { title: string; items: MenuItem[] }[] = [
  { title: "การผจญภัย", items: [
    { href: "/today", label: "วันนี้", icon: "sun", tab: true },
    { href: "/goals", label: "แผนที่", icon: "map", tab: true },
    { href: "/careers", label: "เส้นทางสายเทค", short: "เส้นทาง", icon: "route", tab: true },
    { href: "/plan", label: "ตารางแผน", icon: "calendar" },
    { href: "/journal", label: "บันทึกการเดินทาง", icon: "quill" },
    { href: "/learn", label: "คลังความรู้", icon: "book" },
  ] },
  { title: "ตัวละคร", items: [
    { href: "/character", label: "ตัวละคร", icon: "person", tab: true },
    { href: "/shop", label: "ร้านค้า", icon: "bag" },
    { href: "/guild", label: "กิลด์", icon: "flame" },
  ] },
  { title: "ช่วยเหลือ", items: [
    { href: "/chat", label: "ผู้ช่วย AI", icon: "chat" },
    { href: "/progress", label: "สถิติ", icon: "chart" },
    { href: "/profile", label: "โปรไฟล์", icon: "profile" },
  ] },
];
const items = groups.flatMap(g => g.items);
const isActive = (href: string, pathname: string) => pathname === href || (href === "/goals" && (pathname.startsWith("/goals/") || pathname.startsWith("/quests/"))) || (href === "/learn" && pathname.startsWith("/learn/"));
function NavLink({ item, pathname, className, short = false }: { item: MenuItem; pathname: string; className: string; short?: boolean }) {
  const active = isActive(item.href, pathname);
  return <Link href={item.href} className={`${className} ${active ? "active" : ""}`} aria-current={active ? "page" : undefined}><Icon name={item.icon} /><span>{short ? item.short ?? item.label : item.label}</span></Link>;
}
export function AppShell({ children, aiReady = false }: { children: ReactNode; aiReady?: boolean }) {
  const pathname = usePathname(); const more = useRef<HTMLDetailsElement>(null);
  useEffect(() => { if (more.current) more.current.open = false; }, [pathname]);
  // Sign-in, the guest landing, the path finder and public portfolios stand on their own without the game menu.
  if (pathname === '/' || pathname === '/start' || pathname === '/login' || pathname.startsWith('/login/') || pathname.startsWith('/u/')) return <>{children}</>;
  if (/^\/quests\/[^/]+\/focus$/.test(pathname)) {
    return <div className="focus-shell"><a className="skip-link" href="#main">ข้ามไปเนื้อหา</a><main id="main" tabIndex={-1}>{children}</main></div>;
  }
  const extra = items.filter(i => !i.tab); const extraActive = extra.some(i => isActive(i.href, pathname));
  return <div className="app-shell">
    <a className="skip-link" href="#main">ข้ามไปเนื้อหา</a>
    <aside className="sidebar">
      <Link className="brand" href="/today"><Icon name="leaf" />liferpg<span>.</span></Link>
      <p className="brand-caption">ผจญภัยสายเทค · AI · Dev · เกม</p>
      <nav className="navigation" aria-label="เมนูหลัก">{groups.map(g => <div key={g.title} className="nav-group"><p className="nav-title">{g.title}</p>{g.items.map(item => <NavLink key={item.href} item={item} pathname={pathname} className="nav-item" />)}</div>)}</nav>
      <div className="sidebar-note"><Icon name="leaf" /><p>ทุกก้าวเล็ก ๆ<br />คือส่วนหนึ่งของการเติบโต</p></div>
    </aside>
    <nav className="tabbar" aria-label="เมนูหลัก">
      {items.filter(i => i.tab).map(item => <NavLink key={item.href} item={item} pathname={pathname} className="tab-item" short />)}
      <details className="tab-more" ref={more}>
        <summary className={`tab-item ${extraActive ? "active" : ""}`}><Icon name="more" /><span>เพิ่มเติม</span></summary>
        <div className="tab-sheet">{extra.map(item => <NavLink key={item.href} item={item} pathname={pathname} className="sheet-item" />)}</div>
      </details>
    </nav>
    <div className="workspace">
      <header className="topbar"><Link className="topbar-brand" href="/today"><Icon name="leaf" />liferpg<span>.</span></Link><PlayerHud /></header>
      <main id="main" tabIndex={-1}>{children}</main>
      <LevelUp /><BadgeToast /><PendingGoal /><ChatFloat aiReady={aiReady} />
      <footer className="page-footer">เติบโตทีละก้าว ในจังหวะของคุณ <Link href="/credits">เครดิตเพลงและภาพ</Link></footer>
    </div>
  </div>;
}
