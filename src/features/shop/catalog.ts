// Shop catalogue: battle potions (consumable) and character skins (permanent).
// Prices are mirrored in supabase/migrations/*_shop_v2.sql (item_catalog / skin_catalog).
export type ItemId = 'hint' | 'heart' | 'reveal' | 'double';
export type ShopItem = { id: ItemId; name: string; effect: string; price: number; liquid: string };
export const items: ShopItem[] = [
  { id: 'hint', name: 'น้ำยาคำใบ้', effect: 'ได้คำใบ้เพิ่ม 1 ครั้งระหว่างสู้บอส (ตัดตัวเลือกผิดออก 1 ข้อ)', price: 150, liquid: '#4a90e2' },
  { id: 'heart', name: 'ยาเพิ่มหัวใจ', effect: 'ฟื้นหัวใจ 1 ดวงระหว่างสู้บอส', price: 200, liquid: '#e0484b' },
  { id: 'reveal', name: 'น้ำยาเฉลยคำตอบ', effect: 'เผยคำตอบที่ถูกของข้อที่กำลังตอบ 1 ข้อ', price: 345, liquid: '#e8b730' },
  { id: 'double', name: 'น้ำยาพลังคูณสอง', effect: 'ตอบถูกครั้งถัดไปทำดาเมจ ×2 พลังบอสลด 2 ขีด', price: 750, liquid: '#9b59d0' },
];
export const MAX_ITEM_QTY = 9;
export const itemById = (id: string) => items.find(i => i.id === id);

export type Rarity = 'starter' | 'common' | 'rare' | 'epic' | 'legendary';
export const rarities: Record<Rarity, { label: string; price: number; color: string }> = {
  starter: { label: 'เริ่มต้น', price: 0, color: '#9aa39c' },
  common: { label: 'ธรรมดา', price: 150, color: '#8fb07a' },
  rare: { label: 'หายาก', price: 300, color: '#5b9bd5' },
  epic: { label: 'มหากาพย์', price: 500, color: '#a46bd6' },
  legendary: { label: 'ตำนาน', price: 800, color: '#e0a530' },
};
export type Skin = { id: string; name: string; rarity: Rarity };
// Order follows the generated sheet; images live in public/images/skins/<id>.png (cut by scripts/skin-boxes.txt).
export const skins: Skin[] = [
  { id: 'swordsman', name: 'นักดาบฝึกหัด', rarity: 'starter' }, { id: 'knight', name: 'อัศวินเหล็ก', rarity: 'rare' },
  { id: 'rogue', name: 'นักย่องเบา', rarity: 'rare' }, { id: 'archer', name: 'นักธนูป่า', rarity: 'rare' },
  { id: 'mage', name: 'นักเวทม่วง', rarity: 'rare' }, { id: 'sorceress', name: 'แม่มดนักอ่าน', rarity: 'rare' },
  { id: 'priestess', name: 'นักบวชหญิง', rarity: 'epic' }, { id: 'paladin', name: 'อัศวินศักดิ์สิทธิ์', rarity: 'legendary' },
  { id: 'monk', name: 'นักพรต', rarity: 'common' }, { id: 'veteran', name: 'ทหารผ่านศึก', rarity: 'rare' },
  { id: 'bard', name: 'นักกวีพเนจร', rarity: 'common' }, { id: 'barbarian', name: 'นักรบเถื่อน', rarity: 'rare' },
  { id: 'ranger', name: 'พรานหน้าไม้', rarity: 'rare' }, { id: 'seer', name: 'ผู้หยั่งรู้', rarity: 'epic' },
  { id: 'assassin', name: 'มือสังหารเงา', rarity: 'epic' }, { id: 'samurai', name: 'ซามูไร', rarity: 'legendary' },
  { id: 'elf', name: 'เอลฟ์นักธนู', rarity: 'rare' }, { id: 'dwarf', name: 'คนแคระขวานเหล็ก', rarity: 'rare' },
  { id: 'orc', name: 'ออร์ค', rarity: 'rare' }, { id: 'gnome', name: 'โนมนักประดิษฐ์', rarity: 'rare' },
  { id: 'minotaur', name: 'มิโนทอร์', rarity: 'epic' }, { id: 'naga', name: 'นาคี', rarity: 'epic' },
  { id: 'fairy', name: 'ภูตจิ๋ว', rarity: 'epic' }, { id: 'peasant', name: 'ชาวบ้าน', rarity: 'common' },
  { id: 'farmer', name: 'ชาวนา', rarity: 'common' }, { id: 'blacksmith', name: 'ช่างตีเหล็ก', rarity: 'common' },
  { id: 'elder', name: 'ผู้เฒ่า', rarity: 'common' }, { id: 'maiden', name: 'สาวชาวบ้าน', rarity: 'common' },
  { id: 'boy', name: 'เด็กชาย', rarity: 'common' }, { id: 'guard', name: 'ยามประตู', rarity: 'common' },
  { id: 'goblin', name: 'ก็อบลิน', rarity: 'common' }, { id: 'skeleton', name: 'โครงกระดูกนักดาบ', rarity: 'rare' },
  { id: 'slime', name: 'สไลม์', rarity: 'common' }, { id: 'zombie', name: 'ซอมบี้', rarity: 'common' },
  { id: 'bandit', name: 'โจรป่า', rarity: 'common' }, { id: 'wolf', name: 'หมาป่าเทา', rarity: 'rare' },
  { id: 'shadow', name: 'ผู้คลุมม่วง', rarity: 'epic' },
];
export const STARTER_SKIN = 'swordsman';
export const skinById = (id: string) => skins.find(s => s.id === id);
export const skinPrice = (skin: Skin) => rarities[skin.rarity].price;
export const skinImage = (id: string) => `/images/skins/${id}.png`;
