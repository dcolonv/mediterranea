/**
 * Deterministic data layer for the booking agent.
 *
 * Every tool the agent calls runs through these functions. Reads use the Admin
 * SDK (bypassing security rules — the API layer enforces admin auth). Writes to
 * appointments run inside a Firestore transaction with an overlap check, so the
 * agent can never create a double-booking even if the model reasons incorrectly.
 */
import { Timestamp, type DocumentSnapshot } from 'firebase-admin/firestore';
import { getAdminDb } from '@/lib/firebase/admin';
import { upsertCustomerForAppointment } from '@/actions/customers';
import { DEFAULT_STUDIO_SETTINGS } from '@mediterranea/shared/constants';
import {
  timeToMinutes,
  weekdayOf,
  addDaysStr,
  computeSlots,
  detectConflicts,
  type AvailAppt,
} from '@/lib/agent/availability';
import type {
  Service,
  Staff,
  Room,
  Appointment,
  AppointmentStatus,
  StudioSettings,
} from '@mediterranea/shared/types';

/** Statuses that occupy a staff member / room on the calendar. */
const ACTIVE_STATUSES: AppointmentStatus[] = ['pending', 'confirmed', 'checked-in', 'completed'];

/** Current date + minutes-since-midnight in the studio's timezone (Europe/Madrid). */
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
  const date = `${get('year')}-${get('month')}-${get('day')}`;
  const minutes = (Number(get('hour')) % 24) * 60 + Number(get('minute'));
  return { date, minutes };
}

/** Read studio settings, falling back to defaults when unset. */
export async function getStudioSettings(): Promise<StudioSettings> {
  const snap = await getAdminDb().doc('settings/studio').get();
  return snap.exists
    ? ({ ...DEFAULT_STUDIO_SETTINGS, ...snap.data() } as StudioSettings)
    : (DEFAULT_STUDIO_SETTINGS as unknown as StudioSettings);
}

function docData<T>(doc: DocumentSnapshot): T {
  return { id: doc.id, ...doc.data() } as T;
}

// ── Rooms ─────────────────────────────────────────────────────────────────────

export async function listRooms(activeOnly = true): Promise<Room[]> {
  const snap = await getAdminDb().collection('rooms').get();
  const rooms = snap.docs.map((d) => docData<Room>(d));
  return activeOnly ? rooms.filter((r) => r.isActive) : rooms;
}

// ── Services ──────────────────────────────────────────────────────────────────

export async function listServices(includeInactive = false): Promise<Service[]> {
  const snap = await getAdminDb().collection('services').orderBy('displayOrder', 'asc').get();
  const services = snap.docs.map((d) => docData<Service>(d));
  return includeInactive ? services : services.filter((s) => s.isActive);
}

/** Resolve a service by document id, or fall back to matching its slug. */
export async function getService(idOrSlug: string): Promise<Service | null> {
  const db = getAdminDb();
  const byId = await db.collection('services').doc(idOrSlug).get();
  if (byId.exists) return docData<Service>(byId);

  const bySlug = await db.collection('services').where('slug', '==', idOrSlug).limit(1).get();
  return bySlug.empty ? null : docData<Service>(bySlug.docs[0]);
}

// ── Staff ─────────────────────────────────────────────────────────────────────

export async function listStaff(activeOnly = true): Promise<Staff[]> {
  const snap = await getAdminDb().collection('staff').get();
  const staff = snap.docs.map((d) => docData<Staff>(d));
  return activeOnly ? staff.filter((s) => s.active) : staff;
}

export async function getStaff(id: string): Promise<Staff | null> {
  const doc = await getAdminDb().collection('staff').doc(id).get();
  return doc.exists ? docData<Staff>(doc) : null;
}

/** Services a staff member is qualified to perform. */
export async function getStaffServices(staffId: string): Promise<Service[]> {
  const staff = await getStaff(staffId);
  if (!staff) return [];
  const services = await listServices(true);
  return services.filter((s) => staff.serviceIds.includes(s.id));
}

