import type { UserProgress } from '../journey/progress';
export type ChartMetric='xp'|'coins'|'quests';
const dayFormat=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit'});
export function bangkokDay(time:number){const parts=dayFormat.formatToParts(time);return ['year','month','day'].map(type=>parts.find(p=>p.type===type)!.value).join('-');}
export function progressBuckets(progress:UserProgress,days:number,now:number){
 const today=new Date(`${bangkokDay(now)}T00:00:00+07:00`).getTime();
 return Array.from({length:days},(_,index)=>{const date=bangkokDay(today-(days-1-index)*86400000);const records=Object.values(progress.rewards).filter(r=>bangkokDay(r.completedAt)===date);return {date,xp:records.reduce((n,r)=>n+r.xp,0),coins:records.reduce((n,r)=>n+r.coins,0),quests:records.length};});
}
