import { IntroPage } from '@/components/ui/intro-page';
import { ChatPanel } from '@/features/chat/chat-panel';
export default async function ChatPage({searchParams}:{searchParams:Promise<{path?:string}>}){const query=await searchParams;const aiReady=process.env.GEMINI_ENABLED==='true'&&!!process.env.GEMINI_API_KEY&&!!process.env.GEMINI_MODEL;return <IntroPage eyebrow="YOUR LEARNING COMPANION" title="ผู้ช่วยการเรียนรู้" description="ถามเรื่องเควสต์หรือเส้นทางที่สนใจ แล้วค่อย ๆ เรียนรู้ไปด้วยกัน"><ChatPanel aiReady={aiReady} pathId={query.path}/></IntroPage>;}
