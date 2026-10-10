"use client";
import { ProgressNotice } from "@/features/journey/progress-notice";
import { levelStats } from "@/features/journey/progress";
import { useProgress } from "@/features/journey/progress-store";
export function CharacterStats() {
  const { ready, progress, mode, userId } = useProgress();
  if (!ready) return <p role="status">กำลังอ่านค่าสถานะ…</p>;
  if (mode === "account" && !userId) return <ProgressNotice />;
  const stats = levelStats(progress.totalXP);
  return <div className="character-stats"><p><strong>เลเวล {stats.level}</strong> · {progress.coins} เหรียญ</p><progress max={100} value={stats.currentXP} aria-label="XP ในเลเวลปัจจุบัน" /><p>{stats.currentXP}/100 XP · อีก {stats.nextXP} XP ถึงเลเวลถัดไป</p><small>XP รวม {progress.totalXP} · {mode === "demo" ? "demo ในเบราว์เซอร์นี้" : "บัญชีจริง"}</small></div>;
}

export function CharacterName() { const {ready,characterName}=useProgress(); return <h2>{ready ? characterName : "กำลังโหลดตัวละคร…"}</h2>; }
