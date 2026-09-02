import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

/**
 * Normalize the service-account private key across hosting environments.
 * Handles the ways a PEM commonly gets mangled in env vars: wrapping quotes,
 * literal `\n` escapes instead of real newlines, CRLF, and base64-encoded keys.
 * A bad key surfaces as `error:1E08010C:DECODER routines::unsupported`.
 */
function normalizePrivateKey(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  let key = raw.trim();

  // Strip a single layer of wrapping quotes (Vercel/CI often keep them).
  if (
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'"))
  ) {
    key = key.slice(1, -1);
  }

  // Turn literal \n (and escaped \\n) into real newlines; normalize CRLF.
  key = key.replace(/\\r\\n/g, '\n').replace(/\\n/g, '\n').replace(/\r\n/g, '\n');

  // Support a base64-encoded key (set FIREBASE_ADMIN_PRIVATE_KEY to the base64 blob).
  if (!key.includes('-----BEGIN')) {
    try {
      const decoded = Buffer.from(key, 'base64').toString('utf8');
      if (decoded.includes('-----BEGIN')) key = decoded.replace(/\r\n/g, '\n');
    } catch {
      /* not base64 — fall through and let the SDK report it */
    }
  }

  return key;
}

function getAdminApp(): App {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  const privateKey = normalizePrivateKey(process.env.FIREBASE_ADMIN_PRIVATE_KEY);

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

/** Base roles for RBAC. The `role` custom claim carries this on the auth token. */
export type UserRole = 'admin' | 'staff' | 'customer';

/** Stamp a role custom claim on a user (baked into their next-refreshed token). */
export async function setUserRole(uid: string, role: UserRole): Promise<void> {
  await getAdminAuth().setCustomUserClaims(uid, { role });
}

/**
 * Sync the `admin` role claim onto the Auth user for an email in the `admins`
 * allowlist. No-op (returns false) when no Auth account exists for that email yet
 * — the claim is then set self-healingly on their first admin request.
 */
export async function syncAdminClaimForEmail(email: string): Promise<boolean> {
  try {
    const user = await getAdminAuth().getUserByEmail(email);
    if (user.customClaims?.role !== 'admin') {
      await setUserRole(user.uid, 'admin');
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Verify a request's `Authorization: Bearer <idToken>` header and confirm the
 * caller is an admin. Fast path: the `admin` role custom claim on the token.
 * Fallback: the `admins/{email}` allowlist (source of truth) — and when the doc
 * exists but the claim is missing, the claim is set opportunistically so future
 * requests take the fast path. Returns the admin's email, or null.
 */
export async function verifyAdminToken(
  authHeader: string | null
): Promise<string | null> {
  if (!authHeader?.startsWith('Bearer ')) return null;

  try {
    const decoded = await getAdminAuth().verifyIdToken(authHeader.split('Bearer ')[1]);
    const email = decoded.email;
    if (!email) return null;

    // Fast path: role claim already on the token.
    if (decoded.role === 'admin') return email;

    // Fallback: allowlist doc (authoritative).
    const adminDoc = await getAdminDb().collection('admins').doc(email).get();
    if (!adminDoc.exists) return null;

    // Self-heal: stamp the claim so subsequent tokens skip the read.
    setUserRole(decoded.uid, 'admin').catch(() => {});
    return email;
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
