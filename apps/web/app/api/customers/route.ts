import { NextRequest, NextResponse } from 'next/server';
import { getCustomers, createCustomer } from '@/actions/customers';
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
  if (!(await verifyAdminToken(request.headers.get('Authorization')))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
  }

  const search = request.nextUrl.searchParams.get('search') ?? undefined;
  const result = await getCustomers(search);

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
    const result = await createCustomer(body);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400, headers: corsHeaders });
    }

    return NextResponse.json({ data: { id: result.id } }, { status: 201, headers: corsHeaders });
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400, headers: corsHeaders });
  }
}
