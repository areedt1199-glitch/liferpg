"use client";
import { useState } from "react";
import { useStoredValue, writePref } from "../boss/prefs";

// The guild mentor's answer to one journal note, kept in this browser so it is asked for only once per note.
export const mentorKey = (entryId: string) => `liferpg.mentor.${entryId}`;
export const AI_CONSENT = "liferpg.aiConsent";

export function MentorReply({ entryId, consent }: { entryId: string; consent: boolean }) {
  const reply = useStoredValue(mentorKey(entryId));
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  if (reply) return <div className="mentor-reply"><p className="mentor-name">🧙 อาจารย์แห่งกิลด์</p><p className="mentor-text">{reply}</p><p className="mentor-note">คำแนะนำจาก Gemini AI อาจผิดได้ ใช้ประกอบการคิด ไม่ใช่คำตอบสุดท้าย</p></div>;
  async function ask() {
    if (busy || !consent) return;
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/mentor", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ entryId, consent: true }), signal: AbortSignal.timeout(35000) });
      const result = await response.json();
      if (!response.ok) setError(result.error ?? "อาจารย์ยังตอบไม่ได้ ลองใหม่ภายหลัง");
      else writePref(mentorKey(entryId), result.answer);
    } catch { setError("ติดต่ออาจารย์ไม่สำเร็จ ลองใหม่ได้"); } finally { setBusy(false); }
  }
  return <div className="mentor-ask">
    <button type="button" className="mentor-button" disabled={busy || !consent} onClick={() => void ask()}>{busy ? "อาจารย์กำลังอ่านบันทึก…" : "🧙 ขอคำแนะนำจากอาจารย์แห่งกิลด์"}</button>
    {error && <p role="alert" className="mentor-error">{error}</p>}
  </div>;
}

/** One consent switch for sending journal notes to Google Gemini, remembered in this browser. */
export function useAiConsent(): [boolean, (on: boolean) => void] {
  const value = useStoredValue(AI_CONSENT);
  return [value === "yes", on => writePref(AI_CONSENT, on ? "yes" : "no")];
}
