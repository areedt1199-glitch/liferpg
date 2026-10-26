"use client";
import { useState } from 'react';

/** Native share sheet on phones; copies the link elsewhere. */
export function ShareButton({ path, title, text, label = 'แชร์', className = 'text-link' }: { path: string; title: string; text: string; label?: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  async function share() {
    const url = new URL(path, window.location.origin).toString();
    try {
      if (navigator.share) { await navigator.share({ title, text, url }); return; }
      await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000);
    } catch { /* the player closed the share sheet */ }
  }
  return <button type="button" className={className} onClick={share}>{copied ? 'คัดลอกลิงก์แล้ว ✓' : label}</button>;
}
