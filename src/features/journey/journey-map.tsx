"use client";
import { useState } from "react";
import { journeyDefinition } from "./definitions";
import { useProgress } from "./progress-store";
import { QuestNode } from "./quest-node";
import { QuestDetails } from "@/features/quests/quest-details";

// Stops zig-zag down the board; positions and the trail are derived from the quest count.
const FIRST = 73, GAP = 155;
export const stopPosition = (index: number, count: number) => ({ top: FIRST + index * GAP, left: index === count - 1 ? 50 : index % 2 ? 65 : 35 });
function trail(count: number) {
  const pts = Array.from({ length: count }, (_, i) => { const p = stopPosition(i, count); return { x: p.left * 4, y: p.top + 52 }; });
  return `M200 30 C200 80 ${pts[0].x} ${pts[0].y - 50} ${pts[0].x} ${pts[0].y} ` + pts.slice(1).map(p => `S${p.x} ${p.y - 80} ${p.x} ${p.y}`).join(" ") + ` L200 ${pts[count - 1].y + 75}`;
}
const decorations = [["deco-village", "⌂"], ["deco-forest", "♧"], ["deco-camp", "△"], ["deco-dungeon", "♜"], ["deco-summit", "⚑"], ["deco-cellar", "⛓"], ["deco-hall", "✶"], ["deco-sky", "☁"]];

export function JourneyMap() {
  const { ready, progress, mode, userId } = useProgress();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const quests = journeyDefinition.quests.map(quest => ({ ...quest, status: progress.quests[quest.id] }));
  const selected = quests.find(quest => quest.id === (selectedId ?? progress.activeQuestId ?? quests.find(q => q.status === "available")?.id ?? quests[quests.length - 1].id))!;
  if (!ready) return <p role="status">กำลังโหลดสถานะเควสต์…</p>;
  if (mode === "account" && !userId) return null;
  const count = quests.length, height = FIRST + (count - 1) * GAP + 227, path = trail(count);
  return <div className="journey-layout"><section className="map-board" style={{ height }} aria-label={`แผนที่ ${count} ด่าน`}><div className="map-start">จุดเริ่มต้น <span aria-hidden="true">✧</span></div>
    <svg className="journey-path" style={{ height: height - 70 }} viewBox={`0 0 400 ${height - 70}`} preserveAspectRatio="none" aria-hidden="true"><path d={path} fill="none" stroke="var(--line)" strokeWidth="16" /><path d={path} fill="none" stroke="var(--gold-light)" strokeWidth="7" strokeDasharray="2 12" strokeLinecap="round" /></svg>
    {decorations.slice(0, count).map(([cls, glyph], i) => <span key={cls} className={`map-decoration ${cls}`} style={{ top: FIRST + i * GAP + 5, ...(i % 2 ? { left: "9%" } : { right: "10%" }) }} aria-hidden="true">{glyph}</span>)}
    <ol className="map-stops">{quests.map((quest, index) => <QuestNode key={quest.id} quest={quest} index={index} last={index === count - 1} position={stopPosition(index, count)} selected={selected.id === quest.id} onSelect={() => setSelectedId(quest.id)} />)}</ol><div className="map-finish">จุดหมาย · เกมแรกของคุณพร้อมให้โลกเห็น</div>
  </section><div id="selected-quest" className="map-inspector"><p className="eyebrow">บันทึกการเดินทาง</p><p className="selection-announcement" role="status">เลือกด่าน: {selected.title}</p><QuestDetails quest={selected} compact /><p className="map-hint">แตะจุดบนแผนที่เพื่อดูรายละเอียด<br />{progress.goalCompletedAt !== null ? "จบเส้นทางแล้ว · เปิดดูบันทึกทุกด่านได้" : "ยืนยันสำเร็จเพื่อเปิดด่านถัดไป · ไม่เริ่มเควสต์ให้อัตโนมัติ"}</p></div></div>;
}
