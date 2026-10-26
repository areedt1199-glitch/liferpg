"use client";
import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Icon } from '@/components/ui/icon';

// The lesson library is large, so the panel loads the first time the player opens the bubble.
const ChatPanel = dynamic(() => import('./chat-panel').then(m => m.ChatPanel), { ssr: false, loading: () => <p className="chat-float-loading" role="status">กำลังเปิดผู้ช่วย…</p> });

/** Lesson path the player is looking at, so answers come from that path first. */
function pathOf(pathname: string) {
  const m = pathname.match(/^\/(?:learn|goals)\/([^/]+)$/);
  return m && m[1] !== 'first-game' ? decodeURIComponent(m[1]) : undefined;
}

/** Floating assistant: a bubble on every page that opens the chat over whatever the player is doing. */
export function ChatFloat({ aiReady }: { aiReady: boolean }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [opened, setOpened] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const bubble = useRef<HTMLButtonElement>(null);
  const toggle = () => { setOpen(o => !o); setOpened(true); };
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => panel.current?.querySelector('textarea')?.focus(), 60);
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); bubble.current?.focus(); } };
    window.addEventListener('keydown', onKey);
    return () => { clearTimeout(t); window.removeEventListener('keydown', onKey); };
  }, [open]);
  if (pathname === '/chat') return null;
  return <>
    {/* Kept mounted while closed so the conversation survives closing the panel and moving between pages. */}
    {opened && <div ref={panel} className="chat-float" role="dialog" aria-label="ผู้ช่วย AI" hidden={!open}>
      <header className="chat-float-head"><span><Icon name="chat" />ผู้ช่วยการเรียนรู้</span><button type="button" onClick={() => setOpen(false)} aria-label="ปิดผู้ช่วย">✕</button></header>
      <div className="chat-float-body"><ChatPanel aiReady={aiReady} pathId={pathOf(pathname)} autoFocus /></div>
    </div>}
    <button ref={bubble} type="button" className={`chat-bubble ${open ? 'open' : ''}`} onClick={toggle} aria-expanded={open} aria-label={open ? 'ปิดผู้ช่วย AI' : 'เปิดผู้ช่วย AI'}>
      {open ? <span aria-hidden="true">✕</span> : <Icon name="chat" />}
    </button>
  </>;
}