/** Active staff qualified for a given service. */
export async function getServiceStaff(serviceId: string): Promise<Staff[]> {
  const service = await getService(serviceId);
  if (!service) return [];
  const staff = await listStaff(true);
  return staff.filter((s) => s.serviceIds.includes(service.id));
}

// ── Appointments (calendar) ─────────────────────────────────────────────────────

export interface AppointmentFilters {
  date?: string;
  startDate?: string;
  endDate?: string;
  staffId?: string;
  roomId?: string;
  status?: AppointmentStatus;
}

export async function listAppointments(filters: AppointmentFilters = {}): Promise<Appointment[]> {
  const snap = await getAdminDb().collection('appointments').get();
  let appts = snap.docs.map((d) => docData<Appointment>(d));

  if (filters.date) appts = appts.filter((a) => a.appointmentDate === filters.date);
  if (filters.startDate) appts = appts.filter((a) => a.appointmentDate >= filters.startDate!);
  if (filters.endDate) appts = appts.filter((a) => a.appointmentDate <= filters.endDate!);
  if (filters.staffId) appts = appts.filter((a) => a.staffId === filters.staffId);
  if (filters.roomId) appts = appts.filter((a) => a.roomId === filters.roomId);
  if (filters.status) appts = appts.filter((a) => a.status === filters.status);

  return appts.sort(
    (a, b) =>
      a.appointmentDate.localeCompare(b.appointmentDate) ||
      a.appointmentTime.localeCompare(b.appointmentTime)
  );
}

export async function getAppointment(id: string): Promise<Appointment | null> {
  const doc = await getAdminDb().collection('appointments').doc(id).get();
  return doc.exists ? docData<Appointment>(doc) : null;
}

// ── Availability ───────────────────────────────────────────────────────────────

export interface AvailabilitySlot {
  time: string;
  staffIds: string[];
  roomIds: string[];
}

export interface AvailabilityResult {
  serviceId: string;
  serviceName: string;
  date: string;
  durationMinutes: number;
  slots: AvailabilitySlot[];
}

/**
 * Compute bookable start times for a service on a date, intersecting: service
 * duration + slot grid, each qualified staff member's hours (minus time off and
 * their booked appointments), and a free room of the required type. Fetches the
 * records, then delegates the pure computation to `computeSlots`.
 */
export async function findAvailability(input: {
  serviceId: string;
  date: string;
  staffId?: string;
}): Promise<AvailabilityResult | { error: string }> {
  const service = await getService(input.serviceId);
  if (!service) return { error: `No service found for "${input.serviceId}".` };

  const duration = service.durationMinutes;
  const weekday = weekdayOf(input.date);
  const settings = await getStudioSettings();

  const empty = {
    serviceId: service.id,
    serviceName: service.name,
    date: input.date,
    durationMinutes: duration,
    slots: [] as AvailabilitySlot[],
  };

  // Booking window: no past dates, no dates beyond maxAdvanceDays.
  const now = malagaNow();
  const maxDate = addDaysStr(now.date, settings.booking.maxAdvanceDays);
  if (input.date < now.date || input.date > maxDate) return empty;

  const bh = settings.businessHours?.[weekday] ?? null;
  if (!bh) return empty;

  let staffList = await getServiceStaff(service.id);
  if (input.staffId) staffList = staffList.filter((s) => s.id === input.staffId);

  const rooms = (await listRooms(true)).filter(
    (r) => !service.roomType || r.type === service.roomType
  );

  const dayAppts = (await listAppointments({ date: input.date })).filter((a) =>
    ACTIVE_STATUSES.includes(a.status)
  );

  const slots = computeSlots({
    date: input.date,
    weekday,
    duration,
    businessHours: bh,
    intervalMinutes: settings.booking.slotIntervalMinutes,
    earliestMinutes: input.date === now.date ? now.minutes + settings.booking.minLeadHours * 60 : 0,
    staff: staffList.map((s) => ({ id: s.id, workingHours: s.workingHours, timeOff: s.timeOff })),
    rooms: rooms.map((r) => ({ id: r.id })),
    dayAppointments: dayAppts.map((a) => ({
      staffId: a.staffId,
      roomId: a.roomId,
      appointmentTime: a.appointmentTime,
      durationMinutes: a.durationMinutes,
    })),
  });

  return {
    serviceId: service.id,
    serviceName: service.name,
    date: input.date,
    durationMinutes: duration,
    slots,
  };
}

