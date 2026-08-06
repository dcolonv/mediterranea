import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminToken } from '@/lib/firebase/admin';
import { registerPushToken } from '@/lib/notifications/push';

export const runtime = 'nodejs';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json(null, { headers: corsHeaders });
}

export async function POST(request: NextRequest) {
  const email = await verifyAdminToken(request.headers.get('Authorization'));
  if (!email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
  }

  try {
    const { token } = (await request.json()) as { token?: string };
    if (!token || !token.startsWith('ExponentPushToken')) {
      return NextResponse.json({ error: 'Invalid push token' }, { status: 400, headers: corsHeaders });
    }
    await registerPushToken(email, token);
    return NextResponse.json({ success: true }, { headers: corsHeaders });
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400, headers: corsHeaders });
  }
}
