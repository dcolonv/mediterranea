/**
 * Pure pass bookkeeping: how many of a pass's sessions are spent, booked or
 * still free, worked out from the appointments linked to it. Nothing is stored
 * as a counter, so cancelling or deleting a session gives it back by itself.
 */
import type { AppointmentStatus } from '@mediterranea/shared/types';

export interface PassAppt {
  id: string;
  status: AppointmentStatus;
  appointmentDate: string;
  appointmentTime: string;
}

/** Statuses that spend a session. A no-show spends it too; cancelled and rejected give it back. */
const SPENT: AppointmentStatus[] = ['completed', 'no-show'];
/** Statuses that hold a session for an upcoming visit. */
const HELD: AppointmentStatus[] = ['pending', 'confirmed', 'checked-in'];

export interface PassUsage {
  sessions: number;
  /** Completed or no-show. */
  used: number;
  /** Booked and still to come. */
  booked: number;
  /** Free to book. */
  remaining: number;
}

export function passUsage(sessions: number, appts: PassAppt[]): PassUsage {
  const used = appts.filter((a) => SPENT.includes(a.status)).length;
  const booked = appts.filter((a) => HELD.includes(a.status)).length;
  return { sessions, used, booked, remaining: Math.max(0, sessions - used - booked) };
}

/**
 * Which session of its pass an appointment is (1-based, in date order), or
 * null when it no longer counts (cancelled or rejected).
 */
export function sessionNumber(appts: PassAppt[], apptId: string): number | null {
  const counted = appts
    .filter((a) => SPENT.includes(a.status) || HELD.includes(a.status))
    .sort((a, b) =>
      `${a.appointmentDate} ${a.appointmentTime}`.localeCompare(`${b.appointmentDate} ${b.appointmentTime}`)
    );
  const i = counted.findIndex((a) => a.id === apptId);
  return i === -1 ? null : i + 1;
}

/** Each session's share of the pass price, to the cent. */
export function sessionPrice(price: number, sessions: number): number {
  return Math.round((price / sessions) * 100) / 100;
}
