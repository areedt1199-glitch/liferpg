"use client";
import { useEffect, useRef } from "react";
import { levelStats, practiceStreak } from "@/features/journey/progress";
import { progressNow, useProgress } from "@/features/journey/progress-store";
import { usePref, useStoredValue, writePref } from "@/features/boss/prefs";
import { CharacterAvatar } from "./character-avatar";
import { ShareProgress } from "@/features/social/share-progress";

const ONOFF = ["on", "off"] as const;
function fanfare() {
  try {
    const ctx = new AudioContext();
    [523, 659, 784, 1046, 784, 1046].forEach((f, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain(), t = ctx.currentTime + i * .11;
      o.type = "square"; o.frequency.value = f; g.gain.setValueAtTime(.045, t); g.gain.exponentialRampToValueAtTime(.001, t + (i === 5 ? .5 : .14));
      o.connect(g).connect(ctx.destination); o.start(t); o.stop(t + .55);
    });
    setTimeout(() => void ctx.close(), 1500);
  } catch { /* audio unavailable */ }
}

/** Celebrates a level gained since this browser last saw the player's level, with what that growth is made of. */
export function LevelUp() {
  const { ready, progress, mode, userId } = useProgress();
  const owner = mode === "demo" ? "demo" : userId;
  const key = `liferpg.seenLevel.${owner ?? "none"}`;
  const stored = useStoredValue(key);
  const level = levelStats(progress.totalXP).level;
  const seen = stored === null ? null : Number(stored);
  const show = ready && !!owner && seen !== null && Number.isFinite(seen) && level > seen;
  const sfx = usePref("liferpg.sfx", "on", ONOFF);
  const button = useRef<HTMLButtonElement>(null);

  // First visit in this browser (or a reset demo): remember the current level without celebrating it.
  useEffect(() => {
    if (ready && owner && (seen === null || !Number.isFinite(seen) || level < seen)) writePref(key, String(level));
  }, [ready, owner, seen, level, key]);
  useEffect(() => {
    if (!show) return;
    button.current?.focus();
    if (sfx === "on") fanfare();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") writePref(key, String(level)); };
    window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey);
  }, [show, sfx, key, level]);
  if (!show) return null;

  const quests = new Set(progress.rewards.map(r => r.questId)).size;
  const focusHours = Object.values(progress.focus).reduce((sum, f) => sum + f.totalMs, 0) / 3_600_000;
  const streak = practiceStreak(progress, progressNow());
  const close = () => writePref(key, String(level));
  return <div className="levelup" role="dialog" aria-modal="true" aria-labelledby="levelup-title" onClick={e => { if (e.target === e.currentTarget) close(); }}>
    <div className="levelup-card">
      <div className="levelup-rays" aria-hidden="true" />
      {Array.from({ length: 12 }, (_, i) => <i key={i} className="levelup-spark" style={{ ["--a" as string]: `${i * 30}deg`, animationDelay: `${(i % 4) * .08}s` }} aria-hidden="true" />)}
      <p className="levelup-kicker">LEVEL UP</p>
      <div className="levelup-avatar"><CharacterAvatar /></div>
      <h2 id="levelup-title"><span className="levelup-from">Lv.{seen}</span><span aria-hidden="true"> → </span><strong>Lv.{level}</strong></h2>
      <p className="levelup-line">คุณเติบโตขึ้นอีกขั้น ความพยายามทุกนาทีของคุณสะสมมาถึงตรงนี้</p>
      <dl className="levelup-stats">
        <div><dt>ด่านที่ผ่าน</dt><dd>{quests}</dd></div>
        <div><dt>ชั่วโมงโฟกัส</dt><dd>{focusHours.toFixed(1)}</dd></div>
        <div><dt>ฝึกต่อเนื่อง</dt><dd>{streak} วัน</dd></div>
      </dl>
      <button ref={button} type="button" className="primary-link" onClick={close}>เดินทางต่อ →</button>
      <ShareProgress text={`ฉันเลเวลอัปเป็น Lv.${level} ใน liferpg แล้ว!`} />
    </div>
  </div>;
}
