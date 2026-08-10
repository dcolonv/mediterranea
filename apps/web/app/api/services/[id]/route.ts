import { NextRequest, NextResponse } from 'next/server';
import { updateService, deleteService } from '@/actions/services';
import { verifyAdminToken } from '@/lib/firebase/admin';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json(null, { headers: corsHeaders });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await verifyAdminToken(request.headers.get('Authorization')))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
  }

  const { id } = await params;
  try {
    const body = await request.json();
    const result = await updateService(id, body);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400, headers: corsHeaders });
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
  if (!(await verifyAdminToken(request.headers.get('Authorization')))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
  }

  const { id } = await params;
  const result = await deleteService(id);

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500, headers: corsHeaders });
  }

  return NextResponse.json({ success: true }, { headers: corsHeaders });
}
