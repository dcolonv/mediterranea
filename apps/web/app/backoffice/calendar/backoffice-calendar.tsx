'use client';

import { useState, useEffect, useCallback, type ReactElement } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  addDays,
  subDays,
  isSameMonth,
  isToday,
  isSunday,
} from 'date-fns';
import { Button, Badge, Select } from '@/components/ui';
import { getSchedulingRefs, getCalendarAppointments, getCalendarBlocks } from '@/actions/scheduling';
import { APPOINTMENT_STATUSES } from '@mediterranea/shared/constants';
import { AppointmentModal } from '@/components/appointments';
import { WalkInBooking } from '@/components/scheduling/walk-in-booking';
import { BlockTimeDialog } from '@/components/scheduling/block-time-dialog';
import { BookingAssistant } from '@/components/scheduling/booking-assistant';
import {
  mergeDayItems,
  blockTimeLabel,
  dayItemKey,
  BLOCKED_STRIPES,
  type DayItem,
} from '@/components/scheduling/day-items';
import type { BlockedTime } from '@/lib/agent/availability';
import type { Appointment, Service, Staff, Room } from '@mediterranea/shared/types';

type View = 'day' | 'week' | 'month';
const WEEKDAY_HEADERS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const ymd = (d: Date) => format(d, 'yyyy-MM-dd');

