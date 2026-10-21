/**
 * Google review requests: when a visit is marked completed, the client gets one
 * message (email + SMS) with the link to review the studio on Google — reviews
 * are what local search and Maps weigh most. Each client is asked once, after
 * their first completed visit since this was switched on.
 *
 * Off until switched on with the REVIEW_REQUESTS environment variable:
 *  - unset or "off": nothing is sent; the would-be recipient is only logged.
 *  - "test": each request goes to REVIEW_REQUESTS_TEST_TO instead of the
 *    client, saying who it was for, and nothing is recorded.
 *  - "on": sent to the client.
 */
import { Timestamp } from 'firebase-admin/firestore';
import { getAdminDb } from '@/lib/firebase/admin';
import type { Appointment } from '@mediterranea/shared/types';
import type { RenderedMessage } from './templates';

export type ReviewRequestMode = 'off' | 'test' | 'on';

export function reviewRequestMode(env: Record<string, string | undefined> = process.env): ReviewRequestMode {
  const value = env.REVIEW_REQUESTS?.trim().toLowerCase();
  return value === 'on' || value === 'test' ? value : 'off';
}

/** Where test-mode requests go instead of the client. */
export function reviewRequestTestRecipient(): string | undefined {
  return process.env.REVIEW_REQUESTS_TEST_TO?.trim() || undefined;
}

/** Whether this client was already asked, after an earlier visit. */
export async function clientAlreadyAsked(appt: Appointment): Promise<boolean> {
  const appointments = getAdminDb().collection('appointments');
  // The same client, however they booked: account, email or phone.
  const lookups: [string, string][] = [];
  if (appt.customerId) lookups.push(['customerId', appt.customerId]);
  if (appt.clientEmail) lookups.push(['clientEmail', appt.clientEmail]);
  if (appt.clientPhone) lookups.push(['clientPhone', appt.clientPhone]);
  const snaps = await Promise.all(
    lookups.map(([field, value]) => appointments.where(field, '==', value).select('reviewRequestedAt').get())
  );
  return snaps.some((snap) => snap.docs.some((d) => d.id !== appt.id && d.get('reviewRequestedAt')));
}

/**
 * Record the request on the appointment before sending, in a transaction, so
 * two status changes in quick succession can't both send. False if it was
 * already recorded.
 */
export async function claimReviewRequest(appointmentId: string): Promise<boolean> {
  const db = getAdminDb();
  const ref = db.collection('appointments').doc(appointmentId);
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists || snap.get('reviewRequestedAt')) return false;
    tx.update(ref, { reviewRequestedAt: Timestamp.now() });
    return true;
  });
}

/** The test-mode email: the client's message, headed by who it was for and the SMS. */
export function testCopy(appt: Appointment, msg: RenderedMessage): { subject: string; html: string; text: string } {
  const recipient = [appt.clientName, appt.clientEmail, appt.clientPhone].filter(Boolean).join(' · ');
  const note = `Review request test. When REVIEW_REQUESTS=on this goes to: ${recipient}.`;
  const sms = appt.clientPhone ? `SMS: ${msg.sms}` : 'No phone number, so no SMS.';
  return {
    subject: `[TEST] ${msg.subject}`,
    html: `<div style="font-family:sans-serif;font-size:13px;background:#fff8e6;border:1px solid #e8d49a;padding:12px;margin-bottom:24px">
  <p style="margin:0 0 6px">${note}</p><p style="margin:0">${sms}</p>
</div>${msg.html}`,
    text: `${note}\n${sms}\n\n${msg.text}`,
  };
}
