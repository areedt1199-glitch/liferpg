"use client";
import Link from "next/link";
import { progressNow, useProgress } from "../journey/progress-store";
import { bangkokDay } from "../analytics/rules";
import { PlanSlots } from "./plan-slots";
/** Today's focus schedule on the Today page. */
export function TodayPlan() {
  const { ready, progress, mode, userId } = useProgress();
  if (!ready || (mode === "account" && !userId)) return null;
  const today = bangkokDay(progressNow()), plans = progress.plans.filter(p => p.day === today);
  return <section className="growth-card today-plan" aria-labelledby="today-plan-title">
    <div className="section-heading"><h2 id="today-plan-title">ตารางวันนี้</h2><span>{plans.filter(p => p.done).length}/{plans.length} ช่วงทำแล้ว</span></div>
    <PlanSlots plans={plans} empty="วันนี้ยังไม่ได้วางแผน ลองจัดช่วงเวลาโฟกัสสักช่วง" />
    <Link className="text-link" href="/plan">{plans.length ? "เปิดปฏิทินและแก้แผน →" : "วางแผนวันนี้ →"}</Link>
  </section>;
}
