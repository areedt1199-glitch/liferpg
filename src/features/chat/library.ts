import careers from '../careers/catalog.json';
const basics=[
 {id:'variables',title:'ตัวแปรและเงื่อนไข',content:'ตัวแปรเก็บค่าที่โปรแกรมนำไปใช้ เช่น score = 60 ส่วน if/else เลือกการทำงานตามเงื่อนไข ลองรับคะแนนแล้วแสดงผ่านเมื่อ score >= 50 และไม่ผ่านเมื่อคะแนนต่ำกว่า 50 ทดสอบทั้งสองกรณีก่อนยืนยันเควสต์',keywords:['ตัวแปร','if','else','คะแนน','เงื่อนไข']},
 {id:'loops',title:'ฝึกลูป',content:'ลูปทำงานซ้ำตามจำนวนรอบหรือเงื่อนไข เริ่มจากแสดงเลข 1 ถึง 5 ตรวจว่าตัวแปรควบคุมเปลี่ยนค่าทุกรอบและมีทางหยุด เพื่อหลีกเลี่ยงการวนซ้ำไม่สิ้นสุด',keywords:['ลูป','loop','for','while','ทำซ้ำ']},
 {id:'tools',title:'เตรียมเครื่องมือ',content:'ติดตั้งเครื่องมือเขียนโปรแกรม สร้างไฟล์โปรแกรมแรก แล้วรันให้แสดง Hello World ตรวจว่าเปิดไฟล์และรันซ้ำด้วยตนเองได้ก่อนยืนยันสำเร็จ',keywords:['hello','เครื่องมือ','ติดตั้ง','เริ่ม','โปรแกรม']},
 {id:'guess-number',title:'เกมทายตัวเลข',content:'กำหนดเลขคำตอบ รับเลขที่ผู้เล่นทาย ใช้ if/else ตรวจว่าถูกหรือผิด แล้วใช้ลูปให้ทายซ้ำจนถูก ลองทายผิดหลายครั้งและตอบถูกเพื่อตรวจการจบเกม',keywords:['ทาย','ตัวเลข','เกม']},
 {id:'improve-game',title:'ทดลองและปรับเกม',content:'เตรียมกรณีทดสอบ เช่น คำตอบถูก คำตอบผิด และค่าที่ไม่ใช่ตัวเลข บันทึกข้อผิดพลาด แก้ทีละข้อ แล้วสรุปสิ่งที่เรียนรู้ การไม่ล่มอย่างเดียวไม่พอ ต้องตรวจผลลัพธ์ให้ตรงตามงานด้วย',keywords:['ทดสอบ','บั๊ก','แก้','ปรับ','สรุป']},
];
export type LibraryAnswer={title:string;content:string;href:string};
export function searchLibrary(question:string,pathId?:string):LibraryAnswer[]{
 const query=question.trim().toLocaleLowerCase();if(!query)return [];
 const words=query.split(/[\s?？,]+/).filter(Boolean);
 const scored=basics.map(b=>({...b,score:b.keywords.reduce((n,w)=>n+(query.includes(w)?2:0),0)})).filter(b=>b.score>0).sort((a,b)=>b.score-a.score).slice(0,3).map(b=>({title:b.title,content:b.content,href:`/quests/${b.id}`}));
 if(scored.length)return scored;
 return careers.filter(c=>(!pathId||c.id===pathId)&&words.some(w=>`${c.title} ${c.englishTitle} ${c.description} ${c.tasks.map(t=>t.title).join(' ')}`.toLowerCase().includes(w))).slice(0,3).map(c=>({title:c.title,content:`${c.description}\n${c.tasks.map((t,i)=>`${i+1}. ${t.title}: ${t.description}`).join('\n')}`,href:'/careers'}));
}
