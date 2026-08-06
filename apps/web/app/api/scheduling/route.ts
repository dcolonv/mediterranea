import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminToken } from '@/lib/firebase/admin';
import { getSchedulingRefs, getAvailability, bookWalkInResolved } from '@/actions/scheduling';

export const runtime = 'nodejs';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json(null, { headers: corsHeaders });
}

async function requireAdmin(request: NextRequest): Promise<boolean> {
  return Boolean(await verifyAdminToken(request.headers.get('Authorization')));
}

export async function GET(request: NextRequest) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
  }

  const { searchParams } = request.nextUrl;

  // Reference data: /api/scheduling?refs=true
  if (searchParams.get('refs') === 'true') {
    const refs = await getSchedulingRefs();
    if (!refs.success) {
      return NextResponse.json({ error: refs.error }, { status: 500, headers: corsHeaders });
    }
    return NextResponse.json(
      {
        services: refs.services.map((s) => ({
          id: s.id,
          name: s.name,
          durationMinutes: s.durationMinutes,
          price: s.price,
          category: s.category,
        })),
        staff: refs.staff.map((s) => ({ id: s.id, name: s.name, role: s.role })),
      },
      { headers: corsHeaders }
    );
  }

  // Availability: /api/scheduling?serviceId=&date=&staffId=
  const serviceId = searchParams.get('serviceId');
  const date = searchParams.get('date');
  if (!serviceId || !date) {
    return NextResponse.json(
      { error: 'Provide refs=true, or serviceId and date.' },
      { status: 400, headers: corsHeaders }
    );
  }
  const res = await getAvailability(serviceId, date, searchParams.get('staffId') ?? undefined);
  if ('error' in res) {
    return NextResponse.json({ error: res.error }, { status: 400, headers: corsHeaders });
  }
  return NextResponse.json(
    { durationMinutes: res.durationMinutes, times: res.slots.map((s) => s.time) },
    { headers: corsHeaders }
  );
}

export async function POST(request: NextRequest) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
  }

  try {
    const body = await request.json();
    const result = await bookWalkInResolved(body);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400, headers: corsHeaders });
    }
    return NextResponse.json({ data: { id: result.id } }, { status: 201, headers: corsHeaders });
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400, headers: corsHeaders });
  }
}
