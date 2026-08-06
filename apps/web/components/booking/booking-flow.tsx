'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { Button, Input, Textarea } from '@/components/ui';
import { formatPrice, formatDuration } from '@mediterranea/shared/utils';
import { CONTACT_INFO } from '@mediterranea/shared/constants';
import {
  getBookingStaff,
  getBookingAvailability,
  createOnlineBooking,
  type PublicService,
  type PublicStaff,
} from '@/actions/public-booking';

type Step = 'service' | 'practitioner' | 'time' | 'details' | 'done';

const STEPS: { key: Step; label: string }[] = [
  { key: 'service', label: 'Treatment' },
  { key: 'practitioner', label: 'Practitioner' },
  { key: 'time', label: 'Date & time' },
  { key: 'details', label: 'Your details' },
];

function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m + minutes;
  const hh = Math.floor(total / 60) % 24;
  const mm = total % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

function downloadIcs(opts: {
  service: string;
  date: string;
  time: string;
  durationMinutes: number;
}) {
  const dt = (t: string) => `${opts.date.replace(/-/g, '')}T${t.replace(':', '')}00`;
  const end = addMinutes(opts.time, opts.durationMinutes);
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Mediterranea Face Studio//Booking//EN',
    'BEGIN:VEVENT',
    `UID:${opts.date}-${opts.time}-mediterranea`,
    `DTSTART:${dt(opts.time)}`,
    `DTEND:${dt(end)}`,
    `SUMMARY:${opts.service} — Mediterránea Face Studio`,
    `LOCATION:${CONTACT_INFO.address}, ${CONTACT_INFO.city}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'appointment.ics';
  a.click();
  URL.revokeObjectURL(url);
}

export function BookingFlow({
  services,
  initialService,
  policyText,
  prefill,
}: {
  services: PublicService[];
  initialService: PublicService | null;
  policyText: string;
  prefill?: { name: string; email: string; phone: string } | null;
}) {
  const [step, setStep] = useState<Step>(initialService ? 'practitioner' : 'service');
  const [service, setService] = useState<PublicService | null>(initialService);

  const [staffList, setStaffList] = useState<PublicStaff[] | null>(null);
  const [staffId, setStaffId] = useState(''); // '' = any

  const [date, setDate] = useState('');
  const [times, setTimes] = useState<string[] | null>(null);
  const [loadingTimes, setLoadingTimes] = useState(false);
  const [time, setTime] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(service?.durationMinutes ?? 0);

  const [name, setName] = useState(prefill?.name ?? '');
  const [email, setEmail] = useState(prefill?.email ?? '');
  const [phone, setPhone] = useState(prefill?.phone ?? '');
  const [notes, setNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const staffName = (id: string) => staffList?.find((s) => s.id === id)?.name;

  async function chooseService(s: PublicService) {
    setService(s);
    setDurationMinutes(s.durationMinutes);
    setStaffId('');
    setStaffList(null);
    setTimes(null);
    setTime('');
    setStep('practitioner');
    const staff = await getBookingStaff(s.id);
    setStaffList(staff);
  }

  // Load staff when arriving at the practitioner step via a preselected service.
  async function ensureStaffLoaded() {
    if (service && staffList === null) {
      const staff = await getBookingStaff(service.id);
      setStaffList(staff);
    }
  }

  function choosePractitioner(id: string) {
    setStaffId(id);
    setTimes(null);
    setTime('');
    setStep('time');
  }

  async function findTimes() {
    if (!service || !date) return;
    setLoadingTimes(true);
    setError(null);
    setTimes(null);
    setTime('');
    const res = await getBookingAvailability(service.id, date, staffId || undefined);
    setLoadingTimes(false);
    if (!res.success) {
      setError(res.error);
      return;
    }
    setDurationMinutes(res.durationMinutes);
    setTimes(res.times);
  }

  async function confirm() {
    if (!service || !time) return;
    if (!name.trim() || !email.trim() || !phone.trim()) {
      setError('Please provide your name, email, and phone.');
      return;
    }
    setSubmitting(true);
    setError(null);
    const res = await createOnlineBooking({
      serviceId: service.id,
      date,
      time,
      staffId: staffId || undefined,
      clientName: name,
      clientEmail: email,
      clientPhone: phone,
      notes,
    });
    setSubmitting(false);
    if (res.success) {
      setStep('done');
    } else {
      setError(res.error);
      // If the slot was taken, send them back to pick another time.
      setTimes(null);
      setTime('');
      setStep('time');
    }
  }

  // ── Confirmation ─────────────────────────────────────────────────────────────
  if (step === 'done' && service) {
    return (
      <div className="border border-white-10 bg-dark-800/50 p-8 text-center sm:p-12">
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full border border-gold/40">
          <svg className="h-7 w-7 text-gold" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </div>
        <h2 className="font-serif text-3xl text-white">You’re booked</h2>
        <p className="mt-4 text-white-70">
          {service.name}
          {staffName(staffId) ? ` with ${staffName(staffId)}` : ''}
          <br />
          {format(new Date(`${date}T00:00:00`), 'EEEE, MMMM d, yyyy')} at {time}
        </p>
        <p className="mt-3 text-sm text-white-50">
          A confirmation will follow at {email}. We look forward to seeing you.
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button
            variant="elegant"
            onClick={() => downloadIcs({ service: service.name, date, time, durationMinutes })}
          >
            Add to calendar
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              setService(initialService);
              setStaffId('');
              setStaffList(null);
              setDate('');
              setTimes(null);
              setTime('');
              setName(prefill?.name ?? '');
              setEmail(prefill?.email ?? '');
              setPhone(prefill?.phone ?? '');
              setNotes('');
              setError(null);
              setStep(initialService ? 'practitioner' : 'service');
            }}
          >
            Book another
          </Button>
        </div>

        {policyText && (
          <p className="mx-auto mt-8 max-w-md text-xs leading-relaxed text-white-30">{policyText}</p>
        )}
      </div>
    );
  }

  const activeIndex = STEPS.findIndex((s) => s.key === step);

  return (
    <div>
      {/* Progress */}
      <div className="mb-10 flex items-center justify-center gap-2 sm:gap-4">
        {STEPS.map((s, i) => (
          <div key={s.key} className="flex items-center gap-2 sm:gap-4">
            <span
              className={`text-[11px] uppercase tracking-wider ${
                i === activeIndex ? 'text-gold' : i < activeIndex ? 'text-white-70' : 'text-white-30'
              }`}
            >
              {s.label}
            </span>
            {i < STEPS.length - 1 && <span className="h-px w-4 bg-white-10 sm:w-8" />}
          </div>
        ))}
      </div>

      <div className="border border-white-10 bg-dark-800/50 p-8 sm:p-12">
        {error && <p className="mb-6 text-sm text-red-400">{error}</p>}

        {/* Step: service */}
        {step === 'service' && (
          <div>
            <h2 className="mb-8 font-serif text-2xl text-white">Choose a treatment</h2>
            {services.length === 0 ? (
              <p className="text-white-50">No treatments are available to book right now.</p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {services.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => chooseService(s)}
                    className="flex flex-col border border-white-10 p-5 text-left transition-colors hover:border-gold/40"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="font-serif text-lg text-white">{s.name}</span>
                      <span className="shrink-0 text-gold">{formatPrice(s.price)}</span>
                    </div>
                    <span className="mt-1 text-xs uppercase tracking-wider text-white-30">
                      {formatDuration(s.durationMinutes)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step: practitioner */}
        {step === 'practitioner' && service && (
          <div>
            <h2 className="mb-2 font-serif text-2xl text-white">Choose a practitioner</h2>
            <p className="mb-8 text-sm text-white-50">
              For <span className="text-white">{service.name}</span>.
            </p>
            <div className="grid gap-3 sm:grid-cols-2" onMouseEnter={ensureStaffLoaded}>
              <button
                onClick={() => choosePractitioner('')}
                className="border border-white-10 p-5 text-left transition-colors hover:border-gold/40"
              >
                <span className="font-serif text-lg text-white">Any available</span>
                <span className="mt-1 block text-xs text-white-30">Fastest availability</span>
              </button>
              {(staffList ?? []).map((s) => (
                <button
                  key={s.id}
                  onClick={() => choosePractitioner(s.id)}
                  className="border border-white-10 p-5 text-left transition-colors hover:border-gold/40"
                >
                  <span className="font-serif text-lg text-white">{s.name}</span>
                  <span className="mt-1 block text-xs text-white-30">{s.role}</span>
                </button>
              ))}
            </div>
            <div className="mt-8">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStep('service')}
                disabled={Boolean(initialService)}
                className={initialService ? 'opacity-0 pointer-events-none' : ''}
              >
                ‹ Back
              </Button>
            </div>
          </div>
        )}

        {/* Step: time */}
        {step === 'time' && service && (
          <div>
            <h2 className="mb-2 font-serif text-2xl text-white">Pick a date &amp; time</h2>
            <p className="mb-8 text-sm text-white-50">
              {service.name}
              {staffName(staffId) ? ` · ${staffName(staffId)}` : ' · Any practitioner'}
            </p>

            <div className="flex flex-wrap items-end gap-3">
              <div className="w-full sm:w-auto">
                <label className="mb-2 block text-sm font-medium tracking-wide text-white-70">Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => {
                    setDate(e.target.value);
                    setTimes(null);
                    setTime('');
                  }}
                  className="h-12 w-full border border-white-10 bg-dark-800 px-4 text-white focus:border-gold focus:outline-none sm:w-56"
                />
              </div>
              <Button variant="outline" onClick={findTimes} disabled={!date || loadingTimes}>
                {loadingTimes ? 'Finding…' : 'Find times'}
              </Button>
            </div>

            {times && times.length === 0 && (
              <p className="mt-6 text-sm text-white-50">No open times on this date. Try another day.</p>
            )}
            {times && times.length > 0 && (
              <div className="mt-6 flex flex-wrap gap-2">
                {times.map((t) => (
                  <button
                    key={t}
                    onClick={() => {
                      setTime(t);
                      setStep('details');
                    }}
                    className="border border-white-10 px-4 py-2 text-sm text-white-70 transition-colors hover:border-gold/40 hover:text-white"
                  >
                    {t}
                  </button>
                ))}
              </div>
            )}

            <div className="mt-8">
              <Button variant="ghost" size="sm" onClick={() => setStep('practitioner')}>
                ‹ Back
              </Button>
            </div>
          </div>
        )}

        {/* Step: details */}
        {step === 'details' && service && (
          <div>
            <h2 className="mb-2 font-serif text-2xl text-white">Your details</h2>
            <p className="mb-8 text-sm text-white-50">
              {service.name}
              {staffName(staffId) ? ` · ${staffName(staffId)}` : ''} ·{' '}
              {format(new Date(`${date}T00:00:00`), 'MMM d')} at {time}
            </p>

            <div className="space-y-5">
              <Input id="b-name" label="Full name" value={name} onChange={(e) => setName(e.target.value)} />
              <div className="grid gap-5 sm:grid-cols-2">
                <Input id="b-email" label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                <Input id="b-phone" label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <Textarea
                id="b-notes"
                label="Anything we should know? (optional)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>

            {policyText && (
              <p className="mt-6 text-xs leading-relaxed text-white-30">{policyText}</p>
            )}

            <div className="mt-8 flex items-center gap-3">
              <Button variant="elegant" onClick={confirm} disabled={submitting}>
                {submitting ? 'Booking…' : 'Confirm booking'}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setStep('time')} disabled={submitting}>
                ‹ Back
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
