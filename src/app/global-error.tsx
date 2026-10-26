"use client";
import { useEffect } from "react";
// Last-resort screen when the root layout itself fails; it renders its own document, so styles are inline.
export default function GlobalError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return <html lang="th"><body style={{ margin: 0, minHeight: "100vh", display: "grid", placeItems: "center", background: "#f6f3e9", color: "#1f362d", fontFamily: "system-ui, 'Noto Sans Thai', sans-serif", padding: 16 }}>
    <title>เกิดข้อผิดพลาด · liferpg</title>
    <main style={{ maxWidth: 420, textAlign: "center" }}>
      <p style={{ fontSize: 12, letterSpacing: 2, color: "#8a6420", margin: 0 }}>LIFERPG · ERROR</p>
      <h1 style={{ fontSize: 24, margin: "10px 0" }}>เว็บโหลดไม่สำเร็จ</h1>
      <p style={{ color: "#5d6e63", fontSize: 14, lineHeight: 1.6 }}>ความก้าวหน้าที่บันทึกแล้วยังอยู่ครบ ลองโหลดใหม่อีกครั้ง หากยังไม่ได้ ให้ลองใหม่ภายหลัง</p>
      <button type="button" onClick={() => retry()} style={{ marginTop: 16, minHeight: 48, padding: "12px 22px", border: 0, borderRadius: 10, background: "#173e32", color: "#fffdf7", fontSize: 14, cursor: "pointer" }}>ลองใหม่ ↻</button>
    </main>
  </body></html>;
}
