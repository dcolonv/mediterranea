'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { format, isToday, isTomorrow, parseISO } from 'date-fns';
import { Badge, Button } from '@/components/ui';
import { APPOINTMENT_STATUSES } from '@mediterranea/shared/constants';
import { getUpcomingAppointments, type UpcomingData } from '@/actions/upcoming';
import { AppointmentModal } from '@/components/appointments';
import { WalkInBooking } from '@/components/scheduling/walk-in-booking';
import { BlockTimeDialog } from '@/components/scheduling/block-time-dialog';
import { mergeDayItems, dayItemKey, BLOCKED_STRIPES } from '@/components/scheduling/day-items';
import type { BlockedTime } from '@/lib/agent/availability';
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
  const [booking, setBooking] = useState(false);
  const [blocking, setBlocking] = useState(false);
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

  // Each day's bookings and blocked time together, soonest day first.
  const days = useMemo(() => {
    const byDate = new Map<string, { appts: Appointment[]; blocks: BlockedTime[] }>();
    const dayOf = (date: string) => {
      let day = byDate.get(date);
      if (!day) byDate.set(date, (day = { appts: [], blocks: [] }));
      return day;
    };
    for (const a of visible) dayOf(a.appointmentDate).appts.push(a);
    for (const b of upcoming?.blocks ?? []) dayOf(b.date).blocks.push(b);
    return [...byDate.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, { appts, blocks }]) => ({
        date,
        apptCount: appts.length,
        blockCount: blocks.length,
        items: mergeDayItems(appts, blocks),
      }));
  }, [visible, upcoming]);

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
        {cancelledCount > 0 && (
          <button
            type="button"
            onClick={() => setShowCancelled((v) => !v)}
            className="ml-auto cursor-pointer text-xs uppercase tracking-wider text-white-50 transition-colors hover:text-white"
          >
            {showCancelled ? 'Hide' : 'Show'} cancelled ({cancelledCount})
          </button>
        )}
        {/* On phones the main action gets a full-width row of its own. */}
        <div
          className={`grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:gap-3 ${
            cancelledCount > 0 ? '' : 'sm:ml-auto'
          }`}
        >
          <Button
            variant="elegant"
            size="sm"
            onClick={() => setBooking(true)}
            className="col-span-2 whitespace-nowrap sm:order-last"
          >
            + New Appointment
          </Button>
          <Button variant="outline" size="sm" onClick={load} className="whitespace-nowrap">
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={() => setBlocking(true)} className="whitespace-nowrap">
            + Block Time
          </Button>
        </div>
      </div>

      {days.length === 0 ? (
        <div className="border border-white-10 bg-dark-800 p-12 text-center text-white-50">
          Nothing booked yet.
        </div>
      ) : (
        <div className="space-y-8">
          {days.map(({ date, apptCount, blockCount, items }) => (
            <div key={date}>
              <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h2 className="font-serif text-xl text-white">{dayLabel(date)}</h2>
                <span className="text-sm text-white-50">
                  {format(parseISO(date), 'd MMMM yyyy')}
                </span>
                <span className="ml-auto text-xs text-white-30">
                  {[
                    apptCount > 0 && `${apptCount} ${apptCount === 1 ? 'appointment' : 'appointments'}`,
                    blockCount > 0 && `${blockCount} blocked`,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
              </div>

              <div className="border border-white-10 bg-dark-800">
                {items.map((item) => {
                  if (item.kind === 'block') {
                    return (
                      <BlockedRow
                        key={dayItemKey(item)}
                        block={item.block}
                        staffName={staffName(item.block.staffId)}
                      />
                    );
                  }
                  const apt = item.apt;
                  const dimmed = !LIVE.has(apt.status);
                  return (
                    <button
                      key={apt.id}
                      onClick={() => setSelected(apt)}
                      className={`flex w-full cursor-pointer items-center gap-3 border-b border-white-10 p-3 text-left transition-colors last:border-b-0 hover:bg-white-10 sm:gap-4 sm:p-4 ${
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
                        <Badge variant={apt.status} className="mt-2 sm:hidden">
                          {APPOINTMENT_STATUSES[apt.status].label}
                        </Badge>
                      </div>
                      {/* Beside the details on wider screens; under them on phones, where it would squeeze the text. */}
                      <Badge variant={apt.status} className="hidden sm:inline-flex">
                        {APPOINTMENT_STATUSES[apt.status].label}
                      </Badge>
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
      {booking && (
        <WalkInBooking
          services={upcoming.services}
          staff={upcoming.staff}
          rooms={upcoming.rooms}
          initialDate={upcoming.today}
          onClose={() => setBooking(false)}
          onBooked={load}
        />
      )}
      {blocking && (
        <BlockTimeDialog
          staff={upcoming.staff}
          initialDate={upcoming.today}
          onClose={() => setBlocking(false)}
          onSaved={load}
        />
      )}
    </div>
  );
}

/** Time a practitioner blocked off, laid out like an appointment row. */
function BlockedRow({ block, staffName }: { block: BlockedTime; staffName?: string }) {
  return (
    <div
      className={`flex w-full items-center gap-3 border-b border-white-10 p-3 last:border-b-0 sm:gap-4 sm:p-4 ${BLOCKED_STRIPES}`}
    >
      <div className="w-16 shrink-0 text-white-50">
        <div className="text-sm font-medium">{block.start ?? 'All day'}</div>
        {block.end && <div className="text-[10px] text-white-30">until {block.end}</div>}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-white-70">{block.reason || 'Time off'}</div>
        {staffName && <div className="truncate text-[11px] text-white-30">{staffName}</div>}
      </div>
      <Badge>Blocked</Badge>
    </div>
  );
}