export function BackofficeCalendar() {
  const [view, setView] = useState<View>('week');
  const [anchor, setAnchor] = useState(new Date());
  const [staffId, setStaffId] = useState('');
  const [roomId, setRoomId] = useState('');

  const [refs, setRefs] = useState<{ services: Service[]; staff: Staff[]; rooms: Room[] }>({
    services: [],
    staff: [],
    rooms: [],
  });
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [blocks, setBlocks] = useState<BlockedTime[]>([]);
  const [loading, setLoading] = useState(true);

  const [selected, setSelected] = useState<Appointment | null>(null);
  const [booking, setBooking] = useState(false);
  const [blocking, setBlocking] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);

  const staffName = (id?: string) => refs.staff.find((s) => s.id === id)?.name;
  const roomName = (id?: string) => refs.rooms.find((r) => r.id === id)?.name;

  // Visible range for the current view.
  const range = (() => {
    if (view === 'month') return { start: startOfMonth(anchor), end: endOfMonth(anchor) };
    if (view === 'week') {
      return { start: startOfWeek(anchor, { weekStartsOn: 1 }), end: endOfWeek(anchor, { weekStartsOn: 1 }) };
    }
    return { start: anchor, end: anchor };
  })();

  useEffect(() => {
    getSchedulingRefs().then((r) => {
      if (r.success) setRefs({ services: r.services, staff: r.staff, rooms: r.rooms });
    });
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const [res, blockRes] = await Promise.all([
      getCalendarAppointments({
        startDate: ymd(range.start),
        endDate: ymd(range.end),
        ...(staffId && { staffId }),
        ...(roomId && { roomId }),
      }),
      // Time off belongs to a practitioner, so the room filter doesn't hide it.
      getCalendarBlocks({
        startDate: ymd(range.start),
        endDate: ymd(range.end),
        ...(staffId && { staffId }),
      }),
    ]);
    if (res.success) setAppointments(res.data);
    if (blockRes.success) setBlocks(blockRes.data);
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ymd(range.start), ymd(range.end), staffId, roomId]);

  useEffect(() => {
    load();
  }, [load]);

  function shift(dir: -1 | 1) {
    if (view === 'month') setAnchor((a) => (dir === 1 ? addMonths(a, 1) : subMonths(a, 1)));
    else if (view === 'week') setAnchor((a) => (dir === 1 ? addWeeks(a, 1) : subWeeks(a, 1)));
    else setAnchor((a) => (dir === 1 ? addDays(a, 1) : subDays(a, 1)));
  }

  const forDay = (day: Date): DayItem[] =>
    mergeDayItems(
      appointments.filter((a) => a.appointmentDate === ymd(day)),
      blocks.filter((b) => b.date === ymd(day))
    );

  const rangeLabel =
    view === 'month'
      ? format(anchor, 'MMMM yyyy')
      : view === 'week'
        ? `${format(range.start, 'MMM d')} – ${format(range.end, 'MMM d, yyyy')}`
        : format(anchor, 'EEEE, MMMM d, yyyy');

  function AppointmentRow({ apt }: { apt: Appointment }) {
    return (
      <button
        onClick={() => setSelected(apt)}
        className="w-full text-left p-3 border border-white-10 hover:border-white-30 transition-colors"
      >
        <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
          <span className="text-sm font-medium text-gold">{apt.appointmentTime}</span>
          <Badge variant={apt.status}>{APPOINTMENT_STATUSES[apt.status].label}</Badge>
        </div>
        <p className="mt-1 text-sm text-white truncate">{apt.clientName}</p>
        <p className="text-xs text-white-50 truncate">{apt.serviceName}</p>
        {(staffName(apt.staffId) || roomName(apt.roomId)) && (
          <p className="mt-1 text-[11px] text-white-30 truncate">
            {[staffName(apt.staffId), roomName(apt.roomId)].filter(Boolean).join(' · ')}
          </p>
        )}
      </button>
    );
  }

  function BlockRow({ block }: { block: BlockedTime }) {
    return (
      <div className={`w-full p-3 border border-dashed border-white-30 ${BLOCKED_STRIPES}`}>
        <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
          <span className="whitespace-nowrap text-sm font-medium text-white-50">{blockTimeLabel(block)}</span>
          <Badge>Blocked</Badge>
        </div>
        <p className="mt-1 text-sm text-white-70 truncate">{block.reason || 'Time off'}</p>
        {staffName(block.staffId) && (
          <p className="mt-1 text-[11px] text-white-30 truncate">{staffName(block.staffId)}</p>
        )}
      </div>
    );
  }

  function ItemRow({ item }: { item: DayItem }) {
    return item.kind === 'appt' ? <AppointmentRow apt={item.apt} /> : <BlockRow block={item.block} />;
  }

  return (
    <div>
      {/* Toolbar: one row on desktop; stacked on phones, main action full width. */}
      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={() => shift(-1)} aria-label="Previous" className="px-3 sm:px-5">
              ‹
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setAnchor(new Date())} className="px-3 sm:px-5">
              Today
            </Button>
            <Button variant="ghost" size="sm" onClick={() => shift(1)} aria-label="Next" className="px-3 sm:px-5">
              ›
            </Button>
          </div>

          <span className="font-serif text-lg text-white">{rangeLabel}</span>

          <div className="flex w-full border border-white-10 sm:ml-auto sm:w-auto lg:ml-0">
            {(['day', 'week', 'month'] as View[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`flex-1 px-4 py-2 text-xs uppercase tracking-wider transition-colors sm:flex-none ${
                  view === v ? 'bg-gold text-charcoal' : 'text-white-50 hover:text-white'
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center lg:ml-auto">
          {/* Filters only earn their place with more than one practitioner or room. */}
          {(refs.staff.length > 1 || refs.rooms.length > 1) && (
            <div className="grid grid-cols-2 gap-3 sm:flex">
              {refs.staff.length > 1 && (
                <div className="sm:w-40">
                  <Select
                    id="cal-staff"
                    value={staffId}
                    onChange={(e) => setStaffId(e.target.value)}
                    options={[{ value: '', label: 'All staff' }, ...refs.staff.map((s) => ({ value: s.id, label: s.name }))]}
                  />
                </div>
              )}
              {refs.rooms.length > 1 && (
                <div className="sm:w-40">
                  <Select
                    id="cal-room"
                    value={roomId}
                    onChange={(e) => setRoomId(e.target.value)}
                    options={[{ value: '', label: 'All rooms' }, ...refs.rooms.map((r) => ({ value: r.id, label: r.name }))]}
                  />
                </div>
              )}
            </div>
          )}
          <div className="grid grid-cols-2 gap-2 sm:ml-auto sm:flex sm:gap-3">
            <Button
              variant="elegant"
              size="sm"
              onClick={() => setBooking(true)}
              className="col-span-2 whitespace-nowrap sm:order-last"
            >
              + New Appointment
            </Button>
            <Button variant="outline" size="sm" onClick={() => setAssistantOpen(true)} className="whitespace-nowrap">
              ✦ Assistant
            </Button>
            <Button variant="outline" size="sm" onClick={() => setBlocking(true)} className="whitespace-nowrap">
              + Block Time
            </Button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="py-24 text-center text-white-50">Loading…</div>
      ) : view === 'day' ? (
        <DayView day={anchor} rows={forDay(anchor)} />
      ) : view === 'week' ? (
        <WeekView start={range.start} forDay={forDay} onDayHeader={(d) => { setAnchor(d); setView('day'); }} ItemRow={ItemRow} />
      ) : (
        <MonthView anchor={anchor} appointments={appointments} blocks={blocks} onPickDay={(d) => { setAnchor(d); setView('day'); }} />
      )}

      {selected && (
        <AppointmentModal
          appointment={selected}
          staff={refs.staff}
          rooms={refs.rooms}
          onClose={() => setSelected(null)}
          onUpdate={load}
        />
      )}
      {booking && (
        <WalkInBooking
          services={refs.services}
          staff={refs.staff}
          rooms={refs.rooms}
          initialDate={ymd(view === 'month' ? new Date() : anchor)}
          onClose={() => setBooking(false)}
          onBooked={load}
        />
      )}
      {blocking && (
        <BlockTimeDialog
          staff={refs.staff}
          initialDate={ymd(view === 'month' ? new Date() : anchor)}
          initialStaffId={staffId}
          onClose={() => setBlocking(false)}
          onSaved={load}
        />
      )}
      {assistantOpen && (
        <BookingAssistant onClose={() => setAssistantOpen(false)} onMutated={load} />
      )}
    </div>
  );

  // ---- Inline view components (share AppointmentRow via closure) ----

  function DayView({ day, rows }: { day: Date; rows: DayItem[] }) {
    return (
      <div className="max-w-xl">
        {rows.length === 0 ? (
          <div className="border border-white-10 bg-dark-800 p-12 text-center text-white-50">
            No appointments on {format(day, 'MMMM d')}.
          </div>
        ) : (
          <div className="space-y-2">
            {rows.map((item) => (
              <ItemRow key={dayItemKey(item)} item={item} />
            ))}
          </div>
        )}
      </div>
    );
  }
}

// ---- Week view ----
function WeekView({
  start,
  forDay,
  onDayHeader,
  ItemRow,
}: {
  start: Date;
  forDay: (d: Date) => DayItem[];
  onDayHeader: (d: Date) => void;
  ItemRow: (props: { item: DayItem }) => ReactElement;
}) {
  const days = Array.from({ length: 6 }, (_, i) => addDays(start, i)); // Mon–Sat
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {days.map((day) => {
        const rows = forDay(day);
        return (
          <div key={day.toISOString()} className="border border-white-10 bg-dark-800">
            {/* A single line on phones ("MON 5"), stacked in the narrow columns above. */}
            <button
              onClick={() => onDayHeader(day)}
              className={`flex w-full items-baseline gap-2 border-b border-white-10 px-3 py-2 text-left hover:bg-white-10 sm:block sm:p-2 sm:text-center ${
                isToday(day) ? 'text-gold' : 'text-white-70'
              }`}
            >
              <span className="text-[10px] uppercase tracking-wider sm:block">{format(day, 'EEE')}</span>
              <span className="text-lg font-medium sm:block">{format(day, 'd')}</span>
            </button>
            <div className="space-y-2 p-2">
              {rows.length === 0 ? (
                <p className="py-2 text-center text-[11px] text-white-30 sm:py-4">—</p>
              ) : (
                rows.map((item) => (
                  <ItemRow key={dayItemKey(item)} item={item} />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---- Month view ----
function MonthView({
  anchor,
  appointments,
  blocks,
  onPickDay,
}: {
  anchor: Date;
  appointments: Appointment[];
  blocks: BlockedTime[];
  onPickDay: (d: Date) => void;
}) {
  const monthStart = startOfMonth(anchor);
  const monthEnd = endOfMonth(anchor);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const weeks: Date[][] = [];
  let cursor = gridStart;
  while (cursor <= gridEnd) {
    const week: Date[] = [];
    for (let i = 0; i < 7; i++) {
      if (!isSunday(cursor)) week.push(new Date(cursor));
      cursor = addDays(cursor, 1);
    }
    weeks.push(week);
  }

  const countFor = (day: Date) =>
    appointments.filter((a) => a.appointmentDate === format(day, 'yyyy-MM-dd')).length;
  const blocksFor = (day: Date) => blocks.filter((b) => b.date === format(day, 'yyyy-MM-dd'));

  return (
    <div className="border border-white-10 bg-dark-800">
      <div className="grid grid-cols-6 border-b border-white-10">
        {WEEKDAY_HEADERS.map((d) => (
          <div key={d} className="p-2 text-center text-xs font-medium tracking-wider uppercase text-white-30 sm:p-3">
            {d}
          </div>
        ))}
      </div>
      {weeks.map((week, wi) => (
        <div key={wi} className="grid grid-cols-6 border-b border-white-10 last:border-b-0">
          {week.map((day) => {
            const inMonth = isSameMonth(day, anchor);
            const count = countFor(day);
            const dayBlocks = blocksFor(day);
            return (
              <button
                key={day.toISOString()}
                onClick={() => onPickDay(day)}
                className={`relative min-h-[64px] border-r border-white-10 p-1.5 text-left last:border-r-0 transition-colors sm:min-h-[84px] sm:p-2 ${
                  inMonth ? 'hover:bg-white-10' : 'opacity-30'
                }`}
              >
                <span className={`text-sm font-medium ${isToday(day) ? 'text-gold' : inMonth ? 'text-white' : 'text-white-30'}`}>
                  {format(day, 'd')}
                </span>
                <div className="mt-2 flex flex-wrap gap-1">
                  {count > 0 && (
                    <span className="inline-block bg-gold/20 px-1.5 py-0.5 text-[10px] font-medium text-gold">
                      {count} appt{count === 1 ? '' : 's'}
                    </span>
                  )}
                  {dayBlocks.length > 0 && (
                    <span
                      title={dayBlocks.map((b) => `${blockTimeLabel(b)} · ${b.reason || 'Time off'}`).join('\n')}
                      className="inline-block border border-dashed border-white-30 px-1.5 py-0.5 text-[10px] font-medium text-white-50"
                    >
                      Blocked
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
