'use client';

import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { Button, Badge } from '@/components/ui';
import { APPOINTMENT_STATUSES } from '@mediterranea/shared/constants';
import { getDashboard, type DashboardData } from '@/actions/dashboard';
import { AppointmentModal } from '@/components/appointments';
import { WalkInBooking } from '@/components/scheduling/walk-in-booking';
import { BookingAssistant } from '@/components/scheduling/booking-assistant';
import type { Appointment } from '@mediterranea/shared/types';

const OCCUPYING = new Set(['pending', 'confirmed', 'checked-in']);

export function BackofficeDashboard() {
  const [dash, setDash] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Appointment | null>(null);
  const [booking, setBooking] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);

  const load = useCallback(async () => {
    const res = await getDashboard();
    if (res.success) setDash(res.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const staffName = (id?: string) => dash?.staff.find((s) => s.id === id)?.name;
  const roomName = (id?: string) => dash?.rooms.find((r) => r.id === id)?.name;

  if (loading) {
    return <div className="py-24 text-center text-white-50">Loading…</div>;
  }

  if (!dash) {
    return (
      <div className="border border-white-10 bg-dark-800 p-12 text-center text-white-50">
        Couldn’t load the dashboard.{' '}
        <button onClick={load} className="text-gold hover:underline">
          Retry
        </button>
      </div>
    );
  }

  const { metrics, todayAppointments, today } = dash;
  const cards: { label: string; value: number; hint?: string }[] = [
    { label: 'Today', value: metrics.todayTotal, hint: 'booked' },
    { label: 'Checked in', value: metrics.todayCheckedIn, hint: 'in the studio' },
    { label: 'Completed today', value: metrics.todayCompleted },
    { label: 'Awaiting confirmation', value: metrics.pendingUpcoming, hint: 'upcoming' },
    { label: 'This week', value: metrics.weekTotal },
  ];

  return (
    <div>
      {/* Quick actions */}
      <div className="mb-8 flex flex-wrap items-center gap-3">
        <Button variant="outline" size="sm" onClick={() => setAssistantOpen(true)}>
          ✦ Assistant
        </Button>
        <Button variant="elegant" size="sm" onClick={() => setBooking(true)}>
          + New Appointment
        </Button>
      </div>

      {/* Metric cards */}
      <div className="mb-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {cards.map((c) => (
          <div key={c.label} className="border border-white-10 bg-dark-800 p-4">
            <div className="text-3xl font-serif text-white">{c.value}</div>
            <div className="mt-1 text-[11px] uppercase tracking-wider text-white-50">{c.label}</div>
            {c.hint && <div className="text-[10px] text-white-30">{c.hint}</div>}
          </div>
        ))}
      </div>

      {/* Today's schedule */}
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="font-serif text-2xl text-white">Today’s schedule</h2>
        <span className="text-sm text-white-50">
          {format(new Date(`${today}T00:00:00`), 'EEEE, MMMM d')}
        </span>
      </div>

      {todayAppointments.length === 0 ? (
        <div className="border border-white-10 bg-dark-800 p-12 text-center text-white-50">
          No appointments scheduled today.
        </div>
      ) : (
        <div className="border border-white-10 bg-dark-800">
          {todayAppointments.map((apt) => {
            const dimmed = !OCCUPYING.has(apt.status);
            return (
              <button
                key={apt.id}
                onClick={() => setSelected(apt)}
                className={`flex w-full items-center gap-4 border-b border-white-10 p-4 text-left transition-colors last:border-b-0 hover:bg-white-10 ${
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
                      {[staffName(apt.staffId), roomName(apt.roomId)].filter(Boolean).join(' · ')}
                    </div>
                  )}
                </div>
                <Badge variant={apt.status}>{APPOINTMENT_STATUSES[apt.status].label}</Badge>
              </button>
            );
          })}
        </div>
      )}

      {selected && (
        <AppointmentModal
          appointment={selected}
          staff={dash.staff}
          rooms={dash.rooms}
          onClose={() => setSelected(null)}
          onUpdate={load}
        />
      )}
      {booking && (
        <WalkInBooking
          services={dash.services}
          staff={dash.staff}
          rooms={dash.rooms}
          initialDate={today}
          onClose={() => setBooking(false)}
          onBooked={load}
        />
      )}
      {assistantOpen && (
        <BookingAssistant onClose={() => setAssistantOpen(false)} onMutated={load} />
      )}
    </div>
  );
}
