/* Streak campfire: the daily-practice streak drawn as a fire that grows with the streak.
   Cold logs at 0, a small flame from day 1, bigger at 3 and 7 days with sparks, a blue core from 14 days.
   If the streak is still alive but nothing was practised today, the fire burns low as a gentle reminder. */
export type FireTier = 'cold' | 'small' | 'medium' | 'large' | 'legend';
export function fireTier(streak: number): FireTier {
  return streak <= 0 ? 'cold' : streak < 3 ? 'small' : streak < 7 ? 'medium' : streak < 14 ? 'large' : 'legend';
}
export const fireLabels: Record<FireTier, string> = {
  cold: 'ยังไม่ได้จุดไฟ', small: 'ไฟกองเล็ก', medium: 'ไฟลุกโชน', large: 'กองไฟใหญ่', legend: 'เปลวไฟตำนาน',
};

export function Campfire({ streak, litToday = true, size = 22 }: { streak: number; litToday?: boolean; size?: number }) {
  const tier = fireTier(streak), low = tier !== 'cold' && !litToday;
  return <svg className={`campfire fire-${tier} ${low ? 'fire-low' : ''}`} width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" shapeRendering="crispEdges">
    {tier !== 'cold' && <g className="fire-flames">
      <path className="flame-outer" d="M16 4l3 5 3-2v6l3 3-2 9H9l-2-9 3-3V7l3 2z" />
      <path className="flame-mid" d="M16 10l2 4 3-1v5l-2 6h-6l-2-6v-5l3 1z" />
      <path className="flame-core" d="M16 16l2 3v4h-4v-4z" />
    </g>}
    {(tier === 'large' || tier === 'legend') && !low && <g className="fire-sparks"><rect x="7" y="6" width="2" height="2" /><rect x="24" y="4" width="2" height="2" /><rect x="21" y="10" width="1" height="1" /></g>}
    {tier === 'cold' && <g className="fire-smoke"><rect x="15" y="12" width="2" height="2" /><rect x="17" y="9" width="2" height="2" /><rect x="15" y="6" width="2" height="2" /></g>}
    <g className="fire-logs"><path d="M5 25h22v3H5z" /><path d="M8 23h16v2H8z" className="log-light" /><path d="M4 26h3v3H4zM25 26h3v3h-3z" className="log-end" /></g>
  </svg>;
}
