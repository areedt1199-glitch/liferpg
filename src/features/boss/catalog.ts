export type BossQuestion = { id:string; prompt:string; options:string[]; answer:number; explanation:string };
export const bosses:Record<string,{name:string;color:string;kind:string;questions:BossQuestion[]}>={
 tools:{name:'โกเลมเครื่องมือ',color:'#8b9c72',kind:'golem',questions:[
 {id:'tools-run',prompt:'เมื่อเตรียมเครื่องมือแล้ว ควรตรวจอะไรเป็นอย่างแรก?',options:['รัน Hello World และดูผลลัพธ์','ลบไฟล์ทั้งหมด','เพิ่มระบบใหญ่ทันที'],answer:0,explanation:'โปรแกรมเล็กช่วยตรวจว่าเครื่องมือพร้อมใช้งาน'},
 {id:'tools-error',prompt:'ถ้าโปรแกรมรันไม่ได้ ควรเริ่มจากอะไร?',options:['ข้ามไปด่านถัดไป','อ่านข้อความผิดพลาดและตรวจคำสั่งรัน','ยืนยันสำเร็จทันที'],answer:1,explanation:'ข้อความผิดพลาดช่วยบอกจุดที่ต้องแก้'},
 {id:'tools-save',prompt:'ควรเก็บไฟล์โปรแกรมไว้ที่ไหน?',options:['ที่ที่หาไม่เจอ','ไม่ต้องบันทึก','โฟลเดอร์โปรเจกต์ที่จัดไว้'],answer:2,explanation:'จัดโฟลเดอร์และบันทึกเพื่อกลับมาทำต่อได้'}]},
 variables:{name:'จิ้งจอกเงื่อนไข',color:'#c79749',kind:'fox',questions:[
 {id:'variables-use',prompt:'ตัวแปรมีหน้าที่อะไร?',options:['เก็บค่าที่โปรแกรมนำไปใช้','ทำให้โปรแกรมจบทันที','แทนข้อผิดพลาด'],answer:0,explanation:'ตัวแปรเก็บค่าที่เปลี่ยนหรือใช้คำนวณได้'},
 {id:'variables-score',prompt:'score = 60 และเงื่อนไข score >= 50 จะได้ผลใด?',options:['ไม่ผ่าน','ผ่าน','ไม่มีผลลัพธ์เสมอ'],answer:1,explanation:'60 มากกว่าหรือเท่ากับ 50 จึงเป็นจริง'},
 {id:'variables-test',prompt:'ควรทดสอบโปรแกรมผ่าน/ไม่ผ่านอย่างไร?',options:['ทดสอบแต่คะแนนสูง','ไม่ต้องรัน','ทดสอบทั้งคะแนนผ่านและคะแนนไม่ผ่าน'],answer:2,explanation:'ทดสอบทั้งสองสาขาของ if/else'}]},
 loops:{name:'ภูตวังวน',color:'#788ea5',kind:'spirit',questions:[
 {id:'loops-use',prompt:'ลูปช่วยเรื่องใด?',options:['ทำงานซ้ำอย่างเป็นระบบ','ลบตัวแปรทั้งหมด','ทำให้ทุกเงื่อนไขเป็นจริง'],answer:0,explanation:'ลูปใช้ทำงานซ้ำตามจำนวนหรือเงื่อนไข'},
 {id:'loops-stop',prompt:'ลูป while ควรมีอะไรเพื่อไม่ให้วนไม่จบ?',options:['ข้อความยาว','เงื่อนไขหยุดที่เกิดขึ้นได้','สีพื้นหลัง'],answer:1,explanation:'ต้องเปลี่ยนค่าหรือมีเงื่อนไขที่ทำให้หยุดได้'},
 {id:'loops-count',prompt:'ทำงานซ้ำ 3 รอบ รอบละพิมพ์หนึ่งครั้ง จะพิมพ์กี่ครั้ง?',options:['หนึ่งครั้ง','ห้าครั้ง','สามครั้ง'],answer:2,explanation:'แต่ละรอบทำงานหนึ่งครั้ง รวมสามครั้ง'}]},
 'guess-number':{name:'อัศวินปริศนา',color:'#947ba1',kind:'knight',questions:[
 {id:'game-low',prompt:'ถ้าทายน้อยกว่าเลขเป้าหมาย ควรบอกผู้เล่นอย่างไร?',options:['ลองเลขที่มากขึ้น','ชนะทันที','จบเกมเสมอ'],answer:0,explanation:'ให้คำใบ้ตรงกับการเปรียบเทียบ'},
 {id:'game-repeat',prompt:'ส่วนใดช่วยให้ผู้เล่นทายได้หลายครั้ง?',options:['ชื่อตัวแปร','ลูป','การปิดโปรแกรม'],answer:1,explanation:'ลูปรับค่าทายซ้ำจนพบคำตอบหรือครบเงื่อนไข'},
 {id:'game-win',prompt:'เมื่อเลขทายเท่ากับเป้าหมาย ควรทำอะไร?',options:['บอกว่าต่ำไป','ไม่แสดงผล','แจ้งว่าทายถูกและจบรอบ'],answer:2,explanation:'ตรวจกรณีเท่ากันเพื่อกำหนดจุดจบ'}]},
 'improve-game':{name:'มังกรแห่งการทดสอบ',color:'#527e68',kind:'dragon',questions:[
 {id:'polish-edge',prompt:'การทดสอบเกมควรครอบคลุมอะไร?',options:['กรณีปกติและกรณีขอบ/ข้อมูลผิด','เฉพาะกรณีที่เคยผ่าน','เฉพาะชื่อเกม'],answer:0,explanation:'กรณีหลากหลายช่วยพบข้อผิดพลาด'},
 {id:'polish-retest',prompt:'หลังแก้บั๊กควรทำอะไร?',options:['ลบผลทดสอบ','รันทดสอบซ้ำเพื่อยืนยันการแก้','ข้ามการตรวจ'],answer:1,explanation:'ทดสอบซ้ำเพื่อดูว่าบั๊กหายและส่วนเดิมยังทำงาน'},
 {id:'polish-summary',prompt:'สรุปผลงานควรมีอะไร?',options:['เฉพาะจำนวนไฟล์','เฉพาะสีหน้าจอ','สิ่งที่ทำ วิธีทดสอบ และสิ่งที่อยากปรับ'],answer:2,explanation:'บันทึกผลงานและบทเรียนเพื่อพัฒนาต่อ'}]}
};
export type BossResult={score:number;attempts:number;passedAt:number|null};
export function gradeBoss(questId:string,answers:Record<string,number>){
 const boss=bosses[questId];if(!boss||!answers||typeof answers!=='object'||Array.isArray(answers)||Object.keys(answers).length!==boss.questions.length||boss.questions.some(q=>!Number.isInteger(answers[q.id])||answers[q.id]<0||answers[q.id]>=q.options.length))throw new Error('ตอบคำถามบอสให้ครบ');
 return boss.questions.filter(q=>answers[q.id]===q.answer).length;
}

