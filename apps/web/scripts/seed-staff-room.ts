/**
 * Seed a default practitioner + room so the booking engine has a bookable
 * resource. Idempotent (fixed doc ids). Edit freely in Backoffice → Staff/Rooms.
 *
 * Run: npx tsx scripts/seed-staff-room.ts
 */
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function main() {
  if (getApps().length === 0) {
    const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n');
    initializeApp({ credential: cert({ projectId: process.env.FIREBASE_ADMIN_PROJECT_ID, clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL, privateKey }) });
  }
  const db = getFirestore();
  const now = Timestamp.now();

  const serviceIds = (await db.collection('services').get()).docs.map((d) => d.id);

  const wh = {
    monday: { open: '10:00', close: '18:00' },
    tuesday: { open: '10:00', close: '18:00' },
    wednesday: { open: '10:00', close: '18:00' },
    thursday: { open: '10:00', close: '18:00' },
    friday: { open: '10:00', close: '18:00' },
    saturday: null,
    sunday: null,
  };

  await db.collection('staff').doc('mariana').set(
    { name: 'Mariana', role: 'Esteticista', active: true, serviceIds, workingHours: wh, timeOff: [], createdAt: now, updatedAt: now },
    { merge: true }
  );

  await db.collection('rooms').doc('cabina-1').set(
    { name: 'Cabina 1', type: 'facial', isActive: true, createdAt: now },
    { merge: true }
  );

  console.log(`Seeded practitioner (qualified for ${serviceIds.length} services) + 1 room.`);
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
