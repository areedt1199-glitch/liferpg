"use client";
import Link from "next/link";
import { journeyDefinition } from "./definitions";
import { useProgress } from "./progress-store";
import { ProgressNotice } from "./progress-notice";
export function MapSummary() {
  const { ready, progress, mode, userId } = useProgress();
  return <><ProgressNotice />{ready && (mode === "demo" || userId) && <div className="map-summary"><span>ผ่านแล้ว {Object.values(progress.quests).filter(status => status === "completed").length}/{journeyDefinition.quests.length} ด่าน</span><span>✓ ผ่านแล้ว · ✦ พร้อมเริ่ม / กำลังทำ · กุญแจ: ล็อก</span>{!progress.selectedGoalId && <Link className="text-link" href="/goals">เลือกเป้าหมายเพื่อเริ่มเควสต์ →</Link>}</div>}</>;
}
