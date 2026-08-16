'use server';

import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, format } from 'date-fns';
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
  weekRevenue: number;
  monthRevenue: number;
  topTreatment: string | null;
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
    const monthStart = format(startOfMonth(anchor), 'yyyy-MM-dd');
    const monthEnd = format(endOfMonth(anchor), 'yyyy-MM-dd');

    const [todayAppts, weekAppts, monthAppts, pending, services, staff, rooms] = await Promise.all([
      data.listAppointments({ date: today }),
      data.listAppointments({ startDate: weekStart, endDate: weekEnd }),
      data.listAppointments({ startDate: monthStart, endDate: monthEnd }),
      data.listAppointments({ startDate: today, status: 'pending' }),
      data.listServices(false),
      data.listStaff(true),
      data.listRooms(true),
    ]);

    const active = (a: Appointment) => a.status !== 'cancelled' && a.status !== 'no-show';
    const priceOf = new Map((services as Service[]).map((s) => [s.id, s.price]));
    const revenueOf = (list: Appointment[]) =>
      list.filter((a) => a.status === 'completed').reduce((sum, a) => sum + (priceOf.get(a.serviceId) ?? 0), 0);

    // Top treatment this month (non-cancelled).
    const counts = new Map<string, number>();
    for (const a of monthAppts) {
      if (a.status === 'cancelled') continue;
      counts.set(a.serviceName, (counts.get(a.serviceName) ?? 0) + 1);
    }
    const topTreatment = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

    const metrics: DashboardMetrics = {
      todayTotal: todayAppts.filter(active).length,
      todayCompleted: todayAppts.filter((a) => a.status === 'completed').length,
      todayCheckedIn: todayAppts.filter((a) => a.status === 'checked-in').length,
      pendingUpcoming: pending.length,
      weekTotal: weekAppts.filter(active).length,
      weekRevenue: revenueOf(weekAppts),
      monthRevenue: revenueOf(monthAppts),
      topTreatment,
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
