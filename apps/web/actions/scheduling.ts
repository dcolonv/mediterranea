'use server';

import * as data from '@/lib/agent/data';
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
      services: services as Service[],
      staff: staff as Staff[],
      rooms: rooms as Room[],
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
    return { success: true as const, data: data_ as Appointment[] };
  } catch (error) {
    console.error('Error loading calendar:', error);
    return { success: false as const, error: 'Failed to load appointments.' };
  }
}

export async function getAvailability(serviceId: string, date: string, staffId?: string) {
  return data.findAvailability({ serviceId, date, staffId });
}

export async function bookWalkIn(input: {
  serviceId: string;
  date: string;
  time: string;
  staffId: string;
  roomId: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  notes?: string;
}) {
  return data.createAppointment({ ...input, source: 'walk-in' });
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

/** Reschedule / reassign an appointment; re-runs the transactional conflict check. */
export async function rescheduleAppointment(
  id: string,
  patch: { date?: string; time?: string; staffId?: string; roomId?: string }
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
