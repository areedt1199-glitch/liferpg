"use client";
import { useEffect, type ReactNode } from 'react';
import { browserClient } from '@/lib/supabase/browser';
import { configureProgress, clearAccountView, reloadProgress, type ProgressMode } from '@/features/journey/progress-store';
export function ProgressProvider({mode,configured,children}:{mode:ProgressMode;configured:boolean;children:ReactNode}) {
  useEffect(()=>{
    configureProgress(mode);
    const channel=typeof BroadcastChannel==='undefined'?null:new BroadcastChannel('liferpg.account');
    if (channel) channel.onmessage=()=>{if(mode==='account'){clearAccountView();void reloadProgress();}};
    const subscription=configured?browserClient().auth.onAuthStateChange(()=>{
      if(mode==='account'){clearAccountView();queueMicrotask(()=>void reloadProgress());}
    }).data.subscription:null;
    return ()=>{clearAccountView();channel?.close();subscription?.unsubscribe();};
  },[mode,configured]);
  return children;
}
