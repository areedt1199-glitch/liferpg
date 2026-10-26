import careers from '../careers/catalog.json';
import { findGoal } from '../journey/definitions';
import { trackLabels } from '../careers/tracks';
import type { UserProgress } from '../journey/progress';
export type ChartMetric='xp'|'coins'|'quests';
/** Charts group paths by track only: everything, or AI / Dev / Game. */
export type ChartScope='all'|'ai'|'dev'|'game';
export const scopeLabels:Record<ChartScope,string>={all:'ภาพรวมทุกหมวด',...trackLabels};
const dayFormat=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit'});
export function bangkokDay(time:number){const parts=dayFormat.formatToParts(time);return ['year','month','day'].map(type=>parts.find(p=>p.type===type)!.value).join('-');}
/** Track of a goal or practised career; retired paths without a track count as Dev. */
export function trackOf(pathId:string):Exclude<ChartScope,'all'>{
 const track=findGoal(pathId)?.track??careers.find(c=>c.id===pathId)?.track;
 return track==='ai'||track==='game'?track:'dev';
}
export function scopedRecords(progress:UserProgress,scope:ChartScope='all'){
 return {rewards:progress.rewards.filter(r=>scope==='all'||trackOf(r.goalId)===scope),practice:Object.values(progress.practice??{}).filter(r=>scope==='all'||trackOf(r.careerId)===scope)};
}
export function progressBuckets(progress:UserProgress,days:number,now:number,scope:ChartScope='all'){
 const today=new Date(`${bangkokDay(now)}T00:00:00+07:00`).getTime();const {rewards,practice}=scopedRecords(progress,scope);
 return Array.from({length:days},(_,index)=>{const date=bangkokDay(today-(days-1-index)*86400000);const records=rewards.filter(r=>bangkokDay(r.completedAt)===date);const practiced=practice.filter(r=>r.day===date);return {date,xp:[...records,...practiced].reduce((n,r)=>n+r.xp,0),coins:[...records,...practiced].reduce((n,r)=>n+r.coins,0),quests:records.length};});
}

const trackColors:Record<string,string>={ai:'#709bb0',dev:'#315a45',game:'#c89c4c'};
const colors=['#315a45','#c89c4c','#9888b4','#709bb0','#b87d6a','#5f8f6e','#7a5aa0','#d9a441','#4d7c8a','#a35d6a','#6b8f3a','#8a6f4e'];
const pathName=(id:string)=>findGoal(id)?.title??careers.find(c=>c.id===id)?.title??id;
/** Combined: one slice per track (AI / Dev / Game). One track: one slice per path inside it. */
export function pieSlices(progress:UserProgress,metric:ChartMetric,dates:string[],scope:ChartScope){
 const {rewards,practice}=scopedRecords(progress,scope);
 const rows=[...rewards.filter(r=>dates.includes(bangkokDay(r.completedAt))).map(r=>({path:r.goalId,value:metric==='quests'?1:r[metric]})),
  ...(metric==='quests'?[]:practice.filter(r=>dates.includes(r.day)).map(r=>({path:r.careerId,value:r[metric]})))];
 const sums=new Map<string,{title:string;value:number;color:string}>();
 if(scope==='all')for(const t of ['ai','dev','game'] as const)sums.set(t,{title:scopeLabels[t],value:0,color:trackColors[t]});
 for(const r of rows){const key=scope==='all'?trackOf(r.path):r.path;const s=sums.get(key)??{title:pathName(key),value:0,color:colors[sums.size%colors.length]};s.value+=r.value;sums.set(key,s);}
 return [...sums.values()];
}
