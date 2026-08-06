import { NextRequest, NextResponse } from 'next/server';
import {
  getCustomer,
  getCustomerAppointments,
  updateCustomer,
  deleteCustomer,
} from '@/actions/customers';
import { verifyAdminToken } from '@/lib/firebase/admin';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json(null, { headers: corsHeaders });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await verifyAdminToken(request.headers.get('Authorization')))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
  }

  const { id } = await params;
  const result = await getCustomer(id);

  if (!result.success) {
    const status = result.error === 'Customer not found.' ? 404 : 500;
    return NextResponse.json({ error: result.error }, { status, headers: corsHeaders });
  }

  // Optionally include appointment history: /api/customers/[id]?appointments=true
  if (request.nextUrl.searchParams.get('appointments') === 'true') {
    const history = await getCustomerAppointments(id);
    return NextResponse.json(
      { data: result.data, appointments: history.success ? history.data : [] },
      { headers: corsHeaders }
    );
  }

  return NextResponse.json({ data: result.data }, { headers: corsHeaders });
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
    const result = await updateCustomer(id, body);

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
  const result = await deleteCustomer(id);

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500, headers: corsHeaders });
  }

  return NextResponse.json({ success: true }, { headers: corsHeaders });
}