// ── Appointment writes (transactional conflict guard) ────────────────────────────

export interface CreateAppointmentInput {
  serviceId: string;
  date: string;
  time: string;
  staffId: string;
  roomId: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  notes?: string;
  /** How the booking was made; defaults to 'agent'. */
  source?: 'online' | 'walk-in' | 'agent';
}

export type WriteResult =
  | { success: true; id: string }
  | { success: false; error: string; conflicts?: { staff?: boolean; room?: boolean } };

class ConflictError extends Error {
  constructor(public staff: boolean, public room: boolean) {
    super('Slot conflict');
  }
}

export async function createAppointment(input: CreateAppointmentInput): Promise<WriteResult> {
  const db = getAdminDb();

  const service = await getService(input.serviceId);
  if (!service) return { success: false, error: `No service found for "${input.serviceId}".` };

  const staff = await getStaff(input.staffId);
  if (!staff || !staff.active) return { success: false, error: 'Staff member not found or inactive.' };
  if (!staff.serviceIds.includes(service.id)) {
    return { success: false, error: `${staff.name} is not qualified for ${service.name}.` };
  }

  const room = (await listRooms(false)).find((r) => r.id === input.roomId);
  if (!room || !room.isActive) return { success: false, error: 'Room not found or inactive.' };
  if (service.roomType && room.type !== service.roomType) {
    return { success: false, error: `${room.name} is not a ${service.roomType} room.` };
  }

  const start = timeToMinutes(input.time);
  const end = start + service.durationMinutes;

  // Link/refresh the customer record before the transaction.
  const customerId = await upsertCustomerForAppointment({
    name: input.clientName,
    email: input.clientEmail,
    phone: input.clientPhone,
    appointmentDate: input.date,
  });

  const newRef = db.collection('appointments').doc();

  try {
    await db.runTransaction(async (tx) => {
      const daySnap = await tx.get(
        db
          .collection('appointments')
          .where('appointmentDate', '==', input.date)
          .where('status', 'in', ACTIVE_STATUSES)
      );

      const existing: AvailAppt[] = daySnap.docs.map((doc) => doc.data() as Appointment);
      const { staffClash, roomClash } = detectConflicts(existing, {
        start,
        end,
        staffId: input.staffId,
        roomId: input.roomId,
      });
      if (staffClash || roomClash) throw new ConflictError(staffClash, roomClash);

      const now = Timestamp.now();
      tx.set(newRef, {
        serviceId: service.id,
        serviceName: service.name,
        clientName: input.clientName,
        clientEmail: input.clientEmail,
        clientPhone: input.clientPhone,
        ...(customerId && { customerId }),
        staffId: input.staffId,
        roomId: input.roomId,
        source: input.source ?? 'agent',
        appointmentDate: input.date,
        appointmentTime: input.time,
        durationMinutes: service.durationMinutes,
        notes: input.notes ?? '',
        status: 'pending' as AppointmentStatus,
        createdAt: now,
        updatedAt: now,
      });
    });
  } catch (e) {
    if (e instanceof ConflictError) {
      const who = [e.staff && 'the practitioner', e.room && 'the room'].filter(Boolean).join(' and ');
      return {
        success: false,
        error: `That time conflicts with an existing booking for ${who}.`,
        conflicts: { staff: e.staff, room: e.room },
      };
    }
    console.error('createAppointment failed:', e);
    return { success: false, error: 'Failed to create the appointment.' };
  }

  // Best-effort confirmation (email + SMS). Dynamic import avoids a module cycle.
  try {
    const { notifyBookingCreated } = await import('@/lib/notifications/dispatch');
    await notifyBookingCreated(newRef.id);
  } catch {
    /* notifications are best-effort */
  }

  return { success: true, id: newRef.id };
}

