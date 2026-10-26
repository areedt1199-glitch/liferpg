import { createClient } from '@supabase/supabase-js';
import { supabaseConfig } from './config';
/** Cookie-free client for data anyone may read (public portfolios). Runs as the anon role. */
export function publicClient() {
  const config = supabaseConfig();
  if (!config) return null;
  return createClient(config.url, config.key, { auth: { persistSession: false, autoRefreshToken: false } });
}
