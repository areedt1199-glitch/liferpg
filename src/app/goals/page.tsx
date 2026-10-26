import { IntroPage } from "@/components/ui/intro-page";
import { GoalBoard } from "@/features/journey/goal-board";
export default function GoalsPage() {
  return <IntroPage eyebrow="CHOOSE YOUR PATH" title="เป้าหมายของคุณ" description="เพิ่มได้หลายเป้าหมาย แต่ละเป้าหมายมีแผนที่และความคืบหน้าของตัวเอง"><GoalBoard /></IntroPage>;
}
