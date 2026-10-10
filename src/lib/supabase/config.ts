// Only publishable keys belong in browser configuration.
export function supabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key || url.includes('YOUR_') || key.includes('YOUR_')) return null;
  if (key.startsWith('sb_secret_') || !key.startsWith('sb_publishable_')) return null;
  try { if (!['https:', 'http:'].includes(new URL(url).protocol)) return null; } catch { return null; }
  return { url, key };
}
