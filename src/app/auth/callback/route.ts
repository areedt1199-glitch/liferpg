import { NextResponse, type NextRequest } from 'next/server';
import { requestOrigin } from '@/lib/request-origin';
import { serverClient } from '@/lib/supabase/server';
export async function GET(request: NextRequest) {
  const client=await serverClient(); const code=request.nextUrl.searchParams.get('code');
  if (client && code) {
    try {
      const {error}=await client.auth.exchangeCodeForSession(code);
      if (!error) {
        // A password-reset email lands here too; only that one fixed destination is honoured.
        const next=request.nextUrl.searchParams.get('next')==='reset'?'/login/reset':'/profile';
        const response=NextResponse.redirect(new URL(next,requestOrigin(request)));
        response.cookies.set('liferpg-mode','account',{httpOnly:true,sameSite:'lax',path:'/'});
        response.headers.set('Cache-Control','private, no-store'); return response;
      }
    } catch { /* Return a user-facing failure without exposing tokens. */ }
  }
  return NextResponse.redirect(new URL('/profile?auth=error',requestOrigin(request)));
}
