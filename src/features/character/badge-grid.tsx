"use client";
import { useEffect } from "react";
import { useProgress } from "../journey/progress-store";
import { useStoredValue, writePref } from "../boss/prefs";
import { badgeStates, type BadgeState } from "./achievements";

/** Guild badges on the character page: unlocked ones in gold, the rest with how far along the player is. */
export function BadgeGrid({ states }: { states: BadgeState[] }) {
  const unlocked = states.filter(b => b.unlocked).length;
  return <section className="growth-card badge-panel" aria-labelledby="badge-title">
    <div className="section-heading"><h2 id="badge-title">ตรากิลด์</h2><span>ได้รับ {unlocked}/{states.length}</span></div>
    <ul className="badge-grid">{states.map(b => <li key={b.id} className={b.unlocked ? "unlocked" : "locked"}>
      <span className="badge-medal" aria-hidden="true">{b.icon}</span>
      <strong>{b.name}</strong><small>{b.desc}</small>
      {b.unlocked ? <span className="badge-status">✓ ได้รับแล้ว</span> : <span className="badge-progress" role="progressbar" aria-label={`${b.name} ${b.have}/${b.need}`} aria-valuemin={0} aria-valuemax={b.need} aria-valuenow={b.have}><i style={{ width: `${b.have / b.need * 100}%` }} /><em>{b.have}/{b.need}</em></span>}
    </li>)}</ul>
  </section>;
}

/** Announces badges earned since this browser last looked; the first visit only records what is already earned. */
export function BadgeToast() {
  const { ready, progress, mode, userId } = useProgress();
  const owner = mode === "demo" ? "demo" : userId, key = `liferpg.seenBadges.${owner ?? "none"}`;
  const stored = useStoredValue(key);
  const earned = ready && owner ? badgeStates(progress).filter(b => b.unlocked) : [];
  const seen = stored === null ? null : stored.split(",");
  const fresh = seen ? earned.filter(b => !seen.includes(b.id)) : [];
  const all = earned.map(b => b.id).join(",");
  useEffect(() => { if (ready && owner && stored === null) writePref(key, all); }, [ready, owner, stored, key, all]);
  useEffect(() => {
    if (!fresh.length) return;
    const t = setTimeout(() => writePref(key, [...(seen ?? []), ...fresh.map(b => b.id)].join(",")), 6000);
    return () => clearTimeout(t);
  });
  if (!fresh.length) return null;
  return <div className="badge-toast" role="status" aria-live="polite">
    {fresh.slice(0, 3).map(b => <div key={b.id} className="badge-toast-item"><span className="badge-medal" aria-hidden="true">{b.icon}</span><span><small>ได้รับตรากิลด์ใหม่</small><strong>{b.name}</strong><em>{b.desc}</em></span></div>)}
    <button type="button" className="text-link" onClick={() => writePref(key, [...(seen ?? []), ...fresh.map(b => b.id)].join(","))}>ปิด</button>
  </div>;
}
