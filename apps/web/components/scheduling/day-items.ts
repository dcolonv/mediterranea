import type { BlockedTime } from '@/lib/agent/availability';
import type { Appointment } from '@mediterranea/shared/types';

/** One entry in a day's schedule: a booking, or time a practitioner blocked off. */
export type DayItem =
  | { kind: 'appt'; time: string; apt: Appointment }
  | { kind: 'block'; time: string; block: BlockedTime };

/** Diagonal stripes, in a faint tint of the text colour, that mark blocked time apart from bookings. */
export const BLOCKED_STRIPES =
  'bg-[repeating-linear-gradient(135deg,transparent_0_6px,color-mix(in_srgb,var(--white)_6%,transparent)_6px_12px)]';

export const blockTimeLabel = (b: BlockedTime) => (b.start ? `${b.start}–${b.end}` : 'All day');

export const dayItemKey = (item: DayItem) => (item.kind === 'appt' ? item.apt.id : item.block.id);

/**
 * One day's appointments and blocks in time order. Blocks go first, so a whole
 * day off (no start time) leads the list and wins ties.
 */
export function mergeDayItems(appointments: Appointment[], blocks: BlockedTime[]): DayItem[] {
  return [
    ...blocks.map((block): DayItem => ({ kind: 'block', time: block.start ?? '', block })),
    ...appointments.map((apt): DayItem => ({ kind: 'appt', time: apt.appointmentTime, apt })),
  ].sort((a, b) => a.time.localeCompare(b.time));
}
