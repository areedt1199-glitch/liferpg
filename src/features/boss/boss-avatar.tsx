"use client";
import { bosses } from './catalog';
import { PixelBoss } from './pixel/pixel-canvas';
/** Small static boss marker for the journey map. */
export function BossAvatar({ questId, small = false, defeated = false }: { questId: string; small?: boolean; defeated?: boolean }) {
  const boss = bosses[questId]; if (!boss) return null;
  return <PixelBoss sprite={boss.sprite} mode={defeated ? 'ko' : 'idle'} animate={false} className={`boss-avatar ${small ? 'small' : ''} ${defeated ? 'defeated' : ''}`} label={`${boss.name}${defeated ? ' · ชนะแล้ว' : ''}`} />;
}
