'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { Button, Badge } from '@/components/ui';
import { APPOINTMENT_STATUSES } from '@mediterranea/shared/constants';
import {
  getMyAppointments,
  cancelMyAppointment,
  getMyRescheduleTimes,
  rescheduleMyAppointment,
  type MyAppointment,
} from '@/actions/account';

interface Props {
  initialUpcoming: MyAppointment[];
  initialPast: MyAppointment[];
}

const fmtDate = (d: string) => format(new Date(`${d}T00:00:00`), 'EEE, MMM d, yyyy');

export function AccountAppointments({ initialUpcoming, initialPast }: Props) {
  const [upcoming, setUpcoming] = useState(initialUpcoming);
  const [past, setPast] = useState(initialPast);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Reschedule state (single active at a time).
  const [rescheduleId, setRescheduleId] = useState<string | null>(null);
  const [rDate, setRDate] = useState('');
  const [rTimes, setRTimes] = useState<string[] | null>(null);
  const [rLoading, setRLoading] = useState(false);
  const [rError, setRError] = useState<string | null>(null);

  async function refresh() {
    const res = await getMyAppointments();
    if (res.success) {
      setUpcoming(res.upcoming);
      setPast(res.past);
    }
  }

  async function onCancel(id: string) {
    if (!confirm('Cancel this appointment?')) return;
    setBusyId(id);
    const res = await cancelMyAppointment(id);
    setBusyId(null);
    if (res.success) await refresh();
    else alert(res.error ?? 'Could not cancel.');
  }

  function openReschedule(id: string) {
    setRescheduleId(id);
    setRDate('');
    setRTimes(null);
    setRError(null);
  }

  async function findTimes() {
    if (!rescheduleId || !rDate) return;
    setRLoading(true);
    setRError(null);
    setRTimes(null);
    const res = await getMyRescheduleTimes(rescheduleId, rDate);
    setRLoading(false);
    if (res.success) setRTimes(res.times);
    else setRError(res.error ?? 'Could not load times.');
  }

  async function confirmReschedule(time: string) {
    if (!rescheduleId) return;
    setBusyId(rescheduleId);
    const res = await rescheduleMyAppointment(rescheduleId, rDate, time);
    setBusyId(null);
    if (res.success) {
      setRescheduleId(null);
      await refresh();
    } else {
      setRError(res.error ?? 'Could not reschedule.');
      setRTimes(null);
    }
  }

  return (
    <div className="space-y-12">
      <section>
        <h2 className="mb-5 font-serif text-2xl text-white">Upcoming</h2>
        {upcoming.length === 0 ? (
          <p className="border border-white-10 bg-dark-800/50 p-8 text-center text-white-50">
            You have no upcoming appointments.
          </p>
        ) : (
          <div className="space-y-3">
            {upcoming.map((a) => (
              <div key={a.id} className="border border-white-10 bg-dark-800/50 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="font-serif text-lg text-white">{a.serviceName}</h3>
                      <Badge variant={a.status}>{APPOINTMENT_STATUSES[a.status].label}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-white-70">
                      {fmtDate(a.date)} at {a.time}
                      {a.staffName ? ` · ${a.staffName}` : ''}
                    </p>
                  </div>
                  {a.canModify && (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openReschedule(a.id)}
                        disabled={busyId === a.id}
                      >
                        Reschedule
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onCancel(a.id)}
                        disabled={busyId === a.id}
                        className="text-red-400 hover:bg-red-500/10 hover:text-red-300"
                      >
                        Cancel
                      </Button>
                    </div>
                  )}
                </div>

                {rescheduleId === a.id && (
                  <div className="mt-5 border-t border-white-10 pt-5">
                    <div className="flex flex-wrap items-end gap-3">
                      <div>
                        <label className="mb-2 block text-xs uppercase tracking-wider text-white-50">
                          New date
                        </label>
                        <input
                          type="date"
                          value={rDate}
                          onChange={(e) => {
                            setRDate(e.target.value);
                            setRTimes(null);
                          }}
                          className="h-11 border border-white-10 bg-dark-800 px-3 text-white focus:border-gold focus:outline-none"
                        />
                      </div>
                      <Button variant="outline" size="sm" onClick={findTimes} disabled={!rDate || rLoading}>
                        {rLoading ? 'Finding…' : 'Find times'}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setRescheduleId(null)}>
                        Close
                      </Button>
                    </div>
                    {rError && <p className="mt-3 text-sm text-red-400">{rError}</p>}
                    {rTimes && rTimes.length === 0 && (
                      <p className="mt-3 text-sm text-white-50">No open times that day.</p>
                    )}
                    {rTimes && rTimes.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {rTimes.map((t) => (
                          <button
                            key={t}
                            onClick={() => confirmReschedule(t)}
                            disabled={busyId === a.id}
                            className="border border-white-10 px-3 py-1.5 text-sm text-white-70 transition-colors hover:border-gold/40 hover:text-white disabled:opacity-50"
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {!a.canModify && a.status !== 'completed' && (
                  <p className="mt-2 text-xs text-white-30">
                    To change this appointment, please call the studio.
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-5 font-serif text-2xl text-white">History</h2>
        {past.length === 0 ? (
          <p className="border border-white-10 bg-dark-800/50 p-8 text-center text-white-50">
            No past appointments yet.
          </p>
        ) : (
          <div className="border border-white-10 bg-dark-800/50">
            {past.map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between gap-4 border-b border-white-10 p-4 last:border-b-0"
              >
                <div>
                  <div className="text-white">{a.serviceName}</div>
                  <div className="text-sm text-white-50">
                    {fmtDate(a.date)} at {a.time}
                  </div>
                </div>
                <Badge variant={a.status}>{APPOINTMENT_STATUSES[a.status].label}</Badge>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
