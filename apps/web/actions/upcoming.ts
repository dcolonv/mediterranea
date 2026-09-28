'use server';

import * as data from '@/lib/agent/data';
import { serializeDoc } from '@/lib/firebase/serialize';
import type { BlockedTime } from '@/lib/agent/availability';
import type { Appointment, Service, Staff, Room } from '@mediterranea/shared/types';

/** The studio operates in Europe/Madrid; anchor "today" there, not on the server's clock. */
function todayInMalaga(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Madrid',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

export interface UpcomingData {
  /** Today in the studio's timezone (YYYY-MM-DD), so the client can label "Today". */
  today: string;
  /** Everything from today onwards, soonest first. */
  appointments: Appointment[];
  /** Practitioners' time off from today onwards, soonest first. */
  blocks: BlockedTime[];
  /** Active treatments, for booking a new appointment from the page. */
  services: Service[];
  staff: Staff[];
  rooms: Room[];
}

/**
 * Every appointment from today onwards, ordered soonest to latest.
 *
 * Today is kept whole rather than trimmed to the current hour: the morning's
 * appointments are still what the studio is working through, and dropping them
 * mid-afternoon would make the list look wrong.
 */
export async function getUpcomingAppointments(): Promise<
  { success: true; data: UpcomingData } | { success: false; error: string }
> {
  try {
    const today = todayInMalaga();

    // listAppointments already orders by date then time, ascending.
    const [appointments, blocks, services, staff, rooms] = await Promise.all([
      data.listAppointments({ startDate: today }),
      data.listBlockedTimes({ startDate: today }),
      data.listServices(false),
      data.listStaff(true),
      data.listRooms(true),
    ]);

    return {
      success: true,
      data: {
        today,
        appointments: appointments.map((a) => serializeDoc(a)),
        blocks,
        services: (services as Service[]).map((s) => serializeDoc(s)),
        staff: (staff as Staff[]).map((s) => serializeDoc(s)),
        rooms: (rooms as Room[]).map((r) => serializeDoc(r)),
      },
    };
  } catch (error) {
    console.error('Error loading upcoming appointments:', error);
    return { success: false, error: 'Failed to load upcoming appointments.' };
  }
}
