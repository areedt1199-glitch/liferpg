"use client";
/* eslint-disable @next/next/no-img-element -- pixel-art sprites are small static files scaled by CSS */
import { bosses, type SpriteId } from './catalog';
export const bossImage = (sprite: SpriteId) => `/images/bosses/${sprite}.png`;
/** Small boss marker for the journey map. */
export function BossAvatar({ questId, small = false, defeated = false }: { questId: string; small?: boolean; defeated?: boolean }) {
  const boss = bosses[questId]; if (!boss) return null;
  return <img src={bossImage(boss.sprite)} alt={`${boss.name}${defeated ? ' · ชนะแล้ว' : ''}`} className={`boss-avatar ${small ? 'small' : ''} ${defeated ? 'defeated' : ''}`} />;
}
