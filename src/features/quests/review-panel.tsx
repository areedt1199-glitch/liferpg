"use client";
/* eslint-disable @next/next/no-img-element -- local preview of a photo before it is sent */
import { useState, type ChangeEvent } from "react";
import { reloadProgress, useProgress } from "../journey/progress-store";
import { useAiConsent } from "../journal/mentor-reply";
import type { Quest } from "./types";

// "Hand in your work": code, a written explanation or a photo goes to the guild teacher (Gemini, on the server), who
// checks it against the quest's success criteria. In account mode a pass is required before the boss and completion.
type Kind = "code" | "text" | "image";
const CODE_FILES = ".py,.js,.ts,.jsx,.tsx,.html,.css,.json,.md,.txt,.java,.cs,.cpp,.c,.h,.gd,.sql,.sh,.ipynb";
const TEXT_MAX = 30_000;
const kinds: [Kind, string][] = [["code", "โค้ด / ไฟล์"], ["text", "เขียนอธิบาย"], ["image", "รูปผลงาน"]];

/** Downscales a photo to at most 1280 px and returns JPEG base64 (keeps uploads small and strips metadata). */
async function shrink(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file), scale = Math.min(1, 1280 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas"); canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", .85).split(",")[1];
}

export function ReviewPanel({ quest }: { quest: Quest }) {
  const { progress, mode } = useProgress();
  const [kind, setKind] = useState<Kind>("code"), [text, setText] = useState(""), [note, setNote] = useState(""), [fileName, setFileName] = useState("");
  const [image, setImage] = useState<string | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const [consent, setConsent] = useAiConsent();
  const status = progress.quests[quest.id], review = progress.reviews[quest.id], passed = review?.passedAt != null;

  if (mode === "demo") return <section className="review-panel demo"><h3>📜 ส่งงานให้อาจารย์ตรวจ</h3><p className="muted">โหมด demo ไม่มีอาจารย์ตรวจงาน ข้ามขั้นนี้ได้ ในบัญชีจริงต้องส่งงานจนอาจารย์ตรวจผ่านก่อนสู้บอส</p></section>;
  if (status !== "in_progress" && !passed) return null;

  async function readFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; e.target.value = ""; if (!file) return;
    setError("");
    if (kind === "image") {
      if (!/^image\/(jpeg|png|webp)$/.test(file.type)) { setError("รูปต้องเป็น JPG, PNG หรือ WebP"); return; }
      try { setImage(await shrink(file)); setFileName(file.name); } catch { setError("อ่านรูปไม่สำเร็จ ลองรูปอื่น"); }
      return;
    }
    if (file.size > TEXT_MAX * 2) { setError("ไฟล์ใหญ่เกินไป ส่งเฉพาะส่วนสำคัญของโค้ด"); return; }
    const content = await file.text();
    if (content.length > TEXT_MAX) { setError(`ไฟล์ยาวเกิน ${TEXT_MAX.toLocaleString("th-TH")} ตัวอักษร`); return; }
    setText(content); setFileName(file.name);
  }
  async function submit() {
    if (busy || !consent) return;
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/review", { method: "POST", headers: { "Content-Type": "application/json" }, signal: AbortSignal.timeout(45000),
        body: JSON.stringify({ questId: quest.id, kind, consent: true, fileName, note, ...(kind === "image" ? { image: { mime: "image/jpeg", data: image } } : { content: text }) }) });
      const result = await response.json();
      if (!response.ok) setError(result.error ?? "ส่งงานไม่สำเร็จ ลองใหม่อีกครั้ง");
      await reloadProgress();
    } catch { setError("ติดต่ออาจารย์ไม่สำเร็จ ลองใหม่ได้"); } finally { setBusy(false); }
  }
  const ready = kind === "image" ? !!image : !!text.trim();

  return <section className={`review-panel ${passed ? "passed" : review?.verdict === "fail" ? "failed" : ""}`} aria-labelledby={`review-${quest.id}`}>
    <h3 id={`review-${quest.id}`}>📜 ส่งงานให้อาจารย์ตรวจ {passed && <span className="review-badge">✓ ตรวจผ่านแล้ว</span>}</h3>
    <p className="review-criteria"><strong>เงื่อนไขสำเร็จ:</strong> {quest.success}</p>
    {review?.verdict && <div className={`review-result ${review.verdict}`} role="status">
      <p className="review-verdict">{review.verdict === "pass" ? "✅ ผ่าน" : "❌ ยังไม่ผ่าน"}<small> · ส่งแล้ว {review.attempts} ครั้ง</small></p>
      <p>{review.feedback}</p>
      {review.hint && <p className="review-hint">💡 {review.hint}</p>}
    </div>}
    {passed ? <p className="muted">ไปสู้บอสต่อได้เลย ผลผ่านนี้ถูกบันทึกแล้ว</p> : <>
      <p className="muted">ส่งหลักฐานว่าทำได้จริง อาจารย์ AI จะตรวจตามเงื่อนไขด้านบน ต้องผ่านก่อนจึงจะสู้บอสได้ ไม่ผ่านแก้แล้วส่งใหม่ได้</p>
      <div className="seg review-kinds" role="group" aria-label="ประเภทงาน">{kinds.map(([k, label]) => <button key={k} type="button" aria-pressed={kind === k} onClick={() => { setKind(k); setError(""); }}>{label}</button>)}</div>
      {kind === "image"
        ? <div className="review-image">{image ? <img src={`data:image/jpeg;base64,${image}`} alt="ตัวอย่างรูปที่จะส่ง" /> : <p className="muted">แนบรูปผลงาน เช่น หน้าจอเกมที่รันได้ งานออกแบบ หรือโมเดล</p>}<label className="text-link review-file">เลือกรูป<input type="file" accept="image/jpeg,image/png,image/webp" onChange={e => void readFile(e)} /></label></div>
        : <>
          <textarea className="review-text" rows={kind === "code" ? 10 : 5} maxLength={TEXT_MAX} spellCheck={kind !== "code"} placeholder={kind === "code" ? "วางโค้ดที่เขียน หรือแนบไฟล์ด้านล่าง" : "อธิบายสิ่งที่ทำ ผลที่ได้ และสิ่งที่เรียนรู้"} value={text} onChange={e => { setText(e.target.value); setFileName(""); }} />
          {kind === "code" && <label className="text-link review-file">📎 แนบไฟล์โค้ด{fileName && ` · ${fileName}`}<input type="file" accept={CODE_FILES} onChange={e => void readFile(e)} /></label>}
        </>}
      <textarea className="review-note" rows={2} maxLength={1000} placeholder="อธิบายเพิ่ม (ไม่บังคับ) เช่น ทดลองกรณีไหนไปแล้ว ผลเป็นอย่างไร" value={note} onChange={e => setNote(e.target.value)} />
      <label className="chat-consent"><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} />ยินยอมส่งงานนี้ให้ Google Gemini ตรวจ อย่าใส่รหัสผ่าน API key หรือข้อมูลส่วนตัว</label>
      {error && <p role="alert" className="review-error">{error}</p>}
      <button type="button" className="primary-link" disabled={busy || !ready || !consent} onClick={() => void submit()}>{busy ? "อาจารย์กำลังตรวจ…" : review?.verdict === "fail" ? "ส่งงานใหม่ →" : "ส่งงานให้อาจารย์ตรวจ →"}</button>
    </>}
  </section>;
}
