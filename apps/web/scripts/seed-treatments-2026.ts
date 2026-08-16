/**
 * Seed Firestore with Mediterránea's real facial menu (Aug 2026).
 *
 * Run with: npx tsx scripts/seed-treatments-2026.ts
 *
 * Requires Firebase Admin credentials in .env.local.
 *
 * Notes:
 * - All entries are facials (category: 'facial').
 * - "Focalizado" = 45-min focus facials (the client's "Express" line).
 *   "Completo" = 75-min full sessions. "Post Verano" is a seasonal special.
 * - Prices are 0 (to be defined); all are seeded active per request.
 * - Doc id = slug, so re-running is idempotent (upsert).
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

type Seed = {
  name: string;
  nameEs: string;
  slug: string;
  description: string;
  descriptionEs: string;
  durationMinutes: number;
};

// 45-min focus facials (client's "Express" → renamed "Focalizado")
const FOCALIZADO: Seed[] = [
  {
    name: 'Brightening Focus',
    nameEs: 'Iluminador Focalizado',
    slug: 'iluminador-focalizado',
    description:
      'A focused 45-minute facial that restores luminosity to dull skin, bringing back a fresh, radiant tone.',
    descriptionEs:
      'Un facial focalizado de 45 minutos que devuelve luminosidad a la piel apagada y recupera un tono fresco y radiante.',
    durationMinutes: 45,
  },
  {
    name: 'Purifying Focus',
    nameEs: 'Purificante Focalizado',
    slug: 'purificante-focalizado',
    description:
      'A focused 45-minute facial that deeply cleanses, decongests pores and rebalances oily, congested skin.',
    descriptionEs:
      'Un facial focalizado de 45 minutos que limpia en profundidad, descongestiona los poros y equilibra la piel grasa y congestionada.',
    durationMinutes: 45,
  },
  {
    name: 'Firming INDIBA Focus',
    nameEs: 'Reafirmante Indiba Focalizado',
    slug: 'reafirmante-indiba-focalizado',
    description:
      'A focused 45-minute INDIBA facial that firms and tones, stimulating collagen for firmer skin.',
    descriptionEs:
      'Un facial focalizado de 45 minutos con tecnología INDIBA que reafirma y tonifica, estimulando el colágeno para una piel más firme.',
    durationMinutes: 45,
  },
  {
    name: 'Hydration Focus',
    nameEs: 'Hidratación Focalizado',
    slug: 'hidratacion-focalizado',
    description:
      'A focused 45-minute facial that replenishes water and nutrients for soft, plump, comfortable skin.',
    descriptionEs:
      'Un facial focalizado de 45 minutos que repone agua y nutrientes para una piel suave, jugosa y confortable.',
    durationMinutes: 45,
  },
  {
    name: 'Even Tone Focus',
    nameEs: 'Tono Uniforme Focalizado',
    slug: 'tono-uniforme-focalizado',
    description:
      'A focused 45-minute facial that evens tone and fades spots and marks for more uniform, luminous skin.',
    descriptionEs:
      'Un facial focalizado de 45 minutos que unifica el tono y atenúa manchas y marcas para una piel más homogénea y luminosa.',
    durationMinutes: 45,
  },
  {
    name: 'Lines & Firmness Focus',
    nameEs: 'Líneas & Firmeza Focalizado',
    slug: 'lineas-firmeza-focalizado',
    description:
      'A focused 45-minute facial that targets expression lines and skin laxity for a firmer, smoother effect.',
    descriptionEs:
      'Un facial focalizado de 45 minutos que trabaja las líneas de expresión y la laxitud cutánea para un efecto más firme y liso.',
    durationMinutes: 45,
  },
];

// 75-min full facials ("Completo")
const COMPLETO: Seed[] = [
  {
    name: 'Brightening Facial',
    nameEs: 'Iluminador',
    slug: 'iluminador',
    description:
      'A complete facial that restores luminosity and vitality to dull skin, recovering a fresh, radiant tone.',
    descriptionEs:
      'Un facial completo que devuelve luminosidad y vitalidad a la piel apagada, recuperando un tono fresco y radiante.',
    durationMinutes: 75,
  },
  {
    name: 'Purifying Facial',
    nameEs: 'Purificante',
    slug: 'purificante',
    description:
      'A complete purifying facial that deeply cleanses, decongests pores and rebalances oily, congested skin.',
    descriptionEs:
      'Un facial purificante completo que limpia en profundidad, descongestiona los poros y equilibra la piel grasa y congestionada.',
    durationMinutes: 75,
  },
  {
    name: 'Firming INDIBA Facial',
    nameEs: 'Reafirmante Indiba',
    slug: 'reafirmante-indiba',
    description:
      'A complete INDIBA facial that firms and tones, stimulating collagen from within for firmer, revitalized skin.',
    descriptionEs:
      'Un facial completo con tecnología INDIBA que reafirma y tonifica, estimulando el colágeno desde el interior para una piel más firme y revitalizada.',
    durationMinutes: 75,
  },
  {
    name: 'Hydration Facial',
    nameEs: 'Hidratación',
    slug: 'hidratacion',
    description:
      'A complete intensive-hydration facial that replenishes water and nutrients for soft, plump, comfortable skin.',
    descriptionEs:
      'Un facial completo de hidratación intensa que repone agua y nutrientes para una piel suave, jugosa y confortable.',
    durationMinutes: 75,
  },
  {
    name: 'Even Tone Facial',
    nameEs: 'Tono Uniforme',
    slug: 'tono-uniforme',
    description:
      'A complete facial that evens tone and fades spots and marks for more uniform, luminous skin.',
    descriptionEs:
      'Un facial completo que unifica el tono y atenúa manchas y marcas para una piel más homogénea y luminosa.',
    durationMinutes: 75,
  },
  {
    name: 'Lines & Firmness Facial',
    nameEs: 'Líneas & Firmeza',
    slug: 'lineas-firmeza',
    description:
      'A complete facial that targets expression lines and skin laxity, redensifying skin for a firmer, smoother look.',
    descriptionEs:
      'Un facial completo que trabaja las líneas de expresión y la laxitud cutánea, redensificando la piel para un efecto más firme y liso.',
    durationMinutes: 75,
  },
];

// Seasonal special
const ESPECIAL: Seed[] = [
  {
    name: 'After-Summer Facial',
    nameEs: 'Post Verano',
    slug: 'post-verano',
    description:
      'A restorative after-summer facial that soothes sensitized skin, repairs and rebalances after sun exposure.',
    descriptionEs:
      'Un facial reparador tras el verano que calma la piel sensibilizada, repara y devuelve el equilibrio después de la exposición solar.',
    durationMinutes: 50,
  },
];

const ALL: Seed[] = [...FOCALIZADO, ...COMPLETO, ...ESPECIAL];

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

  ALL.forEach((s, i) => {
    const docRef = db.collection('services').doc(s.slug);
    batch.set(
      docRef,
      {
        name: s.name,
        nameEs: s.nameEs,
        slug: s.slug,
        description: s.description,
        descriptionEs: s.descriptionEs,
        category: 'facial',
        durationMinutes: s.durationMinutes,
        price: 0,
        roomType: '',
        isActive: true,
        displayOrder: i + 1,
        createdAt: Timestamp.now(),
      },
      { merge: true }
    );
  });

  await batch.commit();
  console.log(`Seeded ${ALL.length} services.`);
}

seed()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
