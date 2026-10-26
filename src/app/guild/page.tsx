import { IntroPage } from '@/components/ui/intro-page';
import { GuildHall } from '@/features/social/guild-hall';
export default async function GuildPage({ searchParams }: { searchParams: Promise<{ join?: string }> }) {
  const { join } = await searchParams;
  return <IntroPage eyebrow="GUILD HALL" title="กิลด์" description="ตั้งกลุ่มกับเพื่อนหรือทั้งห้อง แล้วแข่งเก็บ XP รายสัปดาห์ เริ่มนับใหม่ทุกวันจันทร์">
    <GuildHall joinCode={typeof join === 'string' ? join.slice(0, 6) : ''} />
  </IntroPage>;
}
