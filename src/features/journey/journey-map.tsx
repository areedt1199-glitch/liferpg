"use client";
import { useState } from "react";
import { journeyDefinition } from "./definitions";
import { useProgress } from "./progress-store";
import { QuestNode } from "./quest-node";
import { QuestDetails } from "@/features/quests/quest-details";

export function JourneyMap() {
  const { ready, progress, mode, userId } = useProgress();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const quests = journeyDefinition.quests.map(quest => ({ ...quest, status: progress.quests[quest.id] }));
  const selected = quests.find(quest => quest.id === (selectedId ?? progress.activeQuestId ?? quests.find(q => q.status === "available")?.id ?? quests[4].id))!;
  if (!ready) return <p role="status">กำลังโหลดสถานะเควสต์…</p>;
  if (mode === "account" && !userId) return null;
  return <div className="journey-layout"><section className="map-board" aria-label="แผนที่ 5 ด่าน"><div className="map-start">จุดเริ่มต้น <span aria-hidden="true">✧</span></div>
    <svg className="journey-path" viewBox="0 0 400 850" preserveAspectRatio="none" aria-hidden="true"><path d="M200 30 C200 80 140 75 140 125 S260 200 260 280 S140 355 140 435 S260 510 260 590 S200 665 200 745 L200 820" fill="none" stroke="var(--line)" strokeWidth="16" /><path d="M200 30 C200 80 140 75 140 125 S260 200 260 280 S140 355 140 435 S260 510 260 590 S200 665 200 745 L200 820" fill="none" stroke="var(--gold-light)" strokeWidth="7" strokeDasharray="2 12" strokeLinecap="round" /></svg>
    <span className="map-decoration deco-village" aria-hidden="true">⌂</span><span className="map-decoration deco-forest" aria-hidden="true">♧</span><span className="map-decoration deco-camp" aria-hidden="true">△</span><span className="map-decoration deco-dungeon" aria-hidden="true">♜</span><span className="map-decoration deco-summit" aria-hidden="true">⚑</span>
    <ol className="map-stops">{quests.map((quest,index) => <QuestNode key={quest.id} quest={quest} index={index} selected={selected.id === quest.id} onSelect={() => setSelectedId(quest.id)} />)}</ol><div className="map-finish">จุดหมาย · เกมแรกของคุณ</div>
  </section><div id="selected-quest" className="map-inspector"><p className="eyebrow">บันทึกการเดินทาง</p><p className="selection-announcement" role="status">เลือกด่าน: {selected.title}</p><QuestDetails quest={selected} compact /><p className="map-hint">แตะจุดบนแผนที่เพื่อดูรายละเอียด<br />{progress.goalCompletedAt !== null ? "จบเส้นทางแล้ว · เปิดดูบันทึกทุกด่านได้" : "ยืนยันสำเร็จเพื่อเปิดด่านถัดไป · ไม่เริ่มเควสต์ให้อัตโนมัติ"}</p></div></div>;
}


