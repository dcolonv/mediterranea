'use server';

import { Timestamp } from 'firebase-admin/firestore';
import { getAdminDb } from '@/lib/firebase/admin';
import { getCurrentCustomer } from '@/lib/auth/customer';
import * as data from '@/lib/agent/data';
import { CONSENT_VERSION } from '@mediterranea/shared/constants';
import type { Appointment, SkinProfile, IntakeForm } from '@mediterranea/shared/types';

export interface MyAppointment {
  id: string;
  serviceName: string;
  date: string;
  time: string;
  durationMinutes: number;
  status: Appointment['status'];
  staffName: string | null;
  canModify: boolean; // within the cancellation cutoff window
}

/** Current date + minutes-since-midnight in Europe/Madrid. */
function malagaNow(): { date: string; minutes: number } {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Madrid',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '00';
  return {
    date: `${get('year')}-${get('month')}-${get('day')}`,
    minutes: (Number(get('hour')) % 24) * 60 + Number(get('minute')),
  };
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + (m || 0);
}

/** Minutes from now (Malaga) until an appointment's start. Negative if past. */
function minutesUntil(date: string, time: string): number {
  const now = malagaNow();
  const days = Math.round((Date.parse(date) - Date.parse(now.date)) / 86_400_000);
  return days * 1440 + timeToMinutes(time) - now.minutes;
}

async function myAppointmentDocs(customerId: string, email: string) {
  const db = getAdminDb();
  const [byId, byEmail] = await Promise.all([
    db.collection('appointments').where('customerId', '==', customerId).get(),
    db.collection('appointments').where('clientEmail', '==', email).get(),
  ]);
  const map = new Map<string, Appointment>();
  for (const d of [...byId.docs, ...byEmail.docs]) {
    map.set(d.id, { id: d.id, ...d.data() } as Appointment);
  }
  return [...map.values()];
}

export async function getMyAppointments(): Promise<
  | { success: true; upcoming: MyAppointment[]; past: MyAppointment[] }
  | { success: false; error: string }
> {
  const customer = await getCurrentCustomer();
  if (!customer) return { success: false, error: 'Not signed in.' };

  const [appts, staff, settings] = await Promise.all([
    myAppointmentDocs(customer.id, customer.email),
    data.listStaff(false),
    data.getStudioSettings(),
  ]);
  const cutoff = settings.cancellation.cutoffHours * 60;
  const staffName = (id?: string) => (id ? (staff.find((s) => s.id === id)?.name ?? null) : null);

  const toMy = (a: Appointment): MyAppointment & { _until: number } => {
    const until = minutesUntil(a.appointmentDate, a.appointmentTime);
    const active = a.status === 'pending' || a.status === 'confirmed';
    return {
      id: a.id,
      serviceName: a.serviceName,
      date: a.appointmentDate,
      time: a.appointmentTime,
      durationMinutes: a.durationMinutes,
      status: a.status,
      staffName: staffName(a.staffId),
      canModify: active && until >= cutoff,
      _until: until,
    };
  };

  const all = appts.map(toMy).sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
  const upcoming = all
    .filter((a) => a._until >= 0 && a.status !== 'cancelled' && a.status !== 'no-show')
    .map(({ _until, ...rest }) => rest);
  const past = all
    .filter((a) => a._until < 0 || a.status === 'cancelled' || a.status === 'no-show')
    .reverse()
    .map(({ _until, ...rest }) => rest);

  return { success: true, upcoming, past };
}

