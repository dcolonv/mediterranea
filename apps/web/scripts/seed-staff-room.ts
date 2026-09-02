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
    monday: { open: '10:30', close: '18:30' },
    tuesday: { open: '10:30', close: '18:30' },
    wednesday: { open: '10:30', close: '18:30' },
    thursday: { open: '10:30', close: '18:30' },
    friday: { open: '10:30', close: '18:30' },
    saturday: null,
    sunday: null,
  };

  // Never clobber availability edited in the backoffice: working hours and time
  // off are only written when creating the practitioner. On re-runs we just
  // refresh the service qualifications (the reason to run this again).
  const staffRef = db.collection('staff').doc('mariana');
  const existing = await staffRef.get();

  if (existing.exists) {
    await staffRef.update({ serviceIds, updatedAt: now });
    console.log(`Practitioner exists — refreshed ${serviceIds.length} qualifications (hours/time off untouched).`);
  } else {
    await staffRef.set({
      name: 'Mariana',
      role: 'Esteticista',
      active: true,
      serviceIds,
      workingHours: wh,
      timeOff: [],
      createdAt: now,
      updatedAt: now,
    });
    console.log(`Created practitioner qualified for ${serviceIds.length} services.`);
  }

  const roomRef = db.collection('rooms').doc('cabina-1');
  if (!(await roomRef.get()).exists) {
    await roomRef.set({ name: 'Cabina 1', type: 'facial', isActive: true, createdAt: now });
    console.log('Created room "Cabina 1".');
  }
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
