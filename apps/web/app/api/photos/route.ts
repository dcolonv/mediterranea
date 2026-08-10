import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminToken } from '@/lib/firebase/admin';
import { listClientPhotos, uploadPhotoBytes, deleteClientPhoto } from '@/actions/photos';
import type { PhotoType } from '@mediterranea/shared/types';

export const runtime = 'nodejs';
export const maxDuration = 60;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
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
  const customerId = request.nextUrl.searchParams.get('customerId');
  if (!customerId) {
    return NextResponse.json({ error: 'Missing customerId' }, { status: 400, headers: corsHeaders });
  }
  const res = await listClientPhotos(customerId);
  if (!res.success) {
    return NextResponse.json({ error: res.error }, { status: 500, headers: corsHeaders });
  }
  return NextResponse.json({ photos: res.photos }, { headers: corsHeaders });
}

export async function POST(request: NextRequest) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
  }
  try {
    const body = (await request.json()) as {
      customerId?: string;
      type?: PhotoType;
      caption?: string;
      appointmentId?: string;
      base64?: string;
      contentType?: string;
    };
    if (!body.customerId || !body.base64 || !body.type) {
      return NextResponse.json(
        { error: 'customerId, type, and base64 are required.' },
        { status: 400, headers: corsHeaders }
      );
    }
    const bytes = Buffer.from(body.base64, 'base64');
    const res = await uploadPhotoBytes({
      customerId: body.customerId,
      type: body.type,
      caption: body.caption,
      appointmentId: body.appointmentId,
      bytes,
      contentType: body.contentType || 'image/jpeg',
    });
    if (!res.success) {
      return NextResponse.json({ error: res.error }, { status: 400, headers: corsHeaders });
    }
    return NextResponse.json({ data: { id: res.id } }, { status: 201, headers: corsHeaders });
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400, headers: corsHeaders });
  }
}

export async function DELETE(request: NextRequest) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
  }
  const id = request.nextUrl.searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400, headers: corsHeaders });
  }
  const res = await deleteClientPhoto(id);
  if (!res.success) {
    return NextResponse.json({ error: res.error }, { status: 500, headers: corsHeaders });
  }
  return NextResponse.json({ success: true }, { headers: corsHeaders });
}
