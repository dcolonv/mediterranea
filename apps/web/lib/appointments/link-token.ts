import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Signed links that let a client manage one appointment straight from their
 * confirmation email.
 *
 * Most people book as guests — `upsertCustomerForAppointment` creates a
 * customer record but no login — so there is no session to authenticate them
 * with. A token signed with a server secret gives them access to exactly one
 * appointment and nothing else.
 *
 * The token is a credential, so treat it like one: verify it on every server
 * action (they are public POST endpoints), never log it, and keep it out of
 * URLs that analytics records.
 */

const SEP = '.';

/**
 * Cookie the entry handler swaps the token into. Scoped to /manage so the
 * credential is never sent with any other request.
 */
export const MANAGE_COOKIE = '__appt_link';

function secret(): string {
  const value = process.env.APPOINTMENT_LINK_SECRET;
  if (!value || value.length < 32) {
    throw new Error(
      'APPOINTMENT_LINK_SECRET is missing or too short (needs at least 32 characters).'
    );
  }
  return value;
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64url');
}

function sign(payload: string): string {
  return createHmac('sha256', secret()).update(payload).digest('base64url');
}

export interface AppointmentLink {
  appointmentId: string;
  /** Unix seconds. */
  expiresAt: number;
}

/**
 * Mint a link token. Every outbound email mints a fresh one, so a rescheduled
 * appointment's next email carries a token valid for its new time.
 */
export function createAppointmentToken({ appointmentId, expiresAt }: AppointmentLink): string {
  const payload = `${b64url(appointmentId)}${SEP}${expiresAt}`;
  return `${payload}${SEP}${sign(payload)}`;
}

/**
 * Verify a token. Returns the appointment id, or null for anything malformed,
 * tampered with or expired. Never throws on bad input — callers treat null as
 * "no access".
 */
export function readAppointmentToken(token: string | undefined | null): string | null {
  if (!token) return null;

  const parts = token.split(SEP);
  if (parts.length !== 3) return null;
  const [idPart, expPart, signature] = parts;

  const expected = sign(`${idPart}${SEP}${expPart}`);
  // Length-check first: timingSafeEqual throws on a length mismatch.
  if (signature.length !== expected.length) return null;
  if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;

  const expiresAt = Number(expPart);
  if (!Number.isInteger(expiresAt) || expiresAt * 1000 <= Date.now()) return null;

  const appointmentId = Buffer.from(idPart, 'base64url').toString('utf8');
  return appointmentId.length > 0 ? appointmentId : null;
}

/**
 * When a link for this appointment should stop working: shortly after the
 * appointment itself, since there is nothing left to manage afterwards.
 */
export function linkExpiryFor(date: string, time: string): number {
  // Appointment times are local to the studio (Europe/Madrid, UTC+1/+2). Using
  // the later offset and adding a few hours keeps the link alive through the
  // appointment without needing a timezone library here.
  const start = Date.parse(`${date}T${time.padStart(5, '0')}:00Z`);
  const fallback = Date.now() + 30 * 24 * 3600 * 1000;
  if (Number.isNaN(start)) return Math.floor(fallback / 1000);
  return Math.floor((start + 6 * 3600 * 1000) / 1000);
}

/**
 * The absolute URL a client follows from their email. It points at the entry
 * handler, which swaps the token for a cookie and redirects to a clean URL so
 * the credential never reaches analytics or browser history.
 */
export function appointmentManageUrl(token: string, baseUrl: string): string {
  return `${baseUrl.replace(/\/$/, '')}/manage/enter?t=${encodeURIComponent(token)}`;
}
