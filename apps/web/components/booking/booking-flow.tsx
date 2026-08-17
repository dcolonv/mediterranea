'use client';

import { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button, Input, Textarea } from '@/components/ui';
import { formatPrice, formatDuration } from '@mediterranea/shared/utils';
import { CONTACT_INFO } from '@mediterranea/shared/constants';
import { useLang } from '@/components/i18n/language-provider';
import { serviceName } from '@/lib/i18n/service';
import { MonthCalendar, firstSelectableDate } from './month-calendar';
import type { WorkingHours } from '@mediterranea/shared/types';
import {
  getBookingStaff,
  getDaySlots,
  createOnlineBooking,
  type PublicService,
  type PublicStaff,
} from '@/actions/public-booking';

type Step = 'type' | 'sub' | 'practitioner' | 'time' | 'details' | 'done';
type Group = 'custom' | 'focus' | 'indiba';

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
  businessHours,
  maxAdvanceDays,
  prefill,
}: {
  services: PublicService[];
  initialService: PublicService | null;
  policyText: string;
  businessHours: WorkingHours;
  maxAdvanceDays: number;
  prefill?: { name: string; email: string; phone: string } | null;
}) {
  const { locale, dict } = useLang();
  const b = dict.booking;
  const copy = dict.services;
  const dfLocale = locale === 'es' ? es : undefined;

  // ── Group the bookable services ────────────────────────────────────────────
  const customService = services.find((s) => s.bookingGroup === 'custom') ?? null;
  const focusServices = services.filter((s) => s.bookingGroup === 'focus');
  const indibaServices = services.filter((s) => s.bookingGroup === 'indiba');
  const ungrouped = services.filter(
    (s) => !['custom', 'focus', 'indiba'].includes(s.bookingGroup)
  );

  const STEPS: { key: Step; label: string }[] = [
    { key: 'type', label: b.stepTreatment },
    { key: 'time', label: b.stepTime },
    { key: 'details', label: b.stepDetails },
  ];

  const initialGroup = (initialService?.bookingGroup as Group | undefined) ?? null;
  const [step, setStep] = useState<Step>(initialService ? 'time' : 'type');
  const [group, setGroup] = useState<Group | null>(initialGroup);
  const [service, setService] = useState<PublicService | null>(initialService);

  const [staffList, setStaffList] = useState<PublicStaff[]>([]);
  const [staffId, setStaffId] = useState(''); // '' = any available

  const [date, setDate] = useState('');
  const [daySlots, setDaySlots] = useState<{ time: string; available: boolean }[] | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [time, setTime] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(service?.durationMinutes ?? 0);

  const [name, setName] = useState(prefill?.name ?? '');
  const [email, setEmail] = useState(prefill?.email ?? '');
  const [phone, setPhone] = useState(prefill?.phone ?? '');
  const [notes, setNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const svcName = (s: PublicService) => serviceName(s, locale);
  const staffName = (id: string) => staffList.find((s) => s.id === id)?.name;
  const minPrice = (list: PublicService[]) =>
    list.reduce((min, s) => Math.min(min, s.price), Infinity);

  // For a deep-linked service, resolve whether the practitioner step is needed.
  useEffect(() => {
    if (!initialService) return;
    let cancelled = false;
    (async () => {
      const staff = await getBookingStaff(initialService.id);
      if (cancelled) return;
      setStaffList(staff);
      setStep(staff.length >= 2 ? 'practitioner' : 'time');
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pick a concrete service, then route to practitioner (if 2+) or straight to time.
  async function chooseService(s: PublicService) {
    setService(s);
    setDurationMinutes(s.durationMinutes);
    setStaffId('');
    setDaySlots(null);
    setTime('');
    setDate('');
    const staff = await getBookingStaff(s.id);
    setStaffList(staff);
    setStep(staff.length >= 2 ? 'practitioner' : 'time');
  }

  // Pick a top-level group. Custom books directly; others open a submenu.
  function chooseGroup(g: Group) {
    if (g === 'custom' && customService) {
      setGroup('custom');
      void chooseService(customService);
      return;
    }
    setGroup(g);
    setStep('sub');
  }

  function choosePractitioner(id: string) {
    setStaffId(id);
    setDaySlots(null);
    setTime('');
    setDate('');
    setStep('time');
  }

  async function selectDate(d: string, svc: PublicService | null = service) {
    if (!svc) return;
    setDate(d);
    setTime('');
    setDaySlots(null);
    setLoadingSlots(true);
    setError(null);
    const res = await getDaySlots(svc.id, d);
    setLoadingSlots(false);
    if (!res.success) {
      setError(res.error);
      return;
    }
    setDurationMinutes(res.durationMinutes);
    setDaySlots(res.slots);
  }

  // Default the calendar to today (or the next open day) as soon as we reach the date step.
  const defaultDate = useMemo(
    () => firstSelectableDate(businessHours, maxAdvanceDays),
    [businessHours, maxAdvanceDays]
  );
  useEffect(() => {
    if (step === 'time' && service && !date) void selectDate(defaultDate, service);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, service, date]);

  async function confirm() {
    if (!service || !time) return;
    if (!name.trim() || !email.trim() || !phone.trim()) {
      setError(b.provideDetails);
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
      // If the slot was taken, refresh the day's slots so it shows as blocked.
      setTime('');
      if (date) void selectDate(date);
      setStep('time');
    }
  }

  // Where "back" from the time step should land.
  function backFromTime() {
    if (initialService) return; // deep-linked: no back
    if (staffList.length >= 2) setStep('practitioner');
    else if (group && group !== 'custom') setStep('sub');
    else setStep('type');
  }

  function resetToStart() {
    setService(initialService);
    setGroup(initialGroup);
    setStaffId('');
    setDate('');
    setDaySlots(null);
    setTime('');
    setName(prefill?.name ?? '');
    setEmail(prefill?.email ?? '');
    setPhone(prefill?.phone ?? '');
    setNotes('');
    setError(null);
    setStep(initialService ? 'time' : 'type');
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
        <h2 className="font-serif text-3xl text-white">{b.booked}</h2>
        <p className="mt-4 text-white-70">
          {svcName(service)}
          {staffName(staffId) ? ` ${b.with} ${staffName(staffId)}` : ''}
          <br />
          {format(new Date(`${date}T00:00:00`), 'EEEE, d MMMM yyyy', { locale: dfLocale })} {b.at} {time}
        </p>
        <p className="mt-3 text-sm text-white-50">
          {b.confirmationPrefix}
          {email}
          {b.confirmationSuffix}
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button
            variant="elegant"
            onClick={() => downloadIcs({ service: svcName(service), date, time, durationMinutes })}
          >
            {b.addToCalendar}
          </Button>
          <Button variant="ghost" onClick={resetToStart}>
            {b.bookAnother}
          </Button>
        </div>

        {policyText && (
          <p className="mx-auto mt-8 max-w-md text-xs leading-relaxed text-white-30">{policyText}</p>
        )}
      </div>
    );
  }

  const activeIndex =
    step === 'time' ? 1 : step === 'details' ? 2 : 0; // type/sub/practitioner group under "Treatment"

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

        {/* Step: choose facial type (Custom / Focus / INDIBA) */}
        {step === 'type' && (
          <div>
            <h2 className="mb-8 font-serif text-2xl text-white">{b.chooseTreatment}</h2>
            {services.length === 0 ? (
              <p className="text-white-50">{b.noTreatments}</p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {customService && (
                  <GroupCard
                    title={svcName(customService)}
                    hint={copy.customDuration}
                    description={svcName(customService) === copy.customName ? copy.customDesc : customService.description}
                    price={formatPrice(customService.price)}
                    onClick={() => chooseGroup('custom')}
                  />
                )}
                {focusServices.length > 0 && (
                  <GroupCard
                    title={copy.focusName}
                    hint={copy.focusDuration}
                    description={copy.focusDesc}
                    price={`${b.from} ${formatPrice(minPrice(focusServices))}`}
                    onClick={() => chooseGroup('focus')}
                  />
                )}
                {indibaServices.length > 0 && (
                  <GroupCard
                    title={copy.indibaName}
                    hint={copy.indibaDuration}
                    description={copy.indibaDesc}
                    price={`${b.from} ${formatPrice(minPrice(indibaServices))}`}
                    onClick={() => chooseGroup('indiba')}
                  />
                )}
                {ungrouped.map((s) => (
                  <GroupCard
                    key={s.id}
                    title={svcName(s)}
                    hint={formatDuration(s.durationMinutes)}
                    description={s.description}
                    price={formatPrice(s.price)}
                    onClick={() => void chooseService(s)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step: submenu (focus treatments or INDIBA options) */}
        {step === 'sub' && group && group !== 'custom' && (
          <div>
            <h2 className="mb-8 font-serif text-2xl text-white">
              {group === 'focus' ? b.chooseFocus : b.chooseIndiba}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {(group === 'focus' ? focusServices : indibaServices).map((s) => (
                <button
                  key={s.id}
                  onClick={() => void chooseService(s)}
                  className="flex flex-col border border-white-10 p-5 text-left transition-colors hover:border-gold/40"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="font-serif text-lg text-white">{svcName(s)}</span>
                    <span className="shrink-0 text-gold">{formatPrice(s.price)}</span>
                  </div>
                  <span className="mt-1 text-xs uppercase tracking-wider text-white-30">
                    {formatDuration(s.durationMinutes)}
                  </span>
                </button>
              ))}
            </div>
            <div className="mt-8">
              <Button variant="ghost" size="sm" onClick={() => setStep('type')}>
                ‹ {b.back}
              </Button>
            </div>
          </div>
        )}

        {/* Step: practitioner (only when 2+ qualified practitioners) */}
        {step === 'practitioner' && service && (
          <div>
            <h2 className="mb-2 font-serif text-2xl text-white">{b.choosePractitioner}</h2>
            <p className="mb-8 text-sm text-white-50">
              {b.forService} <span className="text-white">{svcName(service)}</span>.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                onClick={() => choosePractitioner('')}
                className="border border-white-10 p-5 text-left transition-colors hover:border-gold/40"
              >
                <span className="font-serif text-lg text-white">{b.anyAvailable}</span>
                <span className="mt-1 block text-xs text-white-30">{b.fastest}</span>
              </button>
              {staffList.map((s) => (
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
                onClick={() => setStep(group && group !== 'custom' ? 'sub' : 'type')}
                disabled={Boolean(initialService)}
                className={initialService ? 'opacity-0 pointer-events-none' : ''}
              >
                ‹ {b.back}
              </Button>
            </div>
          </div>
        )}

        {/* Step: date & time */}
        {step === 'time' && service && (
          <div>
            <h2 className="mb-2 font-serif text-2xl text-white">{b.pickDateTime}</h2>
            <p className="mb-8 text-sm text-white-50">
              {svcName(service)} · {formatDuration(service.durationMinutes)}
              {staffName(staffId) ? ` · ${staffName(staffId)}` : ''}
            </p>

            <div className="grid gap-8 lg:grid-cols-[minmax(0,20rem)_1fr]">
              <MonthCalendar
                businessHours={businessHours}
                maxAdvanceDays={maxAdvanceDays}
                locale={locale}
                selectedDate={date}
                onSelectDate={selectDate}
                prevLabel={b.prevMonth}
                nextLabel={b.nextMonth}
              />

              <div>
                {!date && <p className="text-sm text-white-50">{b.selectDatePrompt}</p>}
                {date && loadingSlots && <p className="text-sm text-white-50">{b.finding}</p>}
                {date && !loadingSlots && daySlots && daySlots.length === 0 && (
                  <p className="text-sm text-white-50">{b.noTimes}</p>
                )}
                {date && !loadingSlots && daySlots && daySlots.length > 0 && (
                  <>
                    <div className="mb-5 flex items-center gap-5 text-xs text-white-50">
                      <span className="flex items-center gap-2">
                        <span className="h-3 w-3 border border-gold/50" /> {b.slotAvailable}
                      </span>
                      <span className="flex items-center gap-2">
                        <span className="h-3 w-3 border border-white-10 bg-white-10" /> {b.slotBooked}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                      {daySlots.map((s) => (
                        <button
                          key={s.time}
                          disabled={!s.available}
                          onClick={() => {
                            setTime(s.time);
                            setStep('details');
                          }}
                          className={`border px-3 py-2 text-sm transition-colors ${
                            s.available
                              ? 'border-white-10 text-white-70 hover:border-gold/40 hover:text-white'
                              : 'cursor-not-allowed border-white-10/50 text-white-30 line-through'
                          }`}
                        >
                          {s.time}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="mt-8">
              <Button
                variant="ghost"
                size="sm"
                onClick={backFromTime}
                disabled={Boolean(initialService)}
                className={initialService ? 'opacity-0 pointer-events-none' : ''}
              >
                ‹ {b.back}
              </Button>
            </div>
          </div>
        )}

        {/* Step: details */}
        {step === 'details' && service && (
          <div>
            <h2 className="mb-2 font-serif text-2xl text-white">{b.yourDetails}</h2>
            <p className="mb-8 text-sm text-white-50">
              {svcName(service)}
              {staffName(staffId) ? ` · ${staffName(staffId)}` : ''} ·{' '}
              {format(new Date(`${date}T00:00:00`), 'd MMM', { locale: dfLocale })} {b.at} {time}
            </p>

            <div className="space-y-5">
              <Input id="b-name" label={b.fullName} value={name} onChange={(e) => setName(e.target.value)} />
              <div className="grid gap-5 sm:grid-cols-2">
                <Input id="b-email" label={b.email} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                <Input id="b-phone" label={b.phone} value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <Textarea
                id="b-notes"
                label={b.notes}
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
                {submitting ? b.booking : b.confirm}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setStep('time')} disabled={submitting}>
                ‹ {b.back}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function GroupCard({
  title,
  hint,
  description,
  price,
  onClick,
}: {
  title: string;
  hint: string;
  description: string;
  price: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group flex h-full flex-col border border-white-10 p-6 text-left transition-colors hover:border-gold/40"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="font-serif text-lg text-white transition-colors group-hover:text-gold">
          {title}
        </span>
        <span className="shrink-0 text-gold">{price}</span>
      </div>
      <span className="mt-1 text-xs uppercase tracking-wider text-white-30">{hint}</span>
      <span className="mt-3 text-sm font-light leading-relaxed text-white-50">{description}</span>
    </button>
  );
}
