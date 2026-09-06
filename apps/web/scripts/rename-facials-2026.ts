/**
 * Apply the 2026 facial renaming to the live services.
 *
 * Run with: npx tsx scripts/rename-facials-2026.ts
 *
 * The marketing pages take these names from dictionaries.ts, but the booking
 * flow, treatment detail pages and confirmation emails read them from the
 * Firestore document — so the rename has to land in both places.
 *
 *   Custom Facial            → 1.5 Hour Facial
 *   <treatment> Focus        → <treatment>   (the group is now the
 *                                             45 Minutes Facial)
 *
 * INDIBA and the seasonal facials keep their names. Only the fields listed
 * below are touched — prices, durations and availability are left alone, and
 * re-running is a no-op once the values already match.
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

type Rename = {
  slug: string;
  name: string;
  nameEs: string;
  description?: string;
  descriptionEs?: string;
};

const RENAMES: Rename[] = [
  { slug: 'custom-facial', name: '1.5 Hour Facial', nameEs: 'Facial de 1,5 Horas' },
  { slug: 'iluminador-focalizado', name: 'Brightening', nameEs: 'Iluminador' },
  { slug: 'purificante-focalizado', name: 'Purifying', nameEs: 'Purificante' },
  { slug: 'hidratacion-focalizado', name: 'Hydration', nameEs: 'Hidratación' },
  { slug: 'tono-uniforme-focalizado', name: 'Even Tone', nameEs: 'Tono Uniforme' },
  { slug: 'lineas-firmeza-focalizado', name: 'Lines & Firmness', nameEs: 'Líneas & Firmeza' },
  { slug: 'peeling-focalizado', name: 'Peeling', nameEs: 'Peeling' },
  {
    // Name is unchanged; the copy referred to "a focus session".
    slug: 'focus-help',
    name: 'Help Me Choose',
    nameEs: 'Te Ayudamos a Elegir',
    description:
      'Not sure which facial you need? Book a 45 minute session and we’ll assess your skin together and choose the right treatment for you on the day.',
    descriptionEs:
      '¿No sabes qué facial necesitas? Reserva una sesión de 45 minutos y valoramos tu piel juntas para elegir el tratamiento más adecuado para ti en el momento.',
  },
];

async function rename() {
  if (getApps().length === 0) {
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
        clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
  }

  const db = getFirestore();
  const missing: string[] = [];
  let changed = 0;

  for (const r of RENAMES) {
    const ref = db.collection('services').doc(r.slug);
    const snap = await ref.get();
    if (!snap.exists) {
      missing.push(r.slug);
      continue;
    }

    const { slug, ...fields } = r;
    const before = snap.data() as Record<string, unknown>;
    const diff = Object.entries(fields).filter(([k, v]) => before[k] !== v);
    if (diff.length === 0) continue;

    await ref.update(Object.fromEntries(diff));
    diff.forEach(([k, v]) => console.log(`${slug}.${k}: ${before[k]} → ${v}`));
    changed += 1;
  }

  console.log(`\n${changed} service(s) updated.`);
  if (missing.length) console.warn(`No document for: ${missing.join(', ')}`);
}

rename()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
