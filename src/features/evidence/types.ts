export type EvidenceRecord={id:string;questId:string;path:string;mime:string;size:number;createdAt:number};
export const MAX_IMAGE_BYTES=5*1024*1024;
export function validateImageInfo(mime:string,size:number){if(!['image/jpeg','image/png','image/webp'].includes(mime)||!Number.isSafeInteger(size)||size<=0||size>MAX_IMAGE_BYTES)throw new Error('ใช้ภาพ JPG, PNG หรือ WebP ขนาดไม่เกิน 5 MB');}
