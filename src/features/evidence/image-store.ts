// Binary images only. Quest state remains in the existing progress snapshot.
async function database(){return new Promise<IDBDatabase>((resolve,reject)=>{const request=indexedDB.open('liferpg.images',1);request.onupgradeneeded=()=>request.result.createObjectStore('images');request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(new Error('เปิดที่เก็บภาพไม่ได้'));});}
export async function imageOperation(action:'get'|'put'|'delete',id:string,blob?:Blob){const db=await database();try{return await new Promise<Blob|undefined>((resolve,reject)=>{const transaction=db.transaction('images',action==='get'?'readonly':'readwrite');const store=transaction.objectStore('images');const req=action==='get'?store.get(id):action==='put'?store.put(blob,id):store.delete(id);let result:Blob|undefined;req.onsuccess=()=>{result=action==='get'?req.result:undefined;};transaction.oncomplete=()=>resolve(result);transaction.onerror=()=>reject(new Error('บันทึกภาพในเครื่องไม่ได้'));transaction.onabort=()=>reject(new Error('ยกเลิกการบันทึกภาพ'));});}finally{db.close();}}
export async function prepareImage(file:File){
 if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>5*1024*1024||file.size===0)throw new Error('ใช้ JPG, PNG หรือ WebP ขนาดไม่เกิน 5 MB');
 const bitmap=await createImageBitmap(file);try{
 if(bitmap.width*bitmap.height>40_000_000)throw new Error('ภาพมีความละเอียดสูงเกินไป กรุณาย่อก่อน');
 const scale=Math.min(1,1600/Math.max(bitmap.width,bitmap.height));const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));const ctx=canvas.getContext('2d');if(!ctx)throw new Error('เตรียมภาพไม่ได้');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);
 return await new Promise<Blob>((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('อ่านภาพไม่ได้')),'image/jpeg',0.85));
 }finally{bitmap.close();}
}
