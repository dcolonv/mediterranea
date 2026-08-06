import { NextRequest, NextResponse } from 'next/server';
import { Timestamp } from 'firebase-admin/firestore';
import { getAdminDb, verifyAdminToken } from '@/lib/firebase/admin';
import { BUSINESS_HOURS } from '@mediterranea/shared/constants';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json(null, { headers: corsHeaders });
}

/**
 * Idempotent: seed starter rooms and a practitioner so the booking agent has
 * data to work with. Safe to run more than once — it skips names that exist.
 */
export async function POST(request: NextRequest) {
  if (!(await verifyAdminToken(request.headers.get('Authorization')))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
  }

  const db = getAdminDb();
  const now = Timestamp.now();
  const created: { rooms: string[]; staff: string[] } = { rooms: [], staff: [] };

  // Rooms
  const roomSeeds = [
    { name: 'Treatment Room 1', type: 'facial' },
    { name: 'Treatment Room 2', type: 'treatment' },
  ];
  for (const seed of roomSeeds) {
    const existing = await db.collection('rooms').where('name', '==', seed.name).limit(1).get();
    if (!existing.empty) continue;
    await db.collection('rooms').add({ ...seed, isActive: true, createdAt: now });
    created.rooms.push(seed.name);
  }

  // Staff — Dr. Mariana, qualified for every current service.
  const staffName = 'Dr. Mariana';
  const staffExists = await db.collection('staff').where('name', '==', staffName).limit(1).get();
  if (staffExists.empty) {
    const servicesSnap = await db.collection('services').get();
    const serviceIds = servicesSnap.docs.map((d) => d.id);
    await db.collection('staff').add({
      name: staffName,
      role: 'Lead Aesthetician',
      active: true,
      serviceIds,
      workingHours: BUSINESS_HOURS,
      timeOff: [],
      createdAt: now,
      updatedAt: now,
    });
    created.staff.push(staffName);
  }

  return NextResponse.json(
    { seeded: created, note: 'Existing rooms/staff by name were left untouched.' },
    { headers: corsHeaders }
  );
}