export interface UpdateAppointmentInput {
  date?: string;
  time?: string;
  staffId?: string;
  roomId?: string;
  status?: AppointmentStatus;
  notes?: string;
}

export async function updateAppointment(
  id: string,
  patch: UpdateAppointmentInput
): Promise<WriteResult> {
  const db = getAdminDb();
  const existing = await getAppointment(id);
  if (!existing) return { success: false, error: 'Appointment not found.' };

  const next = {
    date: patch.date ?? existing.appointmentDate,
    time: patch.time ?? existing.appointmentTime,
    staffId: patch.staffId ?? existing.staffId,
    roomId: patch.roomId ?? existing.roomId,
  };
  const status = patch.status ?? existing.status;

  const reschedules = Boolean(patch.date || patch.time || patch.staffId || patch.roomId);
  const start = timeToMinutes(next.time);
  const end = start + existing.durationMinutes;

  try {
    await db.runTransaction(async (tx) => {
      // Only re-check the calendar when the slot/assignment changes and it stays active.
      if (reschedules && ACTIVE_STATUSES.includes(status)) {
        const daySnap = await tx.get(
          db
            .collection('appointments')
            .where('appointmentDate', '==', next.date)
            .where('status', 'in', ACTIVE_STATUSES)
        );
        const existing: AvailAppt[] = daySnap.docs.map((doc) => {
          const a = doc.data() as Appointment;
          return {
            id: doc.id,
            staffId: a.staffId,
            roomId: a.roomId,
            appointmentTime: a.appointmentTime,
            durationMinutes: a.durationMinutes,
          };
        });
        const { staffClash, roomClash } = detectConflicts(existing, {
          start,
          end,
          staffId: next.staffId,
          roomId: next.roomId,
          ignoreId: id,
        });
        if (staffClash || roomClash) throw new ConflictError(staffClash, roomClash);
      }

      tx.update(db.collection('appointments').doc(id), {
        appointmentDate: next.date,
        appointmentTime: next.time,
        ...(next.staffId !== undefined && { staffId: next.staffId }),
        ...(next.roomId !== undefined && { roomId: next.roomId }),
        status,
        ...(patch.notes !== undefined && { notes: patch.notes }),
        updatedAt: Timestamp.now(),
      });
    });
  } catch (e) {
    if (e instanceof ConflictError) {
      const who = [e.staff && 'the practitioner', e.room && 'the room'].filter(Boolean).join(' and ');
      return {
        success: false,
        error: `That change conflicts with an existing booking for ${who}.`,
        conflicts: { staff: e.staff, room: e.room },
      };
    }
    console.error('updateAppointment failed:', e);
    return { success: false, error: 'Failed to update the appointment.' };
  }

  if (status === 'cancelled' && existing.status !== 'cancelled') {
    try {
      const { notifyAppointmentCancelled } = await import('@/lib/notifications/dispatch');
      await notifyAppointmentCancelled(id);
    } catch {
      /* best-effort */
    }
  }
  if (status === 'completed' && existing.status !== 'completed') {
    try {
      const { awardLoyaltyForCompletion } = await import('@/actions/loyalty');
      await awardLoyaltyForCompletion(id);
    } catch {
      /* best-effort */
    }
  }

  return { success: true, id };
}

export async function deleteAppointment(id: string): Promise<WriteResult> {
  try {
    await getAdminDb().collection('appointments').doc(id).delete();
    return { success: true, id };
  } catch (e) {
    console.error('deleteAppointment failed:', e);
    return { success: false, error: 'Failed to delete the appointment.' };
  }
}
