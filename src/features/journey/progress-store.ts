"use client";
import { useSyncExternalStore } from "react";
import { initialProgress, parseProgress, selectGoal, startQuest, updateChecklist, updateRound, completeQuest, selectCareer, buySkin, equipSkin, buyItem, consumeItem, type UserProgress } from "./progress";
import {attemptBoss,attachEvidence,detachEvidence,completePractice} from './progress';
import type {EvidenceRecord} from '../evidence/types';
export const STORAGE_KEY = "liferpg.progress.v1";
const LOCK_NAME = "liferpg.progress.write";
export type ProgressMode = 'demo' | 'account';
type Snapshot = { ready: boolean; progress: UserProgress; error: string | null; mode: ProgressMode; userId: string | null; characterName: string };
const serverSnapshot: Snapshot = { ready: false, progress: initialProgress(), error: null, mode:'account', userId:null, characterName:'นักเดินทางใบไม้' };
let snapshot = serverSnapshot;
let generation = 0;
let latestRead = 0;
let clockOffset = 0;
let revision = -1;
const listeners = new Set<() => void>();
function publish(next: Snapshot) { snapshot=next; listeners.forEach(listener=>listener()); }
export function progressNow() { return Date.now() + (snapshot.mode==='account' ? clockOffset : 0); }
export function clearAccountView() {
  generation++; clockOffset=0; revision=-1;
  if (snapshot.mode==='account') publish({...serverSnapshot,mode:'account'});
}
export function configureProgress(mode: ProgressMode) {
  generation++; clockOffset=0; revision=-1;
  publish({...serverSnapshot,mode});
  void readStorage();
}
function acceptServer(value: {progress:UserProgress;userId:string;characterName:string;serverNow:number;revision:number}) {
  if (!value.userId || !Number.isSafeInteger(value.serverNow) || !Number.isSafeInteger(value.revision)) throw new Error('ข้อมูลจากฐานข้อมูลไม่รองรับ');
  if (value.userId===snapshot.userId && value.revision<revision) return;
  revision=value.revision;
  clockOffset=value.serverNow-Date.now();
  publish({ready:true, progress:parseProgress(JSON.stringify(value.progress)), error:null, mode:'account', userId:value.userId,characterName:value.characterName});
}
async function readStorage() {
  if (snapshot.mode==='account') {
    const current=generation; const request=++latestRead;
    try {
      const response=await fetch('/api/progress',{cache:'no-store',signal:AbortSignal.timeout(15_000)}); const value=await response.json();
      if (current!==generation || request!==latestRead) return;
      if (!response.ok) { publish({...serverSnapshot,mode:'account',ready:true,error:value.error??'โหลดความก้าวหน้าไม่สำเร็จ'}); return; }
      acceptServer(value);
    } catch {
      if (current===generation && request===latestRead) publish({...serverSnapshot,mode:'account',ready:true,error:'ติดต่อฐานข้อมูลไม่สำเร็จ ไม่มีการเปลี่ยนไปใช้ demo อัตโนมัติ'});
    }
    return;
  }
  try { publish({...snapshot,ready:true,progress:parseProgress(localStorage.getItem(STORAGE_KEY)),error:null}); }
  catch { publish({...snapshot,ready:true,progress:initialProgress(),error:'อ่านข้อมูล demo ไม่ได้หรือข้อมูลไม่รองรับ ยังไม่ได้เขียนทับข้อมูลเดิม'}); }
}
function onStorage(event: StorageEvent) { if (snapshot.mode==='demo' && (event.key===STORAGE_KEY || event.key===null)) void readStorage(); }
function onVisible() { if (document.visibilityState==='visible') void readStorage(); }
function subscribe(listener:()=>void) {
  listeners.add(listener);
  if (listeners.size===1) {
    window.addEventListener('storage',onStorage); window.addEventListener('focus',readStorage); document.addEventListener('visibilitychange',onVisible);
    void readStorage();
  }
  return ()=>{listeners.delete(listener); if (!listeners.size) {window.removeEventListener('storage',onStorage);window.removeEventListener('focus',readStorage);document.removeEventListener('visibilitychange',onVisible);}};
}
async function demoCommit(change:(progress:UserProgress)=>UserProgress):Promise<boolean> {
  const current=generation;
  try {
    if (!navigator.locks) throw new Error('browser นี้ไม่รองรับการล็อกการเขียนข้ามแท็บ กรุณาใช้ browser รุ่นปัจจุบันบน localhost หรือ HTTPS');
    return await navigator.locks.request(LOCK_NAME,()=>{
      if (current!==generation || snapshot.mode!=="demo") return false;
      const raw=localStorage.getItem(STORAGE_KEY); const progress=change(parseProgress(raw)); const serialized=JSON.stringify(progress);
      if (raw!==serialized) localStorage.setItem(STORAGE_KEY,serialized);
      publish({...snapshot,ready:true,progress,error:null}); return true;
    });
  } catch (error) {if (current===generation) publish({...snapshot,error:error instanceof Error?`บันทึกไม่สำเร็จ: ${error.message}`:'บันทึก demo ไม่สำเร็จ'});return false;}
}
export function notifyAccountChanged() {
  if (typeof BroadcastChannel!=='undefined') {const channel=new BroadcastChannel('liferpg.account');channel.postMessage('changed');channel.close();}
}
async function commit(action:string,payload:Record<string,unknown>,change:(progress:UserProgress)=>UserProgress) {
  if (snapshot.mode==='demo') return demoCommit(change);
  const current=generation;
  try {
    const response=await fetch('/api/progress',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,payload}),cache:'no-store',signal:AbortSignal.timeout(15_000)});
    const value=await response.json();
    if (generation!==current) return false;
    if (!response.ok) {
      publish(response.status===401 ? {...serverSnapshot,mode:'account',ready:true,error:value.error??'กรุณาเข้าสู่ระบบใหม่'} : {...snapshot,error:value.error??'บันทึกไม่สำเร็จ'});
      return false;
    }
    latestRead++; acceptServer(value); notifyAccountChanged();return true;
  } catch {if (generation===current)publish({...snapshot,error:'บันทึกไม่สำเร็จ ลองใหม่ได้ ระบบยังไม่ยืนยันการรับรางวัล'});return false;}
}
export function chooseGoal(goalId:string) {return commit('select',{goalId},p=>selectGoal(p,goalId));}
export function beginQuest(questId:string) {return commit('start_quest',{questId},p=>startQuest(p,questId));}
export function setStepChecked(questId:string,stepId:string,checked:boolean) {return commit('check',{questId,stepId,checked},p=>updateChecklist(p,questId,stepId,checked));}
export function controlRound(questId:string,action:'start'|'pause'|'resume'|'new'|'finish') {return commit(action,{questId},p=>updateRound(p,questId,action,Date.now()));}
export function confirmQuest(questId:string) {return commit('complete',{questId},p=>completeQuest(p,questId,Date.now()));}
export function chooseCareer(careerId:string){return commit('select_career',{careerId},p=>selectCareer(p,careerId));}
export function purchaseSkin(skinId:string){return commit('buy_skin',{skinId},p=>buySkin(p,skinId,Date.now()));}
export function wearSkin(skinId:string){return commit('equip_skin',{skinId},p=>equipSkin(p,skinId));}
export function purchaseItem(itemId:string,qty:number){return commit('buy_item',{itemId,qty},p=>buyItem(p,itemId,qty,Date.now(),crypto.randomUUID()));}
/** Spends one potion in the given fight; the battle UI applies the effect only after this succeeds. */
export function spendItem(itemId:string,questId:string,battleId:string){return commit('use_item',{itemId,questId,battleId},p=>consumeItem(p,itemId,questId,battleId,Date.now()));}
export function practiceTask(taskId:string){return commit('practice',{taskId},p=>completePractice(p,taskId,Date.now()));}
export function submitBoss(questId:string,answers:Record<string,number>,battleId=''){return commit('boss_attempt',{questId,answers,battleId},p=>attemptBoss(p,questId,answers,Date.now(),battleId));}
export function saveDemoEvidence(record:EvidenceRecord){if(snapshot.mode!=='demo')return Promise.resolve(false);return demoCommit(p=>attachEvidence(p,record));}
export function removeDemoEvidence(questId:string){if(snapshot.mode!=='demo')return Promise.resolve(false);return demoCommit(p=>detachEvidence(p,questId));}
export function reloadProgress() {return readStorage();}
export function useProgress() {return useSyncExternalStore(subscribe,()=>snapshot,()=>serverSnapshot);}
