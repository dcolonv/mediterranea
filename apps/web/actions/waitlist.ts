'use server';

import { Timestamp } from 'firebase-admin/firestore';
import { getAdminDb } from '@/lib/firebase/admin';
import * as data from '@/lib/agent/data';
import { waitlistSchema, type WaitlistFormData } from '@mediterranea/shared/validations';
import type { WaitlistEntry, WaitlistStatus, Appointment } from '@mediterranea/shared/types';

const COLLECTION = 'waitlist';

export async function addToWaitlist(input: WaitlistFormData) {
  const parsed = waitlistSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: 'Please check the waitlist fields.' };
  }
  try {
    const service = await data.getService(parsed.data.serviceId);
    if (!service) return { success: false as const, error: 'Service not found.' };

    const now = Timestamp.now();
    await getAdminDb().collection(COLLECTION).add({
      serviceId: service.id,
      serviceName: service.name,
      clientName: parsed.data.clientName.trim(),
      clientEmail: parsed.data.clientEmail.trim(),
      clientPhone: parsed.data.clientPhone.trim(),
      preferredDate: parsed.data.preferredDate ?? '',
      staffId: parsed.data.staffId ?? '',
      notes: parsed.data.notes ?? '',
      status: 'waiting' as WaitlistStatus,
      createdAt: now,
      updatedAt: now,
    });
    return { success: true as const };
  } catch (error) {
    console.error('Error adding to waitlist:', error);
    return { success: false as const, error: 'Failed to add to the waitlist.' };
  }
}

export async function getWaitlist() {
  try {
    const snap = await getAdminDb().collection(COLLECTION).get();
    const entries = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }) as WaitlistEntry)
      .sort((a, b) => (a.createdAt?.toMillis?.() ?? 0) - (b.createdAt?.toMillis?.() ?? 0));
    return { success: true as const, data: entries };
  } catch (error) {
    console.error('Error loading waitlist:', error);
    return { success: false as const, error: 'Failed to load the waitlist.' };
  }
}

export async function updateWaitlistStatus(id: string, status: WaitlistStatus) {
  try {
    await getAdminDb().collection(COLLECTION).doc(id).update({ status, updatedAt: Timestamp.now() });
    return { success: true as const };
  } catch (error) {
    console.error('Error updating waitlist entry:', error);
    return { success: false as const, error: 'Failed to update the entry.' };
  }
}

export async function deleteWaitlistEntry(id: string) {
  try {
    await getAdminDb().collection(COLLECTION).doc(id).delete();
    return { success: true as const };
  } catch (error) {
    console.error('Error deleting waitlist entry:', error);
    return { success: false as const, error: 'Failed to delete the entry.' };
  }
}

/**
 * When an appointment is cancelled, offer the freed slot to matching waitlist
 * entries: same service, still waiting, and either no date preference or the same
 * date. Best-effort — notifies each matched client and marks them 'offered'.
 * Returns the number offered.
 */
export async function offerFreedSlot(appt: Appointment): Promise<number> {
  try {
    const db = getAdminDb();
    const snap = await db
      .collection(COLLECTION)
      .where('serviceId', '==', appt.serviceId)
      .where('status', '==', 'waiting')
      .get();

    const matches = snap.docs.filter((d) => {
      const e = d.data() as WaitlistEntry;
      const dateOk = !e.preferredDate || e.preferredDate === appt.appointmentDate;
      const staffOk = !e.staffId || !appt.staffId || e.staffId === appt.staffId;
      return dateOk && staffOk;
    });
    if (matches.length === 0) return 0;

    const { sendEmail, sendSms } = await import('@/lib/notifications/providers');
    const { waitlistSlotOpened } = await import('@/lib/notifications/templates');
    const now = Timestamp.now();

    await Promise.allSettled(
      matches.map(async (doc) => {
        const e = doc.data() as WaitlistEntry;
        const msg = waitlistSlotOpened({
          clientName: e.clientName,
          serviceName: appt.serviceName,
          date: appt.appointmentDate,
          time: appt.appointmentTime,
        });
        await Promise.allSettled([
          e.clientEmail
            ? sendEmail({ to: e.clientEmail, subject: msg.subject, html: msg.html, text: msg.text })
            : Promise.resolve(),
          e.clientPhone ? sendSms({ to: e.clientPhone, body: msg.sms }) : Promise.resolve(),
        ]);
        await doc.ref.update({ status: 'offered' as WaitlistStatus, updatedAt: now });
      })
    );

    return matches.length;
  } catch (error) {
    console.error('offerFreedSlot failed:', error);
    return 0;
  }
}

/** Convenience: mark a waitlist entry as booked. */
export async function markWaitlistBooked(id: string) {
  return updateWaitlistStatus(id, 'booked');
}
