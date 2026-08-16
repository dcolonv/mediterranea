import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminToken, getAdminDb, syncAdminClaimForEmail } from '@/lib/firebase/admin';

export const runtime = 'nodejs';

/**
 * Backfill: stamp the `admin` role claim on every Auth user in the `admins`
 * allowlist. Idempotent. Admin-gated. Run once after enabling RBAC (and again
 * whenever you add an admin who has never signed in).
 */
export async function POST(request: NextRequest) {
  if (!(await verifyAdminToken(request.headers.get('Authorization')))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const snap = await getAdminDb().collection('admins').get();
    let synced = 0;
    let pending = 0;
    for (const doc of snap.docs) {
      const ok = await syncAdminClaimForEmail(doc.id);
      if (ok) synced++;
      else pending++; // no Auth account yet — will self-heal on first login
    }
    return NextResponse.json({ success: true, admins: snap.size, synced, pending });
  } catch (error) {
    console.error('sync-claims failed:', error);
    return NextResponse.json({ error: 'Failed to sync claims.' }, { status: 500 });
  }
}