export async function updateMyProfile(input: {
  name: string;
  phone: string;
  skinProfile: SkinProfile;
  intake?: IntakeForm;
  consent?: { treatmentConsent: boolean; marketingOptIn: boolean; signedName?: string };
}) {
  const customer = await getCurrentCustomer();
  if (!customer) return { success: false as const, error: 'Not signed in.' };

  if (!input.name.trim()) return { success: false as const, error: 'Name is required.' };

  try {
    const now = Timestamp.now();
    const update: Record<string, unknown> = {
      name: input.name.trim(),
      phone: input.phone.trim(),
      skinProfile: {
        skinType: input.skinProfile.skinType ?? '',
        concerns: input.skinProfile.concerns ?? [],
        preferences: input.skinProfile.preferences ?? '',
      },
      updatedAt: now,
    };

    if (input.intake) {
      update.intake = {
        allergies: input.intake.allergies ?? '',
        medications: input.intake.medications ?? '',
        conditions: input.intake.conditions ?? '',
        notes: input.intake.notes ?? '',
        updatedAt: now,
      };
    }

    if (input.consent) {
      // Re-stamp the consent timestamp whenever consent is (re)affirmed.
      const prior = customer.consent;
      const consentedAt =
        input.consent.treatmentConsent && (!prior?.treatmentConsent || prior.version !== CONSENT_VERSION)
          ? now
          : (prior?.consentedAt ?? (input.consent.treatmentConsent ? now : null));
      update.consent = {
        treatmentConsent: input.consent.treatmentConsent,
        marketingOptIn: input.consent.marketingOptIn,
        signedName: input.consent.signedName ?? '',
        version: CONSENT_VERSION,
        consentedAt,
      };
    }

    await getAdminDb().collection('customers').doc(customer.id).update(update);
    return { success: true as const };
  } catch (error) {
    console.error('Error updating profile:', error);
    return { success: false as const, error: 'Failed to save your profile.' };
  }
}

/** Verify an appointment belongs to the signed-in customer and is still modifiable. */
async function ownedModifiable(id: string) {
  const customer = await getCurrentCustomer();
  if (!customer) return { error: 'Not signed in.' as const };

  const appt = await data.getAppointment(id);
  if (!appt) return { error: 'Appointment not found.' as const };
  const mine = appt.customerId === customer.id || appt.clientEmail === customer.email;
  if (!mine) return { error: 'That appointment is not on your account.' as const };
  if (appt.status !== 'pending' && appt.status !== 'confirmed') {
    return { error: 'This appointment can no longer be changed.' as const };
  }

  const settings = await data.getStudioSettings();
  const until = minutesUntil(appt.appointmentDate, appt.appointmentTime);
  if (until < settings.cancellation.cutoffHours * 60) {
    return { error: `Changes must be made at least ${settings.cancellation.cutoffHours} hours in advance. Please call us.` as const };
  }
  return { appt, customer };
}

export async function cancelMyAppointment(id: string) {
  const check = await ownedModifiable(id);
  if ('error' in check) return { success: false as const, error: check.error };

  try {
    await getAdminDb().collection('appointments').doc(id).update({
      status: 'cancelled',
      updatedAt: Timestamp.now(),
    });
    const { notifyAppointmentCancelled } = await import('@/lib/notifications/dispatch');
    await notifyAppointmentCancelled(id);
    return { success: true as const };
  } catch (error) {
    console.error('Error cancelling appointment:', error);
    return { success: false as const, error: 'Failed to cancel the appointment.' };
  }
}

/** Open times for rescheduling one of my appointments (same service). */
export async function getMyRescheduleTimes(id: string, date: string) {
  const check = await ownedModifiable(id);
  if ('error' in check) return { success: false as const, error: check.error };

  const res = await data.findAvailability({ serviceId: check.appt.serviceId, date });
  if ('error' in res) return { success: false as const, error: res.error };
  return { success: true as const, times: res.slots.map((s) => s.time) };
}

export async function rescheduleMyAppointment(id: string, date: string, time: string) {
  const check = await ownedModifiable(id);
  if ('error' in check) return { success: false as const, error: check.error };

  // Resolve staff + room server-side from a fresh availability check.
  const avail = await data.findAvailability({ serviceId: check.appt.serviceId, date });
  if ('error' in avail) return { success: false as const, error: avail.error };
  const slot = avail.slots.find((s) => s.time === time);
  if (!slot) return { success: false as const, error: 'That time is no longer available.' };

  const staffId =
    check.appt.staffId && slot.staffIds.includes(check.appt.staffId)
      ? check.appt.staffId
      : slot.staffIds[0];
  const roomId = slot.roomIds[0];
  if (!staffId || !roomId) return { success: false as const, error: 'That time is no longer available.' };

  return data.updateAppointment(id, { date, time, staffId, roomId });
}
