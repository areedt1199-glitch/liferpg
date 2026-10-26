import careers from '../careers/catalog.json';
import { findQuest, goalOfQuest } from '../journey/definitions';
import { planMinutesOf, type PlanItem } from '../journey/progress';

export const thaiMonths = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
export const weekdays = ['จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.', 'อา.'];
const pad = (n: number) => String(n).padStart(2, '0');
export const isoDay = (year: number, month: number, day: number) => `${year}-${pad(month + 1)}-${pad(day)}`;

/** Weeks (Monday first) covering a month; days outside the month are null. month is 0-based. */
export function monthGrid(year: number, month: number): (string | null)[][] {
  const first = new Date(Date.UTC(year, month, 1)), days = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const cells: (string | null)[] = Array((first.getUTCDay() + 6) % 7).fill(null);
  for (let d = 1; d <= days; d++) cells.push(isoDay(year, month, d));
  while (cells.length % 7) cells.push(null);
  return Array.from({ length: cells.length / 7 }, (_, w) => cells.slice(w * 7, w * 7 + 7));
}
export function thaiDate(day: string) {
  const [y, m, d] = day.split('-').map(Number);
  return `${d} ${thaiMonths[m - 1]} ${y + 543}`;
}
/** Bangkok clock time "HH:MM" for a timestamp. */
export function bangkokTime(time: number) {
  return new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(time);
}
export function planEnd(item: Pick<PlanItem, 'start' | 'minutes'>) {
  const end = planMinutesOf(item.start) + item.minutes;
  return end >= 24 * 60 ? '24:00' : `${pad(Math.floor(end / 60))}:${pad(end % 60)}`;
}
/** Slots of one day whose time ranges overlap the candidate. */
export function overlapping(plans: PlanItem[], day: string, start: string, minutes: number, except?: string) {
  const a = planMinutesOf(start), b = a + minutes;
  return plans.filter(p => p.day === day && p.id !== except && planMinutesOf(p.start) < b && a < planMinutesOf(p.start) + p.minutes);
}
export function planTitle(item: PlanItem) {
  if (item.kind === 'quest') { const q = findQuest(item.ref), g = goalOfQuest(item.ref); return q ? `${q.title} · ${g?.title}` : 'ด่านที่ไม่พบ'; }
  if (item.kind === 'practice') { const [c, t] = item.ref.split('|'); const career = careers.find(x => x.id === c); return `${career?.tasks.find(x => x.id === t)?.title ?? 'งานฝึก'} · ฝึกประจำวัน`; }
  return item.note;
}
export const kindLabels: Record<PlanItem['kind'], string> = { quest: 'ด่านผจญภัย', practice: 'ฝึกประจำวัน', note: 'กิจกรรมอื่น' };
