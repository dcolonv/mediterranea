import { NextRequest, NextResponse } from 'next/server';
import { createAppointment, getAppointments, getAvailableSlots } from '@/actions/appointments';
import { adminAuth } from '@/lib/firebase/admin';
import type { AppointmentStatus } from '@mediterranea/shared/types';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json(null, { headers: corsHeaders });
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  // Slots endpoint: /api/appointments?slots=true&date=...&duration=...
  if (searchParams.get('slots') === 'true') {
    const date = searchParams.get('date');
    const duration = searchParams.get('duration');

    if (!date || !duration) {
      return NextResponse.json(
        { error: 'Missing date or duration parameter' },
        { status: 400, headers: corsHeaders }
      );
    }

    const result = await getAvailableSlots(date, parseInt(duration, 10));
    return NextResponse.json(result, { headers: corsHeaders });
  }

  // Admin-only: list appointments
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
  }

  try {
    await adminAuth.verifyIdToken(authHeader.split('Bearer ')[1]);
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401, headers: corsHeaders });
  }

  const status = searchParams.get('status') as AppointmentStatus | null;
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

  const result = await getAppointments({
    ...(status && { status }),
    ...(startDate && { startDate }),
    ...(endDate && { endDate }),
  });

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500, headers: corsHeaders });
  }

  return NextResponse.json({ data: result.data }, { headers: corsHeaders });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await createAppointment(body);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400, headers: corsHeaders });
    }

    return NextResponse.json({ data: { id: result.id } }, { status: 201, headers: corsHeaders });
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400, headers: corsHeaders }
    );
  }
}
