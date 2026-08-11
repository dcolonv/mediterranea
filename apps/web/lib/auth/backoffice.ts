/**
 * Server-only helper to resolve the signed-in backoffice admin's email from the
 * `__session` cookie (which holds their Firebase ID token). Best-effort: the ID
 * token expires after ~1h while the cookie lives longer, so this can return null
 * even for a valid session — callers use it for attribution/rate-limit keys, not
 * as the authorization gate (that's the middleware + admin actions).
 */
import { cookies } from 'next/headers';
import { getAdminAuth } from '@/lib/firebase/admin';

export async function getBackofficeAdminEmail(): Promise<string | null> {
  const token = (await cookies()).get('__session')?.value;
  if (!token) return null;
  try {
    const decoded = await getAdminAuth().verifyIdToken(token);
    return decoded.email?.toLowerCase() ?? null;
  } catch {
    return null;
  }
}
