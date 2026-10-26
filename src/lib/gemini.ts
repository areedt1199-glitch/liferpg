// Server-only Gemini access shared by the learning assistant, the guild mentor and the quest reviewer.
// Disabled unless the owner sets GEMINI_ENABLED=true, GEMINI_API_KEY and GEMINI_MODEL (see .env.example).
// GEMINI_FALLBACK_MODEL (optional) answers when the main model is overloaded or slow.
const MODEL = /^[a-zA-Z0-9.-]+$/;
export function geminiReady() {
  const model = process.env.GEMINI_MODEL;
  return process.env.GEMINI_ENABLED === 'true' && !!process.env.GEMINI_API_KEY && !!model && MODEL.test(model);
}
/** The app shows answers as plain text, so every prompt asks for no markdown. */
const PLAIN = '\nตอบเป็นข้อความธรรมดา ไม่ใช้ markdown เช่น ** # หรือ ``` แบ่งย่อหน้าด้วยการขึ้นบรรทัดใหม่ได้';

export type GeminiImage = { mime: string; data: string };
type Ask = { system: string; prompt: string; maxTokens?: number; temperature?: number; image?: GeminiImage; schema?: object };

/** One text answer from Gemini (a JSON string when `schema` is given); throws when the service fails or returns nothing.
 *  maxTokens is generous because newer Gemini models spend part of it on internal thinking; length is set by the prompt. */
export async function askGemini({ system, prompt, maxTokens = 2048, temperature = .3, image, schema }: Ask) {
  if (!geminiReady()) throw new Error('GEMINI_DISABLED');
  const parts: object[] = [{ text: prompt }, ...(image ? [{ inline_data: { mime_type: image.mime, data: image.data } }] : [])];
  const generationConfig = { maxOutputTokens: maxTokens, temperature, ...(schema ? { responseMimeType: 'application/json', responseSchema: schema } : {}) };
  const call = (model: string, ms: number) => fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY! },
    body: JSON.stringify({ systemInstruction: { parts: [{ text: system + (schema ? '' : PLAIN) }] }, contents: [{ role: 'user', parts }], generationConfig }),
    signal: AbortSignal.timeout(ms),
  });
  const fallback = process.env.GEMINI_FALLBACK_MODEL, hasFallback = !!fallback && MODEL.test(fallback);
  // A busy (503/429) or slow main model hands over to the fallback; without one, retry once after a short pause.
  let response: Response | null = null;
  try { response = await call(process.env.GEMINI_MODEL!, hasFallback ? 12000 : 20000); } catch { if (!hasFallback) throw new Error('GEMINI_TIMEOUT'); }
  if (!response || response.status === 503 || response.status === 429) {
    if (hasFallback) response = await call(fallback!, 15000);
    else { await new Promise(r => setTimeout(r, 1500)); response = await call(process.env.GEMINI_MODEL!, 15000); }
  }
  if (!response.ok) throw new Error(`GEMINI_HTTP_${response.status}`);
  const result = await response.json();
  const answer = result.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? '').join('').trim();
  if (!answer) throw new Error('GEMINI_EMPTY');
  return answer as string;
}
