export type QuestStatus = "locked" | "available" | "in_progress" | "completed";
export type Quest = {
  id: string;
  title: string;
  task: string;
  place: string;
  minutes: number;
  xp: number;
  coins: number;
  steps: readonly { id: string; text: string }[];
  success: string;
};
export type QuestWithStatus = Quest & { status: QuestStatus };
