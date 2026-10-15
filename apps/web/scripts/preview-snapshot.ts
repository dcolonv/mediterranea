/**
 * Copy live data into the Firestore emulator for a local preview
 * (see scripts/local-preview.sh, which runs both steps).
 *
 *   export <file>  Read — only read — the catalogue, team, settings, clients,
 *                  passes and appointments from 30 days ago onwards from the
 *                  live database into <file>.
 *   import <file>  Write <file> into the Firestore emulator. Refuses to run
 *                  unless FIRESTORE_EMULATOR_HOST is set, so it can never write
 *                  to the live database.
 */
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { readFileSync, writeFileSync } from 'node:fs';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local', quiet: true } as never);

/** Whole collections to copy. Push tokens are left out so the preview never notifies a phone. */
const COLLECTIONS = ['services', 'staff', 'rooms', 'settings', 'admins', 'customers', 'passes'];
const APPOINTMENTS_FROM_DAYS_AGO = 30;

type Snapshot = Record<string, Record<string, unknown>>;

// Timestamps don't survive JSON; tag them on the way out and rebuild on the way in.
const toJson = (v: unknown): unknown =>
  v instanceof Timestamp
    ? { __timestamp: v.toMillis() }
    : Array.isArray(v)
      ? v.map(toJson)
      : v && typeof v === 'object'
        ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, toJson(x)]))
        : v;
const fromJson = (v: unknown): unknown =>
  Array.isArray(v)
    ? v.map(fromJson)
    : v && typeof v === 'object'
      ? '__timestamp' in v
        ? Timestamp.fromMillis((v as { __timestamp: number }).__timestamp)
        : Object.fromEntries(Object.entries(v).map(([k, x]) => [k, fromJson(x)]))
      : v;

async function exportLive(file: string) {
  if (process.env.FIRESTORE_EMULATOR_HOST) throw new Error('Export reads the live database; unset FIRESTORE_EMULATOR_HOST.');
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
  const db = getFirestore();
  const snapshot: Snapshot = {};
  for (const name of COLLECTIONS) {
    const snap = await db.collection(name).get();
    snapshot[name] = Object.fromEntries(snap.docs.map((d) => [d.id, toJson(d.data())]));
  }
  const from = new Date(Date.now() - APPOINTMENTS_FROM_DAYS_AGO * 86_400_000).toISOString().slice(0, 10);
  const appts = await db.collection('appointments').where('appointmentDate', '>=', from).get();
  snapshot.appointments = Object.fromEntries(appts.docs.map((d) => [d.id, toJson(d.data())]));

  writeFileSync(file, JSON.stringify(snapshot));
  const counts = Object.entries(snapshot).map(([k, v]) => `${k} ${Object.keys(v).length}`);
  console.log(`[preview] copied from live (read-only): ${counts.join(', ')}`);
}

async function importIntoEmulator(file: string) {
  if (!process.env.FIRESTORE_EMULATOR_HOST) {
    throw new Error('Refusing to import: FIRESTORE_EMULATOR_HOST is not set, so this would write to the live database.');
  }
  // No credentials: with the emulator host set, this only talks to the emulator.
  initializeApp({ projectId: process.env.FIREBASE_ADMIN_PROJECT_ID });
  const db = getFirestore();
  const snapshot = JSON.parse(readFileSync(file, 'utf8')) as Snapshot;
  for (const [name, docs] of Object.entries(snapshot)) {
    const entries = Object.entries(docs);
    for (let i = 0; i < entries.length; i += 400) {
      const batch = db.batch();
      for (const [id, doc] of entries.slice(i, i + 400)) {
        batch.set(db.collection(name).doc(id), fromJson(doc) as Record<string, unknown>);
      }
      await batch.commit();
    }
  }
  console.log(`[preview] loaded into the emulator at ${process.env.FIRESTORE_EMULATOR_HOST}`);
}

const [mode, file] = process.argv.slice(2);
const run = mode === 'export' ? exportLive : mode === 'import' ? importIntoEmulator : null;
if (!run || !file) {
  console.error('Usage: tsx scripts/preview-snapshot.ts export|import <file>');
  process.exit(1);
}
run(file)
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
