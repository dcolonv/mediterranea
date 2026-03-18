import { NextResponse } from 'next/server';
import { getActiveServices } from '@/actions/services';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json(null, { headers: corsHeaders });
}

export async function GET() {
  const result = await getActiveServices();

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500, headers: corsHeaders });
  }

  return NextResponse.json({ data: result.data }, { headers: corsHeaders });
}
