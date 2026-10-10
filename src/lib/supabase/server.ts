import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { supabaseConfig } from './config';
export async function serverClient() {
  const config = supabaseConfig();
  if (!config) return null;
  const jar = await cookies();
  return createServerClient(config.url, config.key, {
    cookies: {
      getAll: () => jar.getAll(),
      setAll: items => { try { items.forEach(({name,value,options}) => jar.set(name,value,options)); } catch { /* Server Components cannot set cookies; proxy refreshes them. */ } },
    },
  });
}
