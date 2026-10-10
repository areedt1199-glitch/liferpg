import { bosses } from './catalog';
export function BossAvatar({questId,small=false,defeated=false}:{questId:string;small?:boolean;defeated?:boolean}){
 const boss=bosses[questId];if(!boss)return null;
 return <svg className={`boss-avatar ${small?'small':''} ${defeated?'defeated':''}`} viewBox="0 0 140 160" role="img" aria-label={`${boss.name}${defeated?' · ชนะแล้ว':''}`}>
 <ellipse cx="70" cy="148" rx="43" ry="8" fill="#223f3220"/>
 <path d="M34 107 L24 135 L40 140 L51 115 M106 107 L116 135 L100 140 L89 115" fill={boss.color}/>
 <path d="M46 112 L44 144 L63 144 L66 119 M94 112 L96 144 L77 144 L74 119" fill={boss.color}/>
 <path d="M36 76 Q70 54 104 76 L108 117 Q70 137 32 117Z" fill={boss.color} stroke="#294936" strokeWidth="3"/>
 {boss.kind==='dragon'&&<path d="M35 85 L7 64 L13 105 L34 115 M105 85 L133 64 L127 105 L106 115" fill={boss.color} stroke="#294936" strokeWidth="3"/>}
 <path d="M41 44 L35 13 L59 30 M99 44 L105 13 L81 30" fill={boss.color} stroke="#294936" strokeWidth="3"/>
 <path d="M39 46 Q40 27 70 26 Q100 27 101 46 L98 74 Q70 94 42 74Z" fill={boss.color} stroke="#294936" strokeWidth="3"/>
 {boss.kind==='knight'&&<path d="M45 50 H95 V64 H45Z" fill="#294936"/>}
 <circle cx="56" cy="53" r="5" fill="#fcf7e8"/><circle cx="84" cy="53" r="5" fill="#fcf7e8"/>
 <path d="M61 70 Q70 75 79 70" fill="none" stroke="#294936" strokeWidth="3" strokeLinecap="round"/>
 <path d="M70 91 L82 104 L70 117 L58 104Z" fill="#f3d88c"/>
 {defeated&&<g><circle cx="113" cy="22" r="17" fill="#214d39"/><path d="M105 22 L111 28 L122 15" fill="none" stroke="#fff8e4" strokeWidth="3"/></g>}
 </svg>;
}
