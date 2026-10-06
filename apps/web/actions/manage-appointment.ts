'use server';

import { cookies, headers } from 'next/headers';
import { Timestamp } from 'firebase-admin/firestore';
import { getAdminDb } from '@/lib/firebase/admin';
import * as data from '@/lib/agent/data';
import { allowAction } from '@/lib/rate-limit';
import { readAppointmentToken, MANAGE_COOKIE } from '@/lib/appointments/link-token';
import { modifiableError } from '@/lib/appointments/policy';
import type { Appointment, WorkingHours } from '@mediterranea/shared/types';

/**
 * Self-service reschedule and cancel for clients arriving from a link in their
 * confirmation email — no account needed, because most people book as guests.
 *
 * Every action re-reads and re-verifies the token cookie. Server actions are
 * public POST endpoints, so checking only when the page renders would be no
 * check at all.
 */

/** Coarse client IP for rate-limit keying. */
async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || 'unknown';
}

export interface ManageView {
  id: string;
  serviceName: string;
  date: string;
  time: string;
  durationMinutes: number;
  status: Appointment['status'];
  clientName: string;
  locale: 'en' | 'es';
  /** Null when the client may still change it; otherwise why not. */
  blockedReason: string | null;
  policyText: string;
  /** Refs the month calendar needs, so the page loads them in one round trip. */
  businessHours: WorkingHours;
  maxAdvanceDays: number;
  blockedDates: string[];
}

type Failure = { success: false; error: string };

/** Resolve the appointment this browser holds a valid token for. */
async function authorize(): Promise<
  | {
      appt: Appointment;
      locale: 'en' | 'es';
      cutoffHours: number;
      policyText: string;
      settings: Awaited<ReturnType<typeof data.getStudioSettings>>;
    }
  | Failure
> {
  const token = (await cookies()).get(MANAGE_COOKIE)?.value;
  const appointmentId = readAppointmentToken(token);
  if (!appointmentId) {
    return { success: false, error: 'This link is no longer valid. Please contact the studio.' };
  }

  const appt = await data.getAppointment(appointmentId);
  if (!appt) return { success: false, error: 'Appointment not found.' };

  const settings = await data.getStudioSettings();
  const locale: 'en' | 'es' = appt.locale === 'es' ? 'es' : 'en';
  const policyText =
    (locale === 'es'
      ? settings.cancellation.policyTextEs || settings.cancellation.policyText
      : settings.cancellation.policyText) ?? '';

  return { appt, locale, cutoffHours: settings.cancellation.cutoffHours, policyText, settings };
}

/** The appointment behind the current link, for rendering. */
export async function getManagedAppointment(): Promise<
  { success: true; data: ManageView } | Failure
> {
  const auth = await authorize();
  if ('success' in auth) return auth;
  const { appt, locale, cutoffHours, policyText, settings } = auth;

  return {
    success: true,
    data: {
      id: appt.id,
      serviceName: appt.serviceName,
      date: appt.appointmentDate,
      time: appt.appointmentTime,
      durationMinutes: appt.durationMinutes,
      status: appt.status,
      clientName: appt.clientName,
      locale,
      blockedReason: modifiableError(appt, cutoffHours, locale),
      policyText,
      businessHours: settings.businessHours ?? {},
      maxAdvanceDays: settings.booking.maxAdvanceDays,
      blockedDates: await data.getFullyBlockedDates(),
    },
  };
}

/** Every slot on a day, each flagged available or taken — as the booking flow shows it. */
export async function getManagedDaySlots(
  date: string
): Promise<{ success: true; slots: { time: string; available: boolean }[] } | Failure> {
  const auth = await authorize();
  if ('success' in auth) return auth;
  const { appt, locale, cutoffHours } = auth;

  const blocked = modifiableError(appt, cutoffHours, locale);
  if (blocked) return { success: false, error: blocked };

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { success: false, error: 'Invalid date.' };
  }

  const res = await data.findDaySlots({ serviceId: appt.serviceId, date });
  if ('error' in res) return { success: false, error: res.error };
  return {
    success: true,
    slots: res.slots.map((s) => ({ time: s.time, available: s.available })),
  };
}

export async function rescheduleManagedAppointment(
  date: string,
  time: string
): Promise<{ success: true } | Failure> {
  const auth = await authorize();
  if ('success' in auth) return auth;
  const { appt, locale, cutoffHours } = auth;

  if (!(await allowAction(`manage:${appt.id}`, 10, 10 * 60))) {
    return { success: false, error: 'Too many changes. Please contact the studio.' };
  }
  if (!(await allowAction(`manage:ip:${await clientIp()}`, 20, 10 * 60))) {
    return { success: false, error: 'Too many requests. Please try again later.' };
  }

  const blocked = modifiableError(appt, cutoffHours, locale);
  if (blocked) return { success: false, error: blocked };

  // Re-resolve staff and room from a fresh availability check, so two clients
  // racing for the same slot cannot both take it.
  const avail = await data.findAvailability({ serviceId: appt.serviceId, date });
  if ('error' in avail) return { success: false, error: avail.error };
  const slot = avail.slots.find((s) => s.time === time);
  if (!slot) return { success: false, error: 'That time is no longer available.' };

  const staffId = appt.staffId && slot.staffIds.includes(appt.staffId) ? appt.staffId : slot.staffIds[0];
  const roomId = slot.roomIds[0];
  if (!staffId || !roomId) return { success: false, error: 'That time is no longer available.' };

  const res = await data.updateAppointment(appt.id, { date, time, staffId, roomId }, 'the client');
  if (!res.success) return { success: false, error: res.error ?? 'Could not reschedule.' };

  const { notifyAppointmentRescheduled } = await import('@/lib/notifications/dispatch');
  await notifyAppointmentRescheduled(appt.id);
  return { success: true };
}

export async function cancelManagedAppointment(): Promise<{ success: true } | Failure> {
  const auth = await authorize();
  if ('success' in auth) return auth;
  const { appt, locale, cutoffHours } = auth;

  if (!(await allowAction(`manage:${appt.id}`, 10, 10 * 60))) {
    return { success: false, error: 'Too many changes. Please contact the studio.' };
  }

  const blocked = modifiableError(appt, cutoffHours, locale);
  if (blocked) return { success: false, error: blocked };

  try {
    await getAdminDb().collection('appointments').doc(appt.id).update({
      status: 'cancelled',
      updatedAt: Timestamp.now(),
    });
    const { notifyAppointmentCancelled } = await import('@/lib/notifications/dispatch');
    const { notifyTeam } = await import('@/lib/notifications/team');
    await Promise.all([
      notifyAppointmentCancelled(appt.id),
      notifyTeam({ kind: 'updated', before: appt, after: { ...appt, status: 'cancelled' } }, 'the client'),
    ]);
    return { success: true };
  } catch (error) {
    console.error('Error cancelling appointment from link:', error);
    return { success: false, error: 'Failed to cancel the appointment.' };
  }
}
