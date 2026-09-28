'use server';

import * as data from '@/lib/agent/data';
import { serializeDoc } from '@/lib/firebase/serialize';
import { getCustomers } from '@/actions/customers';
import type { Appointment, Service, Staff, Room, AppointmentStatus } from '@mediterranea/shared/types';

/** Reference data the booking UI needs: active services, staff, rooms. */
export async function getSchedulingRefs() {
  try {
    const [services, staff, rooms] = await Promise.all([
      data.listServices(false),
      data.listStaff(true),
      data.listRooms(true),
    ]);
    return {
      success: true as const,
      services: (services as Service[]).map((s) => serializeDoc(s)),
      staff: (staff as Staff[]).map((s) => serializeDoc(s)),
      rooms: (rooms as Room[]).map((r) => serializeDoc(r)),
    };
  } catch (error) {
    console.error('Error loading scheduling refs:', error);
    return { success: false as const, error: 'Failed to load scheduling data.' };
  }
}

export async function getCalendarAppointments(filters: {
  startDate?: string;
  endDate?: string;
  date?: string;
  staffId?: string;
  roomId?: string;
  status?: AppointmentStatus;
}) {
  try {
    const data_ = await data.listAppointments(filters);
    return { success: true as const, data: data_.map((a) => serializeDoc(a)) as Appointment[] };
  } catch (error) {
    console.error('Error loading calendar:', error);
    return { success: false as const, error: 'Failed to load appointments.' };
  }
}

/** Practitioners' time off in a date range, for showing blocked time on the calendar. */
export async function getCalendarBlocks(filters: { startDate: string; endDate: string; staffId?: string }) {
  try {
    return { success: true as const, data: await data.listBlockedTimes(filters) };
  } catch (error) {
    console.error('Error loading blocked times:', error);
    return { success: false as const, error: 'Failed to load blocked times.' };
  }
}

export async function getAvailability(serviceId: string, date: string, staffId?: string) {
  return data.findAvailability({ serviceId, date, staffId });
}

/**
 * Every slot on a date, open or taken, with the free staff/rooms for the open
 * ones. Backoffice view: past dates and times are included for backfilling.
 */
export async function getBackofficeSlots(
  serviceId: string,
  date: string,
  opts: { staffId?: string; ignoreAppointmentId?: string } = {}
) {
  return data.findDaySlots({ serviceId, date, ...opts, allowPast: true });
}

/**
 * Book from the backoffice. Only a name is required: without an email the
 * client gets no confirmation, so `emailed` tells staff to confirm in person.
 * A time already past is a backfill: saved as completed, with no messages sent.
 */
export async function bookWalkIn(input: {
  serviceId: string;
  date: string;
  time: string;
  staffId: string;
  roomId: string;
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  /** Set when an existing client was picked from search. */
  customerId?: string;
  notes?: string;
}) {
  const clientEmail = input.clientEmail?.trim() ?? '';
  const past = data.isPastInStudio(input.date, input.time);
  const res = await data.createAppointment({
    ...input,
    clientName: input.clientName.trim(),
    clientEmail,
    clientPhone: input.clientPhone?.trim() ?? '',
    source: 'walk-in',
    ...(past && { status: 'completed' as const, notify: false }),
  });
  if (!res.success) return res;
  const settings = await data.getStudioSettings();
  const emailed =
    !past && Boolean(clientEmail) && settings.notifications?.confirmationEnabled !== false;
  return { ...res, emailed, past };
}

/**
 * Book a walk-in when the caller only knows the time (and optionally a preferred
 * practitioner) — resolves staff + room server-side from a fresh availability
 * check, then creates with the transactional guard. Used by the mobile app.
 */
export async function bookWalkInResolved(input: {
  serviceId: string;
  date: string;
  time: string;
  staffId?: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  notes?: string;
}) {
  const avail = await data.findAvailability({
    serviceId: input.serviceId,
    date: input.date,
    staffId: input.staffId,
  });
  if ('error' in avail) return { success: false as const, error: avail.error };

  const slot = avail.slots.find((s) => s.time === input.time);
  if (!slot) return { success: false as const, error: 'That time is no longer available.' };

  const staffId =
    input.staffId && slot.staffIds.includes(input.staffId) ? input.staffId : slot.staffIds[0];
  const roomId = slot.roomIds[0];
  if (!staffId || !roomId) return { success: false as const, error: 'That time is no longer available.' };

  return data.createAppointment({
    serviceId: input.serviceId,
    date: input.date,
    time: input.time,
    staffId,
    roomId,
    clientName: input.clientName,
    clientEmail: input.clientEmail,
    clientPhone: input.clientPhone,
    notes: input.notes,
    source: 'walk-in',
  });
}

/**
 * Reschedule / reassign an appointment, or switch its treatment; re-runs the
 * transactional conflict check. Past dates are allowed (correcting history).
 */
export async function rescheduleAppointment(
  id: string,
  patch: { date?: string; time?: string; staffId?: string; roomId?: string; serviceId?: string }
) {
  return data.updateAppointment(id, patch);
}

/** Lightweight client search for pre-filling the booking form. */
export async function searchClients(term: string) {
  const res = await getCustomers(term);
  if (!res.success || !res.data) return { success: false as const, data: [] };
  return {
    success: true as const,
    data: res.data.slice(0, 8).map((c) => ({
      id: c.id,
      name: c.name,
      email: c.email,
      phone: c.phone,
    })),
  };
}
