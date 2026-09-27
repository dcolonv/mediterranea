import { NextRequest, NextResponse } from 'next/server';
import { readAppointmentToken, MANAGE_COOKIE } from '@/lib/appointments/link-token';

/**
 * Entry point for the link in a confirmation or reminder email.
 *
 * The token is a credential, so it is exchanged here for a short-lived,
 * httpOnly cookie and the browser is redirected to a clean `/manage` URL. That
 * keeps it out of the address bar, browser history, the Referer header and —
 * importantly — the page URL that GA and Vercel Analytics record.
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('t');
  const appointmentId = readAppointmentToken(token);

  const url = new URL('/manage', request.url);
  if (!appointmentId) {
    url.searchParams.set('invalid', '1');
    return NextResponse.redirect(url, { headers: { 'Referrer-Policy': 'no-referrer' } });
  }

  const response = NextResponse.redirect(url, {
    headers: { 'Referrer-Policy': 'no-referrer' },
  });

  response.cookies.set(MANAGE_COOKIE, token!, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    // Scoped to this flow, so the credential is never sent with any other request.
    path: '/manage',
    maxAge: 2 * 60 * 60,
  });

  return response;
}
