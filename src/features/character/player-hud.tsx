"use client";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { levelStats, practiceStreak, practiceToday } from "@/features/journey/progress";
import { Campfire, fireLabels, fireTier } from "./campfire";
import { progressNow, useProgress } from "@/features/journey/progress-store";
import { CharacterAvatar } from "./character-avatar";
/** Always-visible player status: who you are, level/XP, coins and streak. */
export function PlayerHud() {
  const { ready, progress, mode, userId, characterName } = useProgress();
  if (!ready) return <div className="phud phud-loading" role="status">กำลังโหลดตัวละคร…</div>;
  if (mode === "account" && !userId) return <div className="phud"><Link className="phud-login" href="/login">เข้าสู่ระบบเพื่อเริ่มผจญภัย →</Link></div>;
  const stats = levelStats(progress.totalXP); const now = progressNow(), streak = practiceStreak(progress, now), litToday = practiceToday(progress, now).length > 0;
  return <div className="phud">
    <Link className="phud-player" href="/character" aria-label={`ตัวละคร ${characterName} เลเวล ${stats.level}`}>
      <CharacterAvatar small />
      <span className="phud-identity"><strong>{characterName}</strong><span className="phud-level">Lv.{stats.level}<span className="phud-xp" role="progressbar" aria-label="XP ในเลเวลปัจจุบัน" aria-valuemin={0} aria-valuemax={100} aria-valuenow={stats.currentXP}><i style={{ width: `${stats.currentXP}%` }} /></span><small>{stats.currentXP}/100 XP</small></span></span>
    </Link>
    <div className="phud-stats">
      <span className="phud-chip fire" aria-label={`กองไฟฝึกต่อเนื่อง ${streak} วัน`} title={`${fireLabels[fireTier(streak)]} · ฝึกต่อเนื่อง ${streak} วัน${streak > 0 && !litToday ? " · ฝึกวันนี้เพื่อเติมฟืน" : ""}`}><Campfire streak={streak} litToday={litToday} />{streak}</span>
      <Link className="phud-chip coins" href="/shop" aria-label={`${progress.coins} เหรียญ ไปร้านค้า`}><Icon name="coin" />{progress.coins.toLocaleString("th-TH")}</Link>
      {mode === "demo" && <Link className="phud-chip demo" href="/profile">demo</Link>}
    </div>
  </div>;
}
