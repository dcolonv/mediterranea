/**
 * Pure availability + conflict logic — no Firestore, no I/O. The data layer
 * (`data.ts`) fetches records and delegates the actual computation here so it can
 * be unit-tested independently of the database and the LLM.
 */
import type { Weekday, DayHours } from '@mediterranea/shared/types';

export const WEEKDAYS: Weekday[] = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
];

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + (m || 0);
}

export function minutesToTime(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function rangesOverlap(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && bStart < aEnd;
}

export function weekdayOf(date: string): Weekday {
  return WEEKDAYS[new Date(`${date}T00:00:00`).getDay()];
}

export function addDaysStr(date: string, days: number): string {
  // UTC arithmetic so the result never shifts by timezone offset.
  const [y, m, d] = date.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

export interface AvailTimeOff {
  date: string;
  start?: string;
  end?: string;
}

export interface AvailStaff {
  id: string;
  workingHours?: Partial<Record<Weekday, DayHours | null>>;
  timeOff?: AvailTimeOff[];
}

export interface AvailRoom {
  id: string;
}

export interface AvailAppt {
  id?: string;
  staffId?: string;
  roomId?: string;
  appointmentTime: string;
  durationMinutes: number;
}

/** True when a staff member is off during [start, end) on `date`. */
export function staffOffAt(
  staff: AvailStaff,
  date: string,
  start: number,
  end: number
): boolean {
  if (!staff.timeOff) return false;
  return staff.timeOff.some((t) => {
    if (t.date !== date) return false;
    if (!t.start || !t.end) return true; // whole day off
    return rangesOverlap(start, end, timeToMinutes(t.start), timeToMinutes(t.end));
  });
}

export interface ComputeSlotsInput {
  date: string;
  weekday: Weekday;
  /** Service duration in minutes. */
  duration: number;
  /** Studio open/close for the weekday, or null when closed. */
  businessHours: DayHours | null;
  /** Slot grid granularity in minutes. */
  intervalMinutes: number;
  /** Cool-down/preparation gap required between consecutive appointments, in minutes. */
  bufferMinutes: number;
  /** Earliest bookable start (minutes since midnight); e.g. lead-time cutoff for today. */
  earliestMinutes: number;
  /** Staff already filtered to those qualified for the service. */
  staff: AvailStaff[];
  /** Rooms already filtered to active + matching required room type. */
  rooms: AvailRoom[];
  /** Same-day appointments in slot-occupying statuses. */
  dayAppointments: AvailAppt[];
}

export interface AvailabilitySlot {
  time: string;
  staffIds: string[];
  roomIds: string[];
}

/**
 * Compute bookable start times: for each grid slot that fits before closing and
 * respects the lead cutoff, intersect free qualified staff (within their hours,
 * not on time off, not already booked) with free rooms.
 */
export function computeSlots(input: ComputeSlotsInput): AvailabilitySlot[] {
  const { businessHours: bh, duration, intervalMinutes, bufferMinutes, earliestMinutes, weekday, date } = input;
  if (!bh) return [];

  const bhOpen = timeToMinutes(bh.open);
  const bhClose = timeToMinutes(bh.close);
  const slots: AvailabilitySlot[] = [];

  // A candidate [start, end) conflicts with an existing appointment when the
  // gap between them is smaller than the buffer. Expanding both ends by the
  // buffer turns that into a plain overlap test (symmetric gap enforcement).
  const clashesWithBuffer = (start: number, end: number, a: AvailAppt): boolean => {
    const aStart = timeToMinutes(a.appointmentTime);
    const aEnd = aStart + a.durationMinutes;
    return rangesOverlap(start, end + bufferMinutes, aStart, aEnd + bufferMinutes);
  };

  for (let start = bhOpen; start + duration <= bhClose; start += intervalMinutes) {
    const end = start + duration;
    if (start < earliestMinutes) continue;

    const freeStaff = input.staff
      .filter((s) => {
        const wh = s.workingHours?.[weekday];
        if (!wh) return false;
        if (start < timeToMinutes(wh.open) || end > timeToMinutes(wh.close)) return false;
        if (staffOffAt(s, date, start, end)) return false;
        const busy = input.dayAppointments.some(
          (a) => a.staffId === s.id && clashesWithBuffer(start, end, a)
        );
        return !busy;
      })
      .map((s) => s.id);

    const freeRooms = input.rooms
      .filter((r) => {
        const busy = input.dayAppointments.some(
          (a) => a.roomId === r.id && clashesWithBuffer(start, end, a)
        );
        return !busy;
      })
      .map((r) => r.id);

    if (freeStaff.length && freeRooms.length) {
      slots.push({ time: minutesToTime(start), staffIds: freeStaff, roomIds: freeRooms });
    }
  }

  return slots;
}

/**
 * Detect whether a target slot collides with existing appointments for the same
 * staff member or room. `ignoreId` excludes the appointment being updated.
 */
export function detectConflicts(
  existing: AvailAppt[],
  target: {
    start: number;
    end: number;
    staffId?: string;
    roomId?: string;
    ignoreId?: string;
    /** Cool-down gap required on either side of the appointment, in minutes. */
    bufferMinutes?: number;
  }
): { staffClash: boolean; roomClash: boolean } {
  let staffClash = false;
  let roomClash = false;
  const buffer = target.bufferMinutes ?? 0;
  for (const a of existing) {
    if (target.ignoreId && a.id === target.ignoreId) continue;
    const overlap = rangesOverlap(
      target.start,
      target.end + buffer,
      timeToMinutes(a.appointmentTime),
      timeToMinutes(a.appointmentTime) + a.durationMinutes + buffer
    );
    if (!overlap) continue;
    if (target.staffId && a.staffId === target.staffId) staffClash = true;
    if (target.roomId && a.roomId === target.roomId) roomClash = true;
  }
  return { staffClash, roomClash };
}
