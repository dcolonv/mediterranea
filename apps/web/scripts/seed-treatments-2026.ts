/**
 * Seed Firestore with Mediterránea's public booking model (Aug 2026).
 *
 * Run with: npx tsx scripts/seed-treatments-2026.ts
 *
 * Requires Firebase Admin credentials in .env.local.
 *
 * Booking model (drives the two-level booking flow via `bookingGroup`):
 *   custom → Custom Facial (books directly)
 *   focus  → 5 focus facials (submenu)
 *   indiba → INDIBA Focus / INDIBA Full (submenu)
 *
 * Everything is a facial (category: 'facial'). Doc id = slug (idempotent upsert).
 * Also removes the earlier menu that this model replaces.
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

type Seed = {
  slug: string;
  name: string;
  nameEs: string;
  description: string;
  descriptionEs: string;
  bookingGroup: 'custom' | 'focus' | 'indiba';
  durationMinutes: number;
  price: number;
};

const SERVICES: Seed[] = [
  // ── Custom (books directly) ────────────────────────────────────────────────
  {
    slug: 'custom-facial',
    name: 'Custom Facial',
    nameEs: 'Facial Personalizado',
    description:
      'We analyze your skin in the studio and design a session around what it needs, from hydration and firming to even tone, fading marks and softening expression lines, for complete, tailored care.',
    descriptionEs:
      'Analizamos tu piel en el estudio y diseñamos una sesión según lo que necesita, desde hidratación y reafirmación hasta unificación del tono, atenuar marcas y suavizar las líneas de expresión, para un cuidado completo y a medida.',
    bookingGroup: 'custom',
    durationMinutes: 120,
    price: 120,
  },

  // ── Focus facials (submenu) — 45 min, €75 ─────────────────────────────────
  {
    slug: 'iluminador-focalizado',
    name: 'Brightening Focus',
    nameEs: 'Iluminador Focalizado',
    description:
      'A focused facial that restores luminosity to dull skin, bringing back a fresh, radiant tone.',
    descriptionEs:
      'Un facial focalizado que devuelve luminosidad a la piel apagada y recupera un tono fresco y radiante.',
    bookingGroup: 'focus',
    durationMinutes: 45,
    price: 75,
  },
  {
    slug: 'purificante-focalizado',
    name: 'Purifying Focus',
    nameEs: 'Purificante Focalizado',
    description:
      'A focused facial that deeply cleanses, decongests pores and rebalances oily, congested skin.',
    descriptionEs:
      'Un facial focalizado que limpia en profundidad, descongestiona los poros y equilibra la piel grasa y congestionada.',
    bookingGroup: 'focus',
    durationMinutes: 45,
    price: 75,
  },
  {
    slug: 'hidratacion-focalizado',
    name: 'Hydration Focus',
    nameEs: 'Hidratación Focalizado',
    description:
      'A focused facial that replenishes water and nutrients for soft, plump, comfortable skin.',
    descriptionEs:
      'Un facial focalizado que repone agua y nutrientes para una piel suave, jugosa y confortable.',
    bookingGroup: 'focus',
    durationMinutes: 45,
    price: 75,
  },
  {
    slug: 'tono-uniforme-focalizado',
    name: 'Even Tone Focus',
    nameEs: 'Tono Uniforme Focalizado',
    description:
      'A focused facial that evens tone and fades spots and marks for more uniform, luminous skin.',
    descriptionEs:
      'Un facial focalizado que unifica el tono y atenúa manchas y marcas para una piel más homogénea y luminosa.',
    bookingGroup: 'focus',
    durationMinutes: 45,
    price: 75,
  },
  {
    slug: 'lineas-firmeza-focalizado',
    name: 'Lines & Firmness Focus',
    nameEs: 'Líneas & Firmeza Focalizado',
    description:
      'A focused facial that targets expression lines and skin laxity for a firmer, smoother effect.',
    descriptionEs:
      'Un facial focalizado que trabaja las líneas de expresión y la laxitud cutánea para un efecto más firme y liso.',
    bookingGroup: 'focus',
    durationMinutes: 45,
    price: 75,
  },
  {
    slug: 'peeling-focalizado',
    name: 'Peeling Focus',
    nameEs: 'Peeling Focalizado',
    description:
      'A focused peeling that renews the skin’s surface, smoothing texture and reviving a fresh, luminous glow.',
    descriptionEs:
      'Un peeling focalizado que renueva la superficie de la piel, suaviza la textura y devuelve una luminosidad fresca.',
    bookingGroup: 'focus',
    durationMinutes: 45,
    price: 75,
  },
  {
    slug: 'focus-help',
    name: 'Help Me Choose',
    nameEs: 'Te Ayudamos a Elegir',
    description:
      'Not sure which facial you need? Book a focus session and we’ll assess your skin together and choose the right treatment for you on the day.',
    descriptionEs:
      '¿No sabes qué facial necesitas? Reserva una sesión focus y valoramos tu piel juntas para elegir el tratamiento más adecuado para ti en el momento.',
    bookingGroup: 'focus',
    durationMinutes: 45,
    price: 75,
  },

  // ── INDIBA (submenu) ──────────────────────────────────────────────────────
  {
    slug: 'indiba-full',
    name: 'INDIBA Full',
    nameEs: 'INDIBA Completo',
    description:
      'A complete INDIBA radiofrequency facial that firms and tones the skin from within, for a lasting, natural glow.',
    descriptionEs:
      'Un facial completo de radiofrecuencia INDIBA que reafirma y tonifica la piel desde el interior, para una luminosidad natural y duradera.',
    bookingGroup: 'indiba',
    durationMinutes: 75,
    price: 100,
  },
  {
    slug: 'indiba-focus',
    name: 'INDIBA Focus',
    nameEs: 'INDIBA Focalizado',
    description:
      'A focused INDIBA radiofrequency facial that boosts circulation and collagen for firmer, revitalized skin.',
    descriptionEs:
      'Un facial focalizado de radiofrecuencia INDIBA que activa la circulación y el colágeno para una piel más firme y revitalizada.',
    bookingGroup: 'indiba',
    durationMinutes: 45,
    price: 65,
  },
];

// First-appointment intro price by regular price tier (0 = none).
const FIRST_VISIT_BY_PRICE: Record<number, number> = { 120: 100, 100: 90, 75: 65, 65: 55 };

// Slugs from the earlier menu that this booking model replaces.
const REMOVE_SLUGS = [
  'iluminador',
  'purificante',
  'reafirmante-indiba',
  'hidratacion',
  'tono-uniforme',
  'lineas-firmeza',
  'post-verano',
  'reafirmante-indiba-focalizado',
];

async function seed() {
  if (getApps().length === 0) {
    const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n');
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
        clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
        privateKey,
      }),
    });
  }

  const db = getFirestore();
  const batch = db.batch();

  REMOVE_SLUGS.forEach((slug) => {
    batch.delete(db.collection('services').doc(slug));
  });

  SERVICES.forEach((s, i) => {
    batch.set(
      db.collection('services').doc(s.slug),
      {
        name: s.name,
        nameEs: s.nameEs,
        slug: s.slug,
        description: s.description,
        descriptionEs: s.descriptionEs,
        category: 'facial',
        bookingGroup: s.bookingGroup,
        durationMinutes: s.durationMinutes,
        price: s.price,
        firstVisitPrice: FIRST_VISIT_BY_PRICE[s.price] ?? 0,
        roomType: '',
        isActive: true,
        displayOrder: i + 1,
        createdAt: Timestamp.now(),
      },
      { merge: true }
    );
  });

  await batch.commit();
  console.log(`Seeded ${SERVICES.length} services, removed ${REMOVE_SLUGS.length} old ones.`);
}

seed()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
