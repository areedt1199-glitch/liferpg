import {journeyDefinition} from '../journey/definitions';
import type {UserProgress} from '../journey/progress';
import {bangkokDay,type ChartMetric} from './rules';
const colors=['#315a45','#c89c4c','#9888b4','#709bb0','#b87d6a','#5f8f6e','#7a5aa0','#d9a441'];
export function RewardPie({progress,metric,dates}:{progress:UserProgress;metric:ChartMetric;dates:string[]}){
 const slices=journeyDefinition.quests.map((q,i)=>{const r=progress.rewards[q.id];return {title:q.title,color:colors[i],value:r&&dates.includes(bangkokDay(r.completedAt))?metric==='quests'?1:r[metric]:0};});
 if(metric!=='quests')slices.push({title:'ฝึกประจำวัน',color:'#8a6f4e',value:Object.values(progress.practice??{}).filter(r=>dates.includes(r.day)).reduce((n,r)=>n+r[metric],0)});
 const total=slices.reduce((n,s)=>n+s.value,0);let start=-Math.PI/2;
 return <div className="pie-layout"><svg viewBox="0 0 300 300" className="reward-pie" role="img" aria-label={`สัดส่วนตามเควสต์ รวม ${total} ดูค่าตัวเลขในรายการประกอบ`}>
 {total===0?<circle cx="150" cy="150" r="112" fill="var(--line)"/>:slices.filter(s=>s.value>0).map(s=>{const angle=s.value/total*Math.PI*2;const end=start+angle;const point=(a:number)=>`${150+112*Math.cos(a)},${150+112*Math.sin(a)}`;const path=`M150,150 L${point(start)} A112,112 0 ${angle>Math.PI?1:0},1 ${point(end)} Z`;start=end;return angle>=Math.PI*2-0.001?<circle key={s.title} cx="150" cy="150" r="112" fill={s.color}><title>{s.title}: {s.value} (100%)</title></circle>:<path key={s.title} d={path} fill={s.color} stroke="var(--surface)" strokeWidth="2"><title>{s.title}: {s.value} ({(s.value/total*100).toFixed(1)}%)</title></path>;})}
 </svg><ul className="pie-legend">{slices.map(s=><li key={s.title}><span className="pie-dot" style={{background:s.color}} aria-hidden="true"/><span>{s.title}</span><strong>{s.value.toLocaleString('th-TH')} · {total?(s.value/total*100).toFixed(1):'0'}%</strong></li>)}</ul></div>;
}

