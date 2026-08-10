import { NextRequest, NextResponse } from 'next/server';
import { getActiveServices, getAllServices, createService } from '@/actions/services';
import { verifyAdminToken } from '@/lib/firebase/admin';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json(null, { headers: corsHeaders });
}

export async function GET(request: NextRequest) {
  // Admin variant: /api/services?all=true → includes inactive (requires admin).
  if (request.nextUrl.searchParams.get('all') === 'true') {
    if (!(await verifyAdminToken(request.headers.get('Authorization')))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
    }

    const result = await getAllServices();
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500, headers: corsHeaders });
    }
    return NextResponse.json({ data: result.data }, { headers: corsHeaders });
  }

  // Public: active services only.
  const result = await getActiveServices();
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500, headers: corsHeaders });
  }
  return NextResponse.json({ data: result.data }, { headers: corsHeaders });
}

export async function POST(request: NextRequest) {
  if (!(await verifyAdminToken(request.headers.get('Authorization')))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
  }

  try {
    const body = await request.json();
    const result = await createService(body);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400, headers: corsHeaders });
    }

    return NextResponse.json({ data: { id: result.id } }, { status: 201, headers: corsHeaders });
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400, headers: corsHeaders });
  }
}
