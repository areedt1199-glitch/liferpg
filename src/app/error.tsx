"use client";
import { useEffect } from "react";
import Link from "next/link";
// Catches crashes inside any page so the player sees a way back instead of a blank screen.
export default function Error({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  const digest = error instanceof Error && "digest" in error ? String((error as Error & { digest?: string }).digest ?? "") : "";
  return <section className="empty-state standalone" role="alert">
    <p className="eyebrow">ERROR · ทางเดินสะดุด</p>
    <h1>เกิดข้อผิดพลาดบางอย่าง</h1>
    <p>ความก้าวหน้าที่บันทึกแล้วยังอยู่ครบ ลองใหม่อีกครั้ง หรือกลับไปหน้าวันนี้</p>
    <div className="error-actions">
      <button type="button" className="primary-link" onClick={() => retry()}>ลองใหม่ ↻</button>
      <Link className="error-home" href="/today">กลับวันนี้ →</Link>
    </div>
    {digest && <p className="error-digest">รหัสอ้างอิง: {digest}</p>}
  </section>;
}
