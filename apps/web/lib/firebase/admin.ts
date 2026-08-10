import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

function getAdminApp(): App {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n');

  return initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey,
    }),
  });
}

export function getAdminAuth() {
  return getAuth(getAdminApp());
}

export function getAdminDb() {
  return getFirestore(getAdminApp());
}

/**
 * Verify a request's `Authorization: Bearer <idToken>` header and confirm the
 * caller is an admin (present in the `admins/{email}` collection).
 * Returns the admin's email on success, or null if unauthenticated / not an admin.
 */
export async function verifyAdminToken(
  authHeader: string | null
): Promise<string | null> {
  if (!authHeader?.startsWith('Bearer ')) return null;

  try {
    const decoded = await getAdminAuth().verifyIdToken(authHeader.split('Bearer ')[1]);
    const email = decoded.email;
    if (!email) return null;

    const adminDoc = await getAdminDb().collection('admins').doc(email).get();
    return adminDoc.exists ? email : null;
  } catch {
    return null;
  }
}

/** Customer session cookie lifetime (kept in sync with the cookie maxAge). */
export const CUSTOMER_SESSION_DAYS = 5;

/**
 * Mint a long-lived Firebase session cookie from a freshly-minted idToken.
 * Used for the customer account area (separate from the admin `__session` cookie).
 */
export async function createCustomerSessionCookie(idToken: string): Promise<string> {
  const expiresIn = CUSTOMER_SESSION_DAYS * 24 * 60 * 60 * 1000;
  return getAdminAuth().createSessionCookie(idToken, { expiresIn });
}

/** Verify a customer session cookie; returns `{ uid, email }` or null. */
export async function verifyCustomerSession(
  cookie: string | undefined
): Promise<{ uid: string; email: string } | null> {
  if (!cookie) return null;
  try {
    const decoded = await getAdminAuth().verifySessionCookie(cookie, true);
    if (!decoded.email) return null;
    return { uid: decoded.uid, email: decoded.email.toLowerCase() };
  } catch {
    return null;
  }
}
