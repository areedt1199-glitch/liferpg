import { IntroPage } from "@/components/ui/intro-page";
import { CharacterSheet } from "@/features/character/character-sheet";
export default function CharacterPage() {
  return <IntroPage eyebrow="MEET YOUR ADVENTURER" title="ตัวละครของคุณ" description="เพื่อนร่วมทางที่จะเติบโตไปพร้อมกับคุณ"><CharacterSheet /></IntroPage>;
}
