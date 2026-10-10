"use client";
import type { Quest } from "@/features/quests/types";
import { useFocusView } from "./use-focus-view";
import { formatTime, roundLabels } from "./rules";
export function FocusSummary({ quest }: { quest: Quest }) {
  const { ready, focus, view } = useFocusView(quest.id);
  if (!ready) return null;
  return <p className="focus-summary">ขั้นตอน {focus.checkedStepIds.length}/{quest.steps.length} · โฟกัสสะสม {formatTime(view.totalMs)} · {roundLabels[view.status]}</p>;
}
