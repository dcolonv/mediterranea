import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminToken } from '@/lib/firebase/admin';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json(null, { headers: corsHeaders });
}

/** Returns whether the bearer token belongs to an admin. Used by the mobile app's gate. */
export async function GET(request: NextRequest) {
  const email = await verifyAdminToken(request.headers.get('Authorization'));
  return NextResponse.json(
    { isAdmin: Boolean(email), email: email ?? null },
    { headers: corsHeaders }
  );
}
