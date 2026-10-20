/**
 * Deterministic data layer for the booking agent.
 *
 * Every tool the agent calls runs through these functions. Reads use the Admin
 * SDK (bypassing security rules — the API layer enforces admin auth). Writes to
 * appointments run inside a Firestore transaction with an overlap check, so the
 * agent can never create a double-booking even if the model reasons incorrectly.
 */
import { Timestamp, FieldValue, type DocumentSnapshot, type Transaction } from 'firebase-admin/firestore';
import { getAdminDb } from '@/lib/firebase/admin';
import { upsertCustomerForAppointment } from '@/actions/customers';
import { DEFAULT_STUDIO_SETTINGS, BOOKING_OPENS_DATE } from '@mediterranea/shared/constants';
import { payablePrice } from '@mediterranea/shared/utils';
import {
  timeToMinutes,
  weekdayOf,
  addDaysStr,
  computeFixedSlots,
  gridTimes,
  detectConflicts,
  expandTimeOff,
  type AvailAppt,
  type BlockedTime,
  type FixedSlot,
} from '@/lib/agent/availability';
import { passUsage, sessionNumber, sessionPrice, type PassUsage } from '@/lib/agent/passes';
import type {
  Service,
  Staff,
  Room,
  Appointment,
  AppointmentStatus,
  StudioSettings,
  ServicePass,
} from '@mediterranea/shared/types';
import type { TeamEvent } from '@/lib/notifications/team-templates';

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

/** True when a date + start time is already behind us in the studio's timezone. */
export function isPastInStudio(date: string, time: string): boolean {
  const now = malagaNow();
  return date < now.date || (date === now.date && timeToMinutes(time) < now.minutes);
}

/**
 * Email the team about an appointment change. Best-effort; the dynamic import
 * avoids a module cycle (the team mailer reads staff and rooms from here).
 */
async function tellTeam(event: TeamEvent, by?: string): Promise<void> {
  try {
    const { notifyTeam } = await import('@/lib/notifications/team');
    await notifyTeam(event, by);
  } catch {
    /* best-effort */
  }
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

/** The treatment a booking is actually for: a pass books sessions of another treatment. */
async function treatmentOf(service: Service): Promise<Service | null> {
  return service.bundle ? getService(service.bundle.serviceId) : service;
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
  const treatment = service && (await treatmentOf(service));
  if (!treatment) return [];
  const staff = await listStaff(true);
  return staff.filter((s) => s.serviceIds.includes(treatment.id));
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

export interface AppointmentPass extends PassUsage {
  passId: string;
  name: string;
  nameEs?: string;
  price: number;
  /** Which session of the pass this appointment is; null once it no longer counts. */
  session: number | null;
}

/** The pass an appointment is taken from: which session it is and what's left. */
export async function getAppointmentPass(appt: Pick<Appointment, 'id' | 'passId'>): Promise<AppointmentPass | null> {
  if (!appt.passId) return null;
  const db = getAdminDb();
  const [passSnap, apptsSnap] = await Promise.all([
    db.collection('passes').doc(appt.passId).get(),
    db.collection('appointments').where('passId', '==', appt.passId).get(),
  ]);
  if (!passSnap.exists) return null;
  const p = passSnap.data() as ServicePass;
  const appts = apptsSnap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Appointment, 'id'>) }));
  return {
    passId: appt.passId,
    name: p.bundleName,
    nameEs: p.bundleNameEs,
    price: p.price,
    session: sessionNumber(appts, appt.id),
    ...passUsage(p.sessions, appts),
  };
}

/**
 * Active practitioners' time off, one entry per day the studio is open, from
 * `startDate` to `endDate` (inclusive; omit for no end).
 */
