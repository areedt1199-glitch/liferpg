import { IntroPage } from "@/components/ui/intro-page";
import { PlanBoard } from "@/features/plan/plan-board";
export default function PlanPage() {
  return <IntroPage eyebrow="PLAN YOUR DAYS" title="ตารางแผนโฟกัส" description="ดูภาพรวมทั้งเดือนในปฏิทิน แล้วจัดช่วงเวลาโฟกัสของแต่ละวัน ว่าจะทำด่านไหน ฝึกอะไร หรือกิจกรรมอื่น"><PlanBoard /></IntroPage>;
}
