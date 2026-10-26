"use client";
import Link from "next/link";
import careers from "../careers/catalog.json";
import { goalDefinitions } from "../journey/definitions";
import { levelStats, practiceStreak } from "../journey/progress";
import { progressNow, useProgress } from "../journey/progress-store";
import { ProgressNotice } from "../journey/progress-notice";
import { skinById, STARTER_SKIN } from "../shop/catalog";
import { CharacterAvatar } from "./character-avatar";
import { characterAttributes, characterTitle } from "./attributes";
import { AttributePanel } from "./attribute-panel";
import { badgeStates } from "./achievements";
import { BadgeGrid } from "./badge-grid";
/** RPG-style status sheet: portrait, level bar and stat tiles. */
export function CharacterSheet() {
  const { ready, progress, mode, userId, characterName } = useProgress();
  if (!ready) return <p role="status">กำลังอ่านค่าสถานะ…</p>;
  if (mode === "account" && !userId) return <ProgressNotice />;
  const stats = levelStats(progress.totalXP);
  const mine = goalDefinitions.filter(g => progress.goals[g.id]);
  const passed = mine.reduce((n, g) => n + g.quests.filter(q => progress.quests[q.id] === "completed").length, 0);
  const total = mine.reduce((n, g) => n + g.quests.length, 0);
  const career = careers.find(c => c.id === progress.careerId);
  const skin = skinById(progress.equippedSkinId) ?? skinById(STARTER_SKIN)!;
  const attrs = characterAttributes(progress), title = characterTitle(attrs);
  const tiles: [string, string][] = [
    ["XP รวม", progress.totalXP.toLocaleString("th-TH")],
    ["เหรียญ", progress.coins.toLocaleString("th-TH")],
    ["ฝึกต่อเนื่อง", `${practiceStreak(progress, progressNow())} วัน`],
    ["ด่านที่ผ่าน", `${passed}/${total}`],
    ["เป้าหมาย", `${mine.filter(g => progress.goals[g.id].completedAt !== null).length}/${mine.length} สำเร็จ`],
  ];
  return <><section className="character-sheet">
    <div className="sheet-portrait"><CharacterAvatar /><span className="sheet-skin">ชุด: {skin.name}</span><Link className="primary-link" href="/shop">เปลี่ยนชุดในร้านค้า →</Link></div>
    <div className="sheet-body">
      <p className="eyebrow">ADVENTURER</p>
      <h2>{characterName}</h2>
      <p className="sheet-title">คลาส · {title}</p>
      <p className="sheet-path">{career ? <>เส้นทาง: <strong>{career.title}</strong></> : <Link className="text-link" href="/careers">ยังไม่ได้เลือกเส้นทาง · เลือกเลย →</Link>}</p>
      <div className="sheet-level"><span className="sheet-lv">Lv.{stats.level}</span><div className="sheet-bar" role="progressbar" aria-label="XP ในเลเวลปัจจุบัน" aria-valuemin={0} aria-valuemax={100} aria-valuenow={stats.currentXP}><i style={{ width: `${stats.currentXP}%` }} /></div><span className="muted">{stats.currentXP}/100 XP · อีก {stats.nextXP} XP</span></div>
      <dl className="sheet-tiles">{tiles.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
      <p className="muted">ค่าสถานะมาจากเควสต์ที่ยืนยันสำเร็จและการฝึกประจำวัน · {mode === "demo" ? "demo ในเบราว์เซอร์นี้" : "บันทึกในบัญชีจริง"}</p>
    </div>
  </section>
  <AttributePanel values={attrs} title={title} />
  <BadgeGrid states={badgeStates(progress)} /></>;
}
