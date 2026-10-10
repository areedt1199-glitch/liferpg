import Link from "next/link";
export default function NotFound() {
  return <section className="empty-state standalone"><p className="eyebrow">404 · PATH NOT FOUND</p><h1>ไม่พบเส้นทางนี้</h1><p>ไม่มีเป้าหมายหรือเควสต์ที่ตรงกับ ID นี้ในต้นแบบ</p><Link className="primary-link" href="/today">กลับวันนี้ →</Link></section>;
}