export async function listBlockedTimes(filters: {
  startDate: string;
  endDate?: string;
  staffId?: string;
}): Promise<BlockedTime[]> {
  const [staff, settings] = await Promise.all([listStaff(true), getStudioSettings()]);
  const scoped = filters.staffId ? staff.filter((s) => s.id === filters.staffId) : staff;
  return expandTimeOff(scoped, filters.startDate, filters.endDate ?? null, (d) =>
    Boolean(settings.businessHours?.[weekdayOf(d)])
  );
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

/** A day's full slot list, each candidate marked available or not. */
export interface DaySlotsResult {
  serviceId: string;
  serviceName: string;
  date: string;
  durationMinutes: number;
  slots: FixedSlot[];
}

/**
 * Evaluate every candidate slot for a service on a date, returning each with an
 * `available` flag and (for the bookable ones) its free staff/rooms.
 *
 * All services share one grid of start times across business hours (the studio's
 * slot interval). What differs per service is how long each booking blocks —
 * `blockMinutes` when set, otherwise the treatment duration — so a slot must
 * start by closing, finish within the after-hours allowance, and not collide
 * with existing bookings, time off, or a busy room.
 */
async function evaluateDay(input: {
  serviceId: string;
  date: string;
  staffId?: string;
  /** Backoffice: past dates and times are fair game (backfilling), no lead time. */
  allowPast?: boolean;
  /** Leave this appointment out, so editing one doesn't clash with itself. */
  ignoreAppointmentId?: string;
}): Promise<DaySlotsResult | { error: string }> {
  const service = await getService(input.serviceId);
  if (!service) return { error: `No service found for "${input.serviceId}".` };
  // A pass is booked as a session of its treatment.
  const treatment = await treatmentOf(service);
  if (!treatment) return { error: `"${service.name}" is a pack for a treatment that no longer exists.` };

  // Calendar block length can exceed the treatment's display duration.
  const duration = treatment.blockMinutes || treatment.durationMinutes;
  const weekday = weekdayOf(input.date);
  const settings = await getStudioSettings();

  const base = {
    serviceId: service.id,
    serviceName: service.name,
    date: input.date,
    durationMinutes: duration,
  };
  const empty = { ...base, slots: [] as FixedSlot[] };

  // Booking window: not before the opening date (or today, whichever is later),
  // no dates beyond maxAdvanceDays, studio open. The backoffice may go back in time.
  const now = malagaNow();
  const earliestDate = now.date > BOOKING_OPENS_DATE ? now.date : BOOKING_OPENS_DATE;
  const maxDate = addDaysStr(now.date, settings.booking.maxAdvanceDays);
  if ((!input.allowPast && input.date < earliestDate) || input.date > maxDate) return empty;

  const bh = settings.businessHours?.[weekday] ?? null;
  if (!bh) return empty;

  let staffList = await getServiceStaff(service.id);
  if (input.staffId) staffList = staffList.filter((s) => s.id === input.staffId);

  const rooms = (await listRooms(true)).filter(
    (r) => !treatment.roomType || r.type === treatment.roomType
  );

  const dayAppts = (await listAppointments({ date: input.date }))
    .filter((a) => ACTIVE_STATUSES.includes(a.status) && a.id !== input.ignoreAppointmentId)
    .map((a) => ({
      staffId: a.staffId,
      roomId: a.roomId,
      appointmentTime: a.appointmentTime,
      durationMinutes: a.durationMinutes,
    }));

  const earliestMinutes =
    input.date === now.date && !input.allowPast
      ? now.minutes + settings.booking.minLeadHours * 60
      : 0;

  const afterHoursMinutes =
    settings.booking.afterHoursMinutes ?? DEFAULT_STUDIO_SETTINGS.booking.afterHoursMinutes;

  // Every service uses the same grid of start times within business hours; the
  // service's own block length decides how much each booking occupies. Every
  // candidate is returned with an availability flag so the UI can grey out
  // times that are already taken.
  const slots: FixedSlot[] = computeFixedSlots({
    candidateTimes: gridTimes(bh, duration, settings.booking.slotIntervalMinutes, afterHoursMinutes),
    duration,
    bufferMinutes: settings.booking.bufferMinutes ?? 0,
    earliestMinutes,
    date: input.date,
    weekday,
    respectStaffHours: true,
    afterHours: { close: timeToMinutes(bh.close), minutes: afterHoursMinutes },
    staff: staffList.map((s) => ({ id: s.id, workingHours: s.workingHours, timeOff: s.timeOff })),
    rooms: rooms.map((r) => ({ id: r.id })),
    dayAppointments: dayAppts,
  });

  return { ...base, slots };
}

/**
 * Bookable start times for a service on a date (only the free slots), each with
 * its assignable staff/rooms. Used for booking creation and admin scheduling.
 */
export async function findAvailability(input: {
  serviceId: string;
  date: string;
  staffId?: string;
}): Promise<AvailabilityResult | { error: string }> {
  const res = await evaluateDay(input);
  if ('error' in res) return res;
  return {
    serviceId: res.serviceId,
    serviceName: res.serviceName,
    date: res.date,
    durationMinutes: res.durationMinutes,
    slots: res.slots
      .filter((s) => s.available)
      .map((s) => ({ time: s.time, staffIds: s.staffIds, roomIds: s.roomIds })),
  };
}

/**
 * Every candidate slot for a service on a date with an availability flag — for
 * the month-calendar UIs (public and backoffice), which show both open and
 * blocked times.
 */
export async function findDaySlots(input: {
  serviceId: string;
  date: string;
  staffId?: string;
  allowPast?: boolean;
  ignoreAppointmentId?: string;
}): Promise<DaySlotsResult | { error: string }> {
  return evaluateDay(input);
}

/**
 * Dates within the booking window that are fully closed — i.e. every active
 * practitioner has a whole-day time off. Used to grey them out in the calendar.
 */
export async function getFullyBlockedDates(): Promise<string[]> {
  const staff = await listStaff(true);
  if (staff.length === 0) return [];

  const settings = await getStudioSettings();
  const now = malagaNow();
  const start = now.date > BOOKING_OPENS_DATE ? now.date : BOOKING_OPENS_DATE;
  const end = addDaysStr(now.date, settings.booking.maxAdvanceDays);

  // Full-day-off dates per practitioner, clamped to the window.
  const perStaff = staff.map((s) => {
    const set = new Set<string>();
    (s.timeOff ?? []).forEach((t) => {
      if (t.start && t.end) return; // partial day — doesn't close the whole day
      const last = t.endDate || t.date;
      let d = t.date;
      for (let i = 0; d <= last && d <= end && i < 400; i++) {
        if (d >= start) set.add(d);
        d = addDaysStr(d, 1);
      }
    });
    return set;
  });

  // A date is fully closed only when every active practitioner is off that day.
  const [first, ...rest] = perStaff;
  return [...first].filter((d) => rest.every((s) => s.has(d))).sort();
}

// ── Appointment writes (transactional conflict guard) ────────────────────────────

export interface CreateAppointmentInput {
  serviceId: string;
  date: string;
  time: string;
  staffId: string;
  roomId: string;
  clientName: string;
  /** May be empty for a backoffice booking; confirmations then skip email. */
  clientEmail: string;
  /** May be empty for a backoffice booking; confirmations then skip SMS. */
  clientPhone: string;
  /** An existing customer to link, when the caller already knows it. */
  customerId?: string;
  notes?: string;
  /** How the booking was made; defaults to 'agent'. */
  source?: 'online' | 'walk-in' | 'agent';
  /** Defaults to 'confirmed'; a backfilled past visit is saved as 'completed'. */
  status?: AppointmentStatus;
  /** Send the client confirmation and staff alert; defaults to true. */
  notify?: boolean;
  /** Language the client booked in; notifications are sent in it. */
  locale?: 'en' | 'es';
}

/** The pass a new booking was taken from (or opened). */
export interface PassUse {
  passId: string;
  name: string;
  nameEs?: string;
  /** Which session of the pass this booking is. */
  session: number;
  sessions: number;
  /** Price of the whole pass, paid at the studio. */
  price: number;
  /** True when this booking bought the pass. */
  opened: boolean;
}

export type WriteResult =
  | { success: true; id: string; pass?: PassUse }
  | { success: false; error: string; conflicts?: { staff?: boolean; room?: boolean } };

/** Appointments taken from a pass, read inside a transaction. */
async function passAppointments(tx: Transaction, passId: string) {
  const snap = await tx.get(getAdminDb().collection('appointments').where('passId', '==', passId));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Appointment, 'id'>) }));
}

