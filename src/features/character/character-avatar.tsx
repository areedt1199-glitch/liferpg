"use client";
import { useProgress } from '../journey/progress-store';
import { outfits } from '../wardrobe/catalog';
export function CharacterAvatar({ small = false, outfitId }: { small?: boolean; outfitId?:string }) {
  const {progress}=useProgress();const outfit=outfits.find(i=>i.id===(outfitId??progress.equippedOutfitId))??outfits[0];
  return <div className={`character-placeholder ${small ? "avatar-small" : ""}`} role="img" aria-label={`ตัวละครสวม${outfit.title}`}><div className="character-head" /><div className="character-cloak" style={{background:outfit.color,borderBottomColor:outfit.trim}}/><div className="character-shadow" /></div>;
}
