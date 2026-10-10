"use client";
import { createBrowserClient } from '@supabase/ssr';
import { supabaseConfig } from './config';
export function browserClient() {
  const config = supabaseConfig();
  if (!config) throw new Error('ยังไม่ได้ตั้งค่าฐานข้อมูล');
  return createBrowserClient(config.url, config.key);
}
