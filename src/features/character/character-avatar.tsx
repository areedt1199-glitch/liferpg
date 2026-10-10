"use client";
/* eslint-disable @next/next/no-img-element -- pixel-art sprites/backdrops are small static files scaled by CSS */
import { useProgress } from '../journey/progress-store';
import { STARTER_SKIN, skinById, skinImage } from '../shop/catalog';
/** The equipped skin (or a given one) as a framed pixel portrait. */
export function CharacterAvatar({ small = false, skinId }: { small?: boolean; skinId?: string }) {
  const { progress } = useProgress(); const skin = skinById(skinId ?? progress.equippedSkinId) ?? skinById(STARTER_SKIN)!;
  return <div className={`character-portrait ${small ? 'portrait-small' : ''}`} role="img" aria-label={`ตัวละครสกิน${skin.name}`}><img src={skinImage(skin.id)} alt="" /></div>;
}