class ConflictError extends Error {
  constructor(public staff: boolean, public room: boolean) {
    super('Slot conflict');
  }
}

export async function createAppointment(input: CreateAppointmentInput): Promise<WriteResult> {
  const db = getAdminDb();

  const booked = await getService(input.serviceId);
  if (!booked) return { success: false, error: `No service found for "${input.serviceId}".` };
  // Booking a pass books its first session; the appointment is for the treatment.
  const service = await treatmentOf(booked);
  if (!service) {
    return { success: false, error: `"${booked.name}" is a pack for a treatment that no longer exists.` };
  }
  const bundle = booked.bundle ? booked : null;

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

  // Reserve the calendar block (may exceed the treatment's display duration).
  const blockMinutes = service.blockMinutes || service.durationMinutes;
  const start = timeToMinutes(input.time);
  const end = start + blockMinutes;
  const bufferMinutes = (await getStudioSettings()).booking.bufferMinutes ?? 0;

  // Link/refresh the customer record before the transaction.
  const customerId = await upsertCustomerForAppointment({
    name: input.clientName,
    email: input.clientEmail,
    phone: input.clientPhone,
    appointmentDate: input.date,
    customerId: input.customerId,
  });

  const newRef = db.collection('appointments').doc();
  const newPassRef = bundle ? db.collection('passes').doc() : null;
  let pass: PassUse | undefined;

  try {
    await db.runTransaction(async (tx) => {
      pass = undefined; // the transaction may retry
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
        bufferMinutes,
      });
      if (staffClash || roomClash) throw new ConflictError(staffClash, roomClash);

      // Which pass this session comes from: a new one when buying the pass,
      // otherwise the client's oldest pass for this treatment with a session free.
      const newAppt = { id: newRef.id, status: input.status ?? ('confirmed' as AppointmentStatus), appointmentDate: input.date, appointmentTime: input.time };
      if (bundle && newPassRef) {
        pass = {
          passId: newPassRef.id,
          name: bundle.name,
          nameEs: bundle.nameEs,
          session: 1,
          sessions: bundle.bundle!.sessions,
          price: bundle.price,
          opened: true,
        };
      } else if (customerId) {
        const passesSnap = await tx.get(
          db.collection('passes').where('customerId', '==', customerId).where('serviceId', '==', service.id)
        );
        const passes = passesSnap.docs
          .map((d) => ({ id: d.id, ...(d.data() as Omit<ServicePass, 'id'>) }))
          .sort((a, b) => a.createdAt.toMillis() - b.createdAt.toMillis());
        for (const p of passes) {
          const appts = await passAppointments(tx, p.id);
          if (passUsage(p.sessions, appts).remaining === 0) continue;
          pass = {
            passId: p.id,
            name: p.bundleName,
            nameEs: p.bundleNameEs,
            session: sessionNumber([...appts, newAppt], newRef.id) ?? appts.length + 1,
            sessions: p.sessions,
            price: p.price,
            opened: false,
          };
          break;
        }
      }

      const now = Timestamp.now();
      if (bundle && newPassRef && pass) {
        tx.set(newPassRef, {
          bundleId: bundle.id,
          bundleName: bundle.name,
          bundleNameEs: bundle.nameEs ?? '',
          serviceId: service.id,
          sessions: pass.sessions,
          price: bundle.price,
          customerId: customerId ?? null,
          clientName: input.clientName,
          createdAt: now,
        });
      }
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
        locale: input.locale ?? 'en',
        appointmentDate: input.date,
        appointmentTime: input.time,
        // Calendar occupancy — the block, so overlap checks reserve the full time.
        durationMinutes: blockMinutes,
        // The treatment's own length, for display.
        serviceMinutes: service.durationMinutes,
        notes: input.notes ?? '',
        // Bookings are auto-confirmed — no manual backoffice confirmation step.
        status: input.status ?? ('confirmed' as AppointmentStatus),
        // The price agreed now, so later price changes don't rewrite it: a pack
        // session's share of the pack, otherwise the treatment's payable price.
        price: pass ? sessionPrice(pass.price, pass.sessions) : payablePrice(service),
        ...(pass && { passId: pass.passId }),
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
  if (input.notify !== false) {
    try {
      const { notifyBookingCreated } = await import('@/lib/notifications/dispatch');
      await notifyBookingCreated(newRef.id);
    } catch {
      /* notifications are best-effort */
    }
  }
  if (input.status === 'completed') {
    try {
      const { awardLoyaltyForCompletion } = await import('@/actions/loyalty');
      await awardLoyaltyForCompletion(newRef.id);
    } catch {
      /* best-effort */
    }
  }

  const created = await getAppointment(newRef.id);
  if (created) await tellTeam({ kind: 'created', appt: created });

  return { success: true, id: newRef.id, ...(pass && { pass }) };
}

export interface UpdateAppointmentInput {
  date?: string;
  time?: string;
  staffId?: string;
  roomId?: string;
  /** Switch the treatment; the calendar block follows the new service. */
  serviceId?: string;
  status?: AppointmentStatus;
  notes?: string;
}

/** @param by Who made the change, for the team email when the request can't tell (e.g. "the client"). */
export async function updateAppointment(
  id: string,
  patch: UpdateAppointmentInput,
  by?: string
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

  const newService =
    patch.serviceId && patch.serviceId !== existing.serviceId ? await getService(patch.serviceId) : null;
  if (patch.serviceId && patch.serviceId !== existing.serviceId && !newService) {
    return { success: false, error: `No service found for "${patch.serviceId}".` };
  }
  const blockMinutes = newService
    ? newService.blockMinutes || newService.durationMinutes
    : existing.durationMinutes;

  const reschedules = Boolean(
    patch.date || patch.time || patch.staffId || patch.roomId || newService
  );
  const start = timeToMinutes(next.time);
  const end = start + blockMinutes;
  const bufferMinutes = (await getStudioSettings()).booking.bufferMinutes ?? 0;

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
          bufferMinutes,
        });
        if (staffClash || roomClash) throw new ConflictError(staffClash, roomClash);
      }

      tx.update(db.collection('appointments').doc(id), {
        appointmentDate: next.date,
        appointmentTime: next.time,
        ...(next.staffId !== undefined && { staffId: next.staffId }),
        ...(next.roomId !== undefined && { roomId: next.roomId }),
        ...(newService && {
          serviceId: newService.id,
          serviceName: newService.name,
          durationMinutes: blockMinutes,
          serviceMinutes: newService.durationMinutes,
        }),
        // A different treatment costs that treatment's price now, and is no
        // longer a session of a pack.
        ...(newService && { price: payablePrice(newService) }),
        ...(newService && existing.passId && { passId: FieldValue.delete() }),
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

  const updated = await getAppointment(id);
  if (updated) await tellTeam({ kind: 'updated', before: existing, after: updated }, by);

  // Both cancelling and rejecting notify the customer the appointment won't happen.
  const declined = status === 'cancelled' || status === 'rejected';
  const wasDeclined = existing.status === 'cancelled' || existing.status === 'rejected';
  if (declined && !wasDeclined) {
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

/** @param by Who deleted it, for the team email when the request can't tell. */
export async function deleteAppointment(id: string, by?: string): Promise<WriteResult> {
  let existing: Appointment | null;
  try {
    // Read it first: the team email describes what was deleted.
    existing = await getAppointment(id);
    await getAdminDb().collection('appointments').doc(id).delete();
  } catch (e) {
    console.error('deleteAppointment failed:', e);
    return { success: false, error: 'Failed to delete the appointment.' };
  }
  if (existing) await tellTeam({ kind: 'deleted', appt: existing }, by);
  return { success: true, id };
}
