"use client";
import { useState } from "react";
import { findGoal } from "./definitions";
import { goalProgress } from "./progress";
import { chooseGoal, useProgress } from "./progress-store";
import { ProgressNotice } from "./progress-notice";
export function MapSummary({ goalId }: { goalId: string }) {
  const { ready, progress, mode, userId } = useProgress();
  const [busy, setBusy] = useState(false);
  const goal = findGoal(goalId)!;
  const { added, completed, total } = goalProgress(progress, goal);
  return <><ProgressNotice />{ready && (mode === "demo" || userId) && <div className="map-summary"><span>ผ่านแล้ว {completed}/{total} ด่าน</span><span>✓ ผ่านแล้ว · ✦ พร้อมเริ่ม / กำลังทำ · กุญแจ: ล็อก</span>
    {!added && <button type="button" className="primary-link" disabled={busy} onClick={async () => { setBusy(true); try { await chooseGoal(goal.id); } finally { setBusy(false); } }}>{busy ? "กำลังเพิ่ม…" : "เพิ่มเป็นเป้าหมายเพื่อเริ่มเควสต์"}</button>}</div>}</>;
}
