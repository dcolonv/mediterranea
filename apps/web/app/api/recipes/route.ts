import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminToken } from '@/lib/firebase/admin';
import { getRecipe } from '@/actions/recipes';

export const runtime = 'nodejs';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json(null, { headers: corsHeaders });
}

export async function GET(request: NextRequest) {
  if (!(await verifyAdminToken(request.headers.get('Authorization')))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
  }
  const serviceId = request.nextUrl.searchParams.get('serviceId');
  if (!serviceId) {
    return NextResponse.json({ error: 'Missing serviceId' }, { status: 400, headers: corsHeaders });
  }
  const recipe = await getRecipe(serviceId);
  return NextResponse.json({ recipe }, { headers: corsHeaders });
}
