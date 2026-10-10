import { Icon } from "@/components/ui/icon";
import type { QuestWithStatus } from "@/features/quests/types";
import { statusLabels } from "./progress";
import { CharacterAvatar } from "@/features/character/character-avatar";
import {BossAvatar} from '../boss/boss-avatar';

export function QuestNode({ quest, index, last, position, selected, onSelect }: { quest: QuestWithStatus; index: number; last: boolean; position: { top: number; left: number }; selected: boolean; onSelect: () => void }) {
  return <li className={`map-stop node-${quest.status}`} style={{ top: position.top, left: `${position.left}%` }}>
    <span className="place-label">{quest.place}</span>
    <div className="node-anchor">{(quest.status === "available" || quest.status === "in_progress" || (last && quest.status === "completed")) && <div className="map-avatar"><CharacterAvatar small /></div>}
      <div className="map-boss"><BossAvatar questId={quest.id} small defeated={quest.status==='completed'}/></div><button type="button" className={`quest-node ${selected ? "selected" : ""}`} onClick={onSelect} aria-pressed={selected} aria-controls="selected-quest" aria-label={`ด่าน ${index + 1} ${quest.title} ${statusLabels[quest.status]}`}><Icon name={quest.status === "locked" ? "lock" : quest.status === "completed" ? "check" : "leaf"} /></button>
    </div><span className="node-title">{index + 1}. {quest.title}</span><span className="node-status">{statusLabels[quest.status]}</span>
  </li>;
}

