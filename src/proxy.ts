import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { supabaseConfig } from '@/lib/supabase/config';
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  response.headers.set('Cache-Control', 'private, no-store');
  const config = supabaseConfig();
  if (!config) return response;
  const client = createServerClient(config.url, config.key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (items, headers) => {
        items.forEach(({ name, value }) => request.cookies.set(name,value));
        response = NextResponse.next({ request });
        items.forEach(({ name, value, options }) => response.cookies.set(name,value,options));
        Object.entries(headers).forEach(([name,value]) => response.headers.set(name,value));
        response.headers.set('Cache-Control','private, no-store');
      },
    },
  });
  // Verify the token and refresh cookies, never authorize with getSession alone.
  try { await client.auth.getClaims(); } catch { /* Mutations independently verify with getUser and fail closed. */ }
  return response;
}
export const config = { matcher: ['/((?!_next/static|_next/image|icon.svg|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|webp)$).*)'] };
