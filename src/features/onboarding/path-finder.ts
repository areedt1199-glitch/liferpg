import careers from '../careers/catalog.json';
import { knowledgePaths, PATH_LEVELS } from '../knowledge';

// A one-minute quiz that narrows 43 paths down to three, so a new player never faces the whole catalog at once.
export type Build = 'game' | 'web' | 'ai' | 'unsure';
export type Style = 'art' | 'code' | 'data' | 'systems';
export type Experience = 'new' | 'some' | 'pro';
export type Answers = { build: Build; style: Style; experience: Experience; minutes: number };

export const questions = [
  { key: 'build', title: 'อยากสร้างอะไรมากที่สุด?', options: [
    { value: 'game', label: 'เกม', hint: 'เกมมือถือ เกม PC หรือโลก VR' },
    { value: 'web', label: 'เว็บและแอป', hint: 'เว็บไซต์ แอปมือถือ ระบบหลังบ้าน' },
    { value: 'ai', label: 'ระบบที่ฉลาด', hint: 'AI แชตบอต วิเคราะห์ข้อมูล' },
    { value: 'unsure', label: 'ยังไม่แน่ใจ', hint: 'อยากลองดูหลาย ๆ แบบ' },
  ] },
  { key: 'style', title: 'ชอบงานแบบไหน?', options: [
    { value: 'art', label: 'ออกแบบให้สวยและสนุก', hint: 'วาด ออกแบบหน้าจอ ออกแบบด่าน' },
    { value: 'code', label: 'เขียนโค้ดให้มันทำงาน', hint: 'สร้างฟีเจอร์ แก้บั๊ก' },
    { value: 'data', label: 'ข้อมูลและตัวเลข', hint: 'หาแพตเทิร์น สอนโมเดล' },
    { value: 'systems', label: 'ระบบและความปลอดภัย', hint: 'เซิร์ฟเวอร์ เครือข่าย ฮาร์ดแวร์' },
  ] },
  { key: 'experience', title: 'เขียนโค้ดมาก่อนไหม?', options: [
    { value: 'new', label: 'ไม่เคยเลย', hint: 'เริ่มจากศูนย์' },
    { value: 'some', label: 'เคยนิดหน่อย', hint: 'ลองทำตามคลิปมาบ้าง' },
    { value: 'pro', label: 'เขียนเป็นแล้ว', hint: 'อยากต่อยอดสู่สายอาชีพ' },
  ] },
  { key: 'minutes', title: 'มีเวลาวันละเท่าไร?', options: [
    { value: '15', label: '15 นาที', hint: 'ช่วงพักหรือก่อนนอน' },
    { value: '30', label: '30 นาที', hint: 'วันละหนึ่งด่านสบาย ๆ' },
    { value: '60', label: '1 ชั่วโมงขึ้นไป', hint: 'จริงจัง อยากไปให้ไว' },
  ] },
] as const;

const trackOf: Record<Exclude<Build, 'unsure'>, string> = { game: 'game', web: 'dev', ai: 'ai' };
const styleOf: Record<string, Style> = {
  ui_ux_designer: 'art', game_artist_3d: 'art', game_artist_2d: 'art', technical_artist: 'art', level_designer: 'art', game_designer: 'art', game_audio_designer: 'art', '3d_modeling': 'art', pixel_art: 'art', game_design: 'art',
  software_developer: 'code', frontend_developer: 'code', fullstack_developer: 'code', mobile_developer: 'code', game_developer: 'code', xr_developer: 'code', programming: 'code', javascript: 'code', python: 'code', algorithms: 'code', git_github: 'code', unity: 'code', unreal_engine: 'code', godot: 'code', ai_engineer: 'code', prompt_engineering: 'code', blockchain_developer: 'code', qa_engineer: 'code',
  ml_engineer: 'data', data_scientist: 'data', data_engineer: 'data', computer_vision_engineer: 'data', ai_researcher: 'data', machine_learning: 'data', math_for_ai: 'data', sql_databases: 'data',
  backend_developer: 'systems', devops_engineer: 'systems', cybersecurity_specialist: 'systems', embedded_developer: 'systems', robotics_engineer: 'systems', linux_command_line: 'systems', cybersecurity_basics: 'systems',
};
/** Paths whose first levels assume no prior coding. */
const beginnerFriendly = new Set(['programming', 'python', 'javascript', 'pixel_art', 'game_design', 'prompt_engineering', 'godot', 'git_github', 'unity']);
const categoryOf = new Map(careers.map(c => [c.id, c.category]));

export type Recommendation = { pathId: string; title: string; englishTitle: string; track: string; intro: string; reasons: string[]; score: number };

export function recommend(a: Answers, paths = knowledgePaths()): Recommendation[] {
  return paths.map(p => {
    let score = 0; const reasons: string[] = [];
    if (a.build !== 'unsure' && p.track === trackOf[a.build]) { score += 3; reasons.push(a.build === 'game' ? 'ตรงกับความอยากสร้างเกม' : a.build === 'web' ? 'ได้สร้างเว็บและแอปจริง' : 'ได้ทำงานกับ AI'); }
    if (a.build === 'unsure') score += 1;
    if (styleOf[p.pathId] === a.style) { score += 3; reasons.push(a.style === 'art' ? 'ใช้ความคิดสร้างสรรค์และการออกแบบ' : a.style === 'code' ? 'เน้นลงมือเขียนโค้ด' : a.style === 'data' ? 'ได้เล่นกับข้อมูลและตัวเลข' : 'ได้ดูแลระบบให้มั่นคง'); }
    const skill = categoryOf.get(p.pathId) === 'skill';
    if (a.experience === 'new') { if (skill) score += 2; if (beginnerFriendly.has(p.pathId)) { score += 2; reasons.push('เริ่มได้แม้ไม่เคยเขียนโค้ด'); } }
    if (a.experience === 'some') score += skill ? 1 : 1.5;
    if (a.experience === 'pro' && !skill) { score += 2; reasons.push('ต่อยอดสู่สายอาชีพได้ตรง'); }
    return { pathId: p.pathId, title: p.title, englishTitle: p.englishTitle, track: p.track, intro: p.intro, reasons, score };
  }).sort((x, y) => y.score - x.score || x.title.localeCompare(y.title, 'th')).slice(0, 3);
}

/** Rough days to finish one 8-level path: each level is about 40 minutes of lesson, practice, review and boss. */
export function daysToFinish(minutesPerDay: number) { return Math.ceil(PATH_LEVELS * 40 / Math.max(15, minutesPerDay)); }

export const PENDING_GOAL_KEY = 'liferpg.pendingGoal';
