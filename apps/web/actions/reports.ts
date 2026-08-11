'use server';

import * as data from '@/lib/agent/data';
import { addDaysStr } from '@/lib/agent/availability';
import type { Appointment } from '@mediterranea/shared/types';

export interface ReportData {
  rangeDays: number;
  startDate: string;
  endDate: string;
  revenue: number;
  counts: { total: number; completed: number; cancelled: number; noShow: number; upcoming: number };
  noShowRate: number; // 0..1
  popularTreatments: { name: string; count: number }[];
  staffPerformance: { name: string; completed: number; revenue: number }[];
  retention: { customersWithVisit: number; repeatCustomers: number; repeatRate: number };
}

function todayMalaga(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Madrid',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

export async function getReports(
  rangeDays = 30
): Promise<{ success: true; data: ReportData } | { success: false; error: string }> {
  try {
    const end = todayMalaga();
    const start = addDaysStr(end, -Math.max(1, rangeDays));

    const [appts, services, staff] = await Promise.all([
      data.listAppointments({ startDate: start, endDate: end }),
      data.listServices(true),
      data.listStaff(false),
    ]);

    const priceOf = new Map(services.map((s) => [s.id, s.price]));
    const staffName = new Map(staff.map((s) => [s.id, s.name]));

    const counts = { total: 0, completed: 0, cancelled: 0, noShow: 0, upcoming: 0 };
    let revenue = 0;
    const treatmentCounts = new Map<string, number>();
    const perStaff = new Map<string, { completed: number; revenue: number }>();

    for (const a of appts as Appointment[]) {
      counts.total++;
      if (a.status === 'completed') {
        counts.completed++;
        const price = priceOf.get(a.serviceId) ?? 0;
        revenue += price;
        if (a.staffId) {
          const s = perStaff.get(a.staffId) ?? { completed: 0, revenue: 0 };
          s.completed++;
          s.revenue += price;
          perStaff.set(a.staffId, s);
        }
      } else if (a.status === 'cancelled') counts.cancelled++;
      else if (a.status === 'no-show') counts.noShow++;
      else counts.upcoming++;

      if (a.status !== 'cancelled') {
        treatmentCounts.set(a.serviceName, (treatmentCounts.get(a.serviceName) ?? 0) + 1);
      }
    }

    const attended = counts.completed + counts.noShow;
    const noShowRate = attended > 0 ? counts.noShow / attended : 0;

    const popularTreatments = [...treatmentCounts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    const staffPerformance = [...perStaff.entries()]
      .map(([id, v]) => ({ name: staffName.get(id) ?? 'Unknown', completed: v.completed, revenue: v.revenue }))
      .sort((a, b) => b.revenue - a.revenue);

    // Retention (all-time): share of clients with a completed visit who returned.
    const allAppts = await data.listAppointments({});
    const completedByCustomer = new Map<string, number>();
    for (const a of allAppts as Appointment[]) {
      if (a.status !== 'completed') continue;
      const key = a.customerId || a.clientEmail;
      if (!key) continue;
      completedByCustomer.set(key, (completedByCustomer.get(key) ?? 0) + 1);
    }
    const customersWithVisit = completedByCustomer.size;
    const repeatCustomers = [...completedByCustomer.values()].filter((n) => n > 1).length;
    const repeatRate = customersWithVisit > 0 ? repeatCustomers / customersWithVisit : 0;

    return {
      success: true,
      data: {
        rangeDays,
        startDate: start,
        endDate: end,
        revenue,
        counts,
        noShowRate,
        popularTreatments,
        staffPerformance,
        retention: { customersWithVisit, repeatCustomers, repeatRate },
      },
    };
  } catch (error) {
    console.error('getReports failed:', error);
    return { success: false, error: 'Failed to build reports.' };
  }
}
