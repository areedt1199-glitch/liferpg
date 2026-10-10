"use client";
import { useState } from 'react';
import { useProgress } from '../journey/progress-store';
import { ProgressNotice } from '../journey/progress-notice';
import { progressBuckets, type ChartMetric } from './rules';
import { journeyDefinition } from '../journey/definitions';
import { formatTime } from '../focus/rules';
import {RewardPie} from './reward-pie';
export function ProgressCharts(){
 const {ready,progress,mode,userId}=useProgress();const [metric,setMetric]=useState<ChartMetric>('xp');const [days,setDays]=useState(7);
 const [now]=useState(()=>Date.now());
 const [chart,setChart]=useState<'pie'|'bar'>('pie');
 const labels={xp:'XP ที่ได้รับ',coins:'เหรียญที่ได้รับ',quests:'เควสต์ที่สำเร็จ'};
 if(!ready)return <ProgressNotice/>;
 if(mode==='account'&&!userId)return <ProgressNotice/>;
 const buckets=progressBuckets(progress,days,now);const max=Math.max(1,...buckets.map(b=>b[metric]));const total=buckets.reduce((n,b)=>n+b[metric],0);
 return <><ProgressNotice/><div className="growth-filters" role="group" aria-label="ข้อมูลบนกราฟ">{(Object.keys(labels) as ChartMetric[]).map(key=><button key={key} aria-pressed={metric===key} onClick={()=>setMetric(key)}>{labels[key]}</button>)}</div><div className="growth-filters" role="group" aria-label="ช่วงเวลา">{[7,30].map(n=><button key={n} aria-pressed={days===n} onClick={()=>setDays(n)}>{n} วันล่าสุด</button>)}</div><section className="growth-card"><h2>{labels[metric]} · {days} วันล่าสุด</h2><p className="chart-total">{total.toLocaleString('th-TH')}</p><p className="muted">นับจากวันที่ยืนยันสำเร็จ ตามเวลาประเทศไทย เหรียญในกราฟคือที่ได้รับก่อนหักซื้อชุด</p>
 <div className="growth-filters" role="group" aria-label="รูปแบบกราฟ"><button aria-pressed={chart==='pie'} onClick={()=>setChart('pie')}>กราฟวงกลม</button><button aria-pressed={chart==='bar'} onClick={()=>setChart('bar')}>กราฟรายวัน</button></div>{chart==='pie'?<RewardPie progress={progress} metric={metric} dates={buckets.map(b=>b.date)}/>:<svg className="activity-chart" viewBox="0 0 700 240" role="img" aria-label={`${labels[metric]}รวม ${total} ใน${days}วัน มีตารางข้อมูลด้านล่าง`}><line x1="15" y1="205" x2="690" y2="205" stroke="var(--line)"/>{buckets.map((b,i)=>{const width=660/days;const height=170*b[metric]/max;return <g key={b.date}><title>{b.date}: {b[metric]}</title><rect x={20+i*width} y={205-height} width={Math.max(3,width-5)} height={height} rx="4" fill="var(--forest-soft)"/>{days===7&&<text x={20+i*width+width/2-3} y="228" textAnchor="middle" fill="var(--ink)" fontSize="12">{b.date.slice(8)}/{b.date.slice(5,7)}</text>}</g>;})}</svg>}
 {total===0&&<p>ยังไม่มีบันทึกที่สำเร็จในช่วงนี้</p>}<details><summary>ดูตารางข้อมูลกราฟ</summary><div className="table-scroll"><table><caption>{labels[metric]}ตามวันที่</caption><thead><tr><th>วันที่</th><th>{labels[metric]}</th></tr></thead><tbody>{buckets.map(b=><tr key={b.date}><td>{b.date}</td><td>{b[metric]}</td></tr>)}</tbody></table></div></details></section>
 <section className="growth-card focus-history"><h2>เวลาโฟกัสที่บันทึกแล้วต่อเควสต์</h2><p className="muted">เวลาเป็นบันทึกที่ผู้ใช้รายงาน ไม่ใช่หลักฐานว่างานสำเร็จ และไม่ได้แบ่งเป็นรายวัน</p>{journeyDefinition.quests.map(q=><div className="focus-history-row" key={q.id}><span>{q.title}</span><strong>{formatTime(progress.focus[q.id].totalMs)}</strong></div>)}</section></>;
}


