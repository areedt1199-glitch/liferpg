// Original liferpg 2D outfits, using the purchase/equip pattern from LifeQuest.
export const outfits = [
 {id:'forest',title:'นักเดินทางป่า',description:'ชุดเริ่มต้นสีเขียวป่า',price:0,color:'#285444',trim:'#956c23'},
 {id:'sunrise',title:'เสื้อคลุมรุ่งอรุณ',description:'เสื้อคลุมทองสำหรับก้าวใหม่',price:30,color:'#ad7632',trim:'#efd9a0'},
 {id:'moonlight',title:'นักเดินทางแสงจันทร์',description:'เสื้อคลุมม่วงกับขอบสีเงิน',price:45,color:'#70638c',trim:'#d8d4e5'},
 {id:'river',title:'ผู้พิทักษ์สายน้ำ',description:'เสื้อคลุมฟ้าครามสำหรับนักสำรวจ',price:60,color:'#3e7881',trim:'#b5ded3'},
] as const;
export type PurchaseRecord = {itemId:string;coins:number;purchasedAt:number};
