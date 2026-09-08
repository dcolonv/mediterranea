'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { format, isToday, isTomorrow, parseISO } from 'date-fns';
import { Badge, Button } from '@/components/ui';
import { APPOINTMENT_STATUSES } from '@mediterranea/shared/constants';
import { getUpcomingAppointments, type UpcomingData } from '@/actions/upcoming';
import { AppointmentModal } from '@/components/appointments';
import type { Appointment, AppointmentStatus } from '@mediterranea/shared/types';

/** Statuses that still represent a booking the studio expects to honour. */
const LIVE = new Set<AppointmentStatus>(['pending', 'confirmed', 'checked-in', 'completed']);

/** "Today" and "Tomorrow" read faster than the date when scanning the list. */
function dayLabel(date: string): string {
  const d = parseISO(date);
  if (isToday(d)) return 'Today';
  if (isTomorrow(d)) return 'Tomorrow';
  return format(d, 'EEEE');
}

export function BackofficeUpcoming() {
  const [upcoming, setUpcoming] = useState<UpcomingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Appointment | null>(null);
  const [showCancelled, setShowCancelled] = useState(false);

  const load = useCallback(async () => {
    const res = await getUpcomingAppointments();
    if (res.success) setUpcoming(res.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const staffName = (id?: string) => upcoming?.staff.find((s) => s.id === id)?.name;
  const roomName = (id?: string) => upcoming?.rooms.find((r) => r.id === id)?.name;

  const visible = useMemo(
    () => (upcoming?.appointments ?? []).filter((a) => showCancelled || LIVE.has(a.status)),
    [upcoming, showCancelled]
  );

  // The action already returns them soonest first, so grouping in order is enough.
  const days = useMemo(() => {
    const byDate = new Map<string, Appointment[]>();
    for (const a of visible) {
      const list = byDate.get(a.appointmentDate);
      if (list) list.push(a);
      else byDate.set(a.appointmentDate, [a]);
    }
    return [...byDate.entries()];
  }, [visible]);

  const cancelledCount = (upcoming?.appointments.length ?? 0) - (upcoming?.appointments ?? []).filter((a) => LIVE.has(a.status)).length;

  if (loading) {
    return <div className="py-24 text-center text-white-50">Loading…</div>;
  }

  if (!upcoming) {
    return (
      <div className="border border-white-10 bg-dark-800 p-12 text-center text-white-50">
        Couldn’t load the appointments.{' '}
        <button onClick={load} className="cursor-pointer text-gold hover:underline">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <span className="text-sm text-white-50">
          {visible.length} {visible.length === 1 ? 'appointment' : 'appointments'} ahead
        </span>
        <div className="ml-auto flex items-center gap-3">
          {cancelledCount > 0 && (
            <button
              type="button"
              onClick={() => setShowCancelled((v) => !v)}
              className="cursor-pointer text-xs uppercase tracking-wider text-white-50 transition-colors hover:text-white"
            >
              {showCancelled ? 'Hide' : 'Show'} cancelled ({cancelledCount})
            </button>
          )}
          <Button variant="outline" size="sm" onClick={load}>
            Refresh
          </Button>
        </div>
      </div>

      {days.length === 0 ? (
        <div className="border border-white-10 bg-dark-800 p-12 text-center text-white-50">
          Nothing booked yet.
        </div>
      ) : (
        <div className="space-y-8">
          {days.map(([date, appts]) => (
            <div key={date}>
              <div className="mb-3 flex items-baseline gap-3">
                <h2 className="font-serif text-xl text-white">{dayLabel(date)}</h2>
                <span className="text-sm text-white-50">
                  {format(parseISO(date), 'd MMMM yyyy')}
                </span>
                <span className="ml-auto text-xs text-white-30">
                  {appts.length} {appts.length === 1 ? 'appointment' : 'appointments'}
                </span>
              </div>

              <div className="border border-white-10 bg-dark-800">
                {appts.map((apt) => {
                  const dimmed = !LIVE.has(apt.status);
                  return (
                    <button
                      key={apt.id}
                      onClick={() => setSelected(apt)}
                      className={`flex w-full cursor-pointer items-center gap-4 border-b border-white-10 p-4 text-left transition-colors last:border-b-0 hover:bg-white-10 ${
                        dimmed ? 'opacity-50' : ''
                      }`}
                    >
                      <div className="w-16 shrink-0 text-gold">
                        <div className="text-sm font-medium">{apt.appointmentTime}</div>
                        <div className="text-[10px] text-white-30">{apt.durationMinutes} min</div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-white">{apt.clientName}</div>
                        <div className="truncate text-sm text-white-50">{apt.serviceName}</div>
                        {(staffName(apt.staffId) || roomName(apt.roomId)) && (
                          <div className="truncate text-[11px] text-white-30">
                            {[staffName(apt.staffId), roomName(apt.roomId)]
                              .filter(Boolean)
                              .join(' · ')}
                          </div>
                        )}
                      </div>
                      <Badge variant={apt.status}>{APPOINTMENT_STATUSES[apt.status].label}</Badge>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {selected && (
        <AppointmentModal
          appointment={selected}
          staff={upcoming.staff}
          rooms={upcoming.rooms}
          onClose={() => setSelected(null)}
          onUpdate={load}
        />
      )}
    </div>
  );
}
