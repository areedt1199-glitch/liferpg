// Server-only Supabase client with the project's secret key (service_role). Used only by API routes for writes players
// must not be able to make themselves, such as recording the teacher's review verdict. Never import from client code.
import { createClient } from '@supabase/supabase-js';
import { supabaseConfig } from './config';

export function adminClient() {
  const config = supabaseConfig(), secret = process.env.SUPABASE_SECRET_KEY;
  if (!config || !secret || !(secret.startsWith('sb_secret_') || secret.split('.').length === 3)) return null;
  return createClient(config.url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
}
