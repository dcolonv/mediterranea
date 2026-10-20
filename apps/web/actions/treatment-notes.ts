'use server';

/**
 * Treatment records: what was applied at a visit and what to do next time,
 * written by the practitioner — by hand, or transcribed from a photo of the
 * paper handbook.
 */
import { Timestamp } from 'firebase-admin/firestore';
import { getAdminDb } from '@/lib/firebase/admin';
import * as data from '@/lib/agent/data';
import { allowAction } from '@/lib/rate-limit';
import { transcribeTreatmentNotes } from '@/lib/agent/transcribe';
import type { Appointment } from '@mediterranea/shared/types';

const MAX_NOTE_CHARS = 5000;
/** The browser shrinks photos below this before sending (server actions accept ~1 MB). */
const MAX_IMAGE_CHARS = 1_000_000;

export async function saveTreatmentRecord(
  appointmentId: string,
  record: { applied: string; next: string }
) {
  try {
    await getAdminDb()
      .collection('appointments')
      .doc(appointmentId)
      .update({
        appliedTreatment: record.applied.trim().slice(0, MAX_NOTE_CHARS),
        nextTreatment: record.next.trim().slice(0, MAX_NOTE_CHARS),
        updatedAt: Timestamp.now(),
      });
    return { success: true as const };
  } catch (error) {
    console.error('Error saving treatment record:', error);
    return { success: false as const, error: 'Failed to save the treatment record.' };
  }
}

export interface PreviousTreatment {
  date: string;
  serviceName: string;
  applied: string;
  next: string;
}

/** The client's latest earlier visit that has a treatment record, to pick up where it left off. */
export async function getPreviousTreatment(appointmentId: string): Promise<PreviousTreatment | null> {
  const appt = await data.getAppointment(appointmentId);
  if (!appt?.customerId) return null;
  const snap = await getAdminDb().collection('appointments').where('customerId', '==', appt.customerId).get();
  const at = (a: Pick<Appointment, 'appointmentDate' | 'appointmentTime'>) => `${a.appointmentDate} ${a.appointmentTime}`;
  const previous = snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as Omit<Appointment, 'id'>) }))
    .filter((a) => a.id !== appt.id && at(a) < at(appt) && (a.appliedTreatment || a.nextTreatment))
    .sort((a, b) => at(b).localeCompare(at(a)))[0];
  return previous
    ? {
        date: previous.appointmentDate,
        serviceName: previous.serviceName,
        applied: previous.appliedTreatment ?? '',
        next: previous.nextTreatment ?? '',
      }
    : null;
}

/** Read a photo of handwritten notes into Applied / Next time text, for the practitioner to check. */
export async function transcribeTreatmentPhoto(appointmentId: string, imageDataUrl: string) {
  if (!/^data:image\/(jpeg|png|webp);base64,/.test(imageDataUrl) || imageDataUrl.length > MAX_IMAGE_CHARS) {
    return { success: false as const, error: 'Use a JPEG, PNG or WebP photo.' };
  }
  if (!process.env.OPENAI_API_KEY) {
    return { success: false as const, error: 'The AI assistant isn’t set up (OPENAI_API_KEY is missing).' };
  }
  // Each read is a paid AI call; keep a lid on it.
  if (!(await allowAction('transcribe:treatment-notes', 30, 60 * 60))) {
    return { success: false as const, error: 'Too many photos this hour. Try again later.' };
  }

  const appt = await data.getAppointment(appointmentId);
  try {
    const notes = await transcribeTreatmentNotes(imageDataUrl, { serviceName: appt?.serviceName });
    if (!notes.applied && !notes.next) {
      return { success: false as const, error: 'No handwritten notes found in that photo.' };
    }
    return { success: true as const, ...notes };
  } catch (error) {
    console.error('Error transcribing treatment notes:', error);
    return { success: false as const, error: 'Couldn’t read the photo. Try a sharper, well-lit picture.' };
  }
}
