import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createCustomerSessionCookie, CUSTOMER_SESSION_DAYS } from '@/lib/firebase/admin';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const { idToken } = await request.json();
    if (!idToken) {
      return NextResponse.json({ error: 'No token provided' }, { status: 400 });
    }

    const sessionCookie = await createCustomerSessionCookie(idToken);
    const cookieStore = await cookies();
    cookieStore.set('__customer', sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: CUSTOMER_SESSION_DAYS * 24 * 60 * 60,
      path: '/',
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Customer session error:', error);
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const cookieStore = await cookies();
    cookieStore.delete('__customer');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Customer session delete error:', error);
    return NextResponse.json({ error: 'Failed to delete session' }, { status: 500 });
  }
}
