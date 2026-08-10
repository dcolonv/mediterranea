import { NextRequest, NextResponse } from 'next/server';
import {
  updateAppointmentStatus,
  deleteAppointment,
  saveAppointmentNotes,
} from '@/actions/appointments';
import { verifyAdminToken } from '@/lib/firebase/admin';
import type { AppointmentStatus } from '@mediterranea/shared/types';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

async function verifyAdmin(request: NextRequest): Promise<boolean> {
  return Boolean(await verifyAdminToken(request.headers.get('Authorization')));
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
    const body = (await request.json()) as { status?: AppointmentStatus; notes?: string };

    if (body.status === undefined && body.notes === undefined) {
      return NextResponse.json(
        { error: 'Provide a status and/or notes.' },
        { status: 400, headers: corsHeaders }
      );
    }

    if (body.status !== undefined) {
      const result = await updateAppointmentStatus(id, body.status);
      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 500, headers: corsHeaders });
      }
    }

    if (body.notes !== undefined) {
      const result = await saveAppointmentNotes(id, body.notes);
      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 500, headers: corsHeaders });
      }
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
