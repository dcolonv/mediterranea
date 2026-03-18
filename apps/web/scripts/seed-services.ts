/**
 * Script to seed Firestore with initial services
 *
 * Run with: npx tsx scripts/seed-services.ts
 *
 * Note: This requires Firebase Admin credentials to be set in .env.local
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const SERVICES_SEED = [
  {
    name: 'Deep Cleansing Facial',
    slug: 'deep-cleansing',
    description: 'A thorough facial treatment that deeply cleanses pores, removes impurities, and leaves your skin refreshed and radiant.',
    category: 'facial',
    durationMinutes: 60,
    price: 85,
    displayOrder: 1,
    isActive: true,
  },
  {
    name: 'Hydration Therapy',
    slug: 'hydration-therapy',
    description: "Intensive moisture treatment using premium serums and masks to restore your skin's natural hydration balance.",
    category: 'facial',
    durationMinutes: 75,
    price: 110,
    displayOrder: 2,
    isActive: true,
  },
  {
    name: 'Anti-Aging Treatment',
    slug: 'anti-aging',
    description: 'Advanced treatment targeting fine lines and wrinkles, promoting collagen production for youthful, firm skin.',
    category: 'facial',
    durationMinutes: 90,
    price: 150,
    displayOrder: 3,
    isActive: true,
  },
  {
    name: 'Chemical Peel',
    slug: 'chemical-peel',
    description: 'Professional-grade exfoliation treatment that reveals smoother, brighter skin by removing dead skin cells.',
    category: 'treatment',
    durationMinutes: 45,
    price: 120,
    displayOrder: 4,
    isActive: true,
  },
  {
    name: 'Botox Treatment',
    slug: 'botox',
    description: 'Precision botulinum toxin injections to reduce dynamic wrinkles and achieve a naturally refreshed appearance.',
    category: 'treatment',
    durationMinutes: 30,
    price: 250,
    displayOrder: 5,
    isActive: true,
  },
  {
    name: 'Hyaluronic Acid Filler',
    slug: 'hyaluronic-filler',
    description: 'Dermal filler treatment to restore volume, enhance facial contours, and smooth deep wrinkles.',
    category: 'treatment',
    durationMinutes: 45,
    price: 350,
    displayOrder: 6,
    isActive: true,
  },
];

async function seedServices() {
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

  for (const service of SERVICES_SEED) {
    const docRef = db.collection('services').doc(service.slug);
    batch.set(docRef, {
      ...service,
      createdAt: Timestamp.now(),
    });
  }

  await batch.commit();
  console.log('Services seeded successfully!');
}

seedServices().catch(console.error);
