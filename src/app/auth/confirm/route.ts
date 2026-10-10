import { NextResponse, type NextRequest } from 'next/server';
import { requestOrigin } from '@/lib/request-origin';
import { serverClient } from '@/lib/supabase/server';
export async function GET(request: NextRequest) {
  const client=await serverClient(); const token_hash=request.nextUrl.searchParams.get('token_hash');
  const type=request.nextUrl.searchParams.get('type');
  if (client && token_hash && (type==='email' || type==='signup')) {
    try {
      const {error}=await client.auth.verifyOtp({token_hash,type});
      if (!error) {
        const response=NextResponse.redirect(new URL('/profile',requestOrigin(request)));
        response.cookies.set('liferpg-mode','account',{httpOnly:true,sameSite:'lax',path:'/'});
        response.headers.set('Cache-Control','private, no-store'); return response;
      }
    } catch { /* Failed verification never becomes a signed-in view. */ }
  }
  return NextResponse.redirect(new URL('/profile?auth=error',requestOrigin(request)));
}
