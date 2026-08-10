'use server';

import { startOfWeek, endOfWeek, format } from 'date-fns';
import * as data from '@/lib/agent/data';
import type { Appointment, Service, Staff, Room } from '@mediterranea/shared/types';

function todayInMalaga(): string {
  // The studio operates in Europe/Madrid; anchor "today" there.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Madrid',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

export interface DashboardMetrics {
  todayTotal: number;
  todayCompleted: number;
  todayCheckedIn: number;
  pendingUpcoming: number;
  weekTotal: number;
}

export interface DashboardData {
  today: string;
  todayAppointments: Appointment[];
  metrics: DashboardMetrics;
  services: Service[];
  staff: Staff[];
  rooms: Room[];
}

export async function getDashboard(): Promise<
  { success: true; data: DashboardData } | { success: false; error: string }
> {
  try {
    const today = todayInMalaga();
    const anchor = new Date(`${today}T00:00:00`);
    const weekStart = format(startOfWeek(anchor, { weekStartsOn: 1 }), 'yyyy-MM-dd');
    const weekEnd = format(endOfWeek(anchor, { weekStartsOn: 1 }), 'yyyy-MM-dd');

    const [todayAppts, weekAppts, pending, services, staff, rooms] = await Promise.all([
      data.listAppointments({ date: today }),
      data.listAppointments({ startDate: weekStart, endDate: weekEnd }),
      data.listAppointments({ startDate: today, status: 'pending' }),
      data.listServices(false),
      data.listStaff(true),
      data.listRooms(true),
    ]);

    const active = (a: Appointment) => a.status !== 'cancelled' && a.status !== 'no-show';

    const metrics: DashboardMetrics = {
      todayTotal: todayAppts.filter(active).length,
      todayCompleted: todayAppts.filter((a) => a.status === 'completed').length,
      todayCheckedIn: todayAppts.filter((a) => a.status === 'checked-in').length,
      pendingUpcoming: pending.length,
      weekTotal: weekAppts.filter(active).length,
    };

    return {
      success: true,
      data: {
        today,
        todayAppointments: todayAppts,
        metrics,
        services: services as Service[],
        staff: staff as Staff[],
        rooms: rooms as Room[],
      },
    };
  } catch (error) {
    console.error('Error loading dashboard:', error);
    return { success: false, error: 'Failed to load the dashboard.' };
  }
}
