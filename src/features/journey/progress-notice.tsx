"use client";
import Link from "next/link";
import { useProgress, reloadProgress } from "./progress-store";
export function ProgressNotice() {
 const {ready,error,mode}=useProgress();
 return <div className="progress-notice"><p className="sample-label spaced" role={error?"alert":"status"}>{!ready?"กำลังโหลดความก้าวหน้า…":error??(mode==="demo"?"โหมด demo · ข้อมูลในเบราว์เซอร์ ไม่รวมกับบัญชี":"บัญชีจริง · ความก้าวหน้าจากฐานข้อมูล")}</p>{mode==="account"&&error&&<div className="action-row"><Link className="text-link" href="/profile">ตั้งค่าหรือเข้าสู่ระบบ</Link><button className="text-link" onClick={()=>void reloadProgress()}>ลองโหลดอีกครั้ง</button></div>}{mode==="demo"&&<Link className="text-link" href="/profile">ไปหน้าบัญชี</Link>}</div>;
}
