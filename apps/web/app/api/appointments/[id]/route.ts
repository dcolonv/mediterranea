import { NextRequest, NextResponse } from 'next/server';
import { updateAppointmentStatus, deleteAppointment } from '@/actions/appointments';
import { adminAuth } from '@/lib/firebase/admin';
import type { AppointmentStatus } from '@mediterranea/shared/types';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

async function verifyAdmin(request: NextRequest): Promise<boolean> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return false;

  try {
    await adminAuth.verifyIdToken(authHeader.split('Bearer ')[1]);
    return true;
  } catch {
    return false;
  }
}

export async function OPTIONS() {
  return NextResponse.json(null, { headers: corsHeaders });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await verifyAdmin(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
  }

  const { id } = await params;

  try {
    const { status } = await request.json() as { status: AppointmentStatus };

    if (!status) {
      return NextResponse.json({ error: 'Missing status' }, { status: 400, headers: corsHeaders });
    }

    const result = await updateAppointmentStatus(id, status);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500, headers: corsHeaders });
    }

    return NextResponse.json({ success: true }, { headers: corsHeaders });
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400, headers: corsHeaders });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await verifyAdmin(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
  }

  const { id } = await params;
  const result = await deleteAppointment(id);

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500, headers: corsHeaders });
  }

  return NextResponse.json({ success: true }, { headers: corsHeaders });
}
