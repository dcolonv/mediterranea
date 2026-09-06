'use client';

import { useState, useEffect, useMemo } from 'react';
import { LuChevronLeft } from 'react-icons/lu';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button, Input, Textarea, PriceTag } from '@/components/ui';
import { formatDuration } from '@mediterranea/shared/utils';
import { BOOKING_OPENS_DATE } from '@mediterranea/shared/constants';
import { useLang } from '@/components/i18n/language-provider';
import { serviceName } from '@/lib/i18n/service';
import { durationLabel } from '@/lib/i18n/duration';
import { MonthCalendar, firstSelectableDate } from './month-calendar';
import { googleCalendarUrl } from '@/lib/calendar/ics';
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

function isIos(): boolean {
  if (typeof navigator === 'undefined') return false;
  // iPadOS reports itself as a Mac, so the touch check catches it too.
  return (
    /iPhone|iPad|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

/**
 * Hands the appointment to the phone's calendar app rather than leaving an
 * .ics file in Downloads:
 *  - iOS opens a served text/calendar response in Calendar directly.
 *  - Android routes calendar.google.com links to the Calendar app.
 *  - Desktop keeps the familiar file download.
 */
function addToCalendar(opts: {
  service: string;
  date: string;
  time: string;
  durationMinutes: number;
}) {
  const event = {
    service: opts.service,
    date: opts.date,
    time: opts.time,
    durationMinutes: opts.durationMinutes,
  };
  const icsUrl = `/api/calendar?${new URLSearchParams({
    service: opts.service,
    date: opts.date,
    time: opts.time,
    duration: String(opts.durationMinutes),
  })}`;

  if (isIos()) {
    // Navigating (not downloading) is what triggers Calendar's "Add Event" sheet.
    window.location.href = icsUrl;
    return;
  }

  if (/Android/.test(navigator.userAgent)) {
    window.open(googleCalendarUrl(event), '_blank', 'noopener');
    return;
  }

  const a = document.createElement('a');
  a.href = icsUrl;
  a.download = 'mediterranea-appointment.ics';
  a.click();
}

export function BookingFlow({
  services,
  initialService,
  startGroup,
  policyText,
  businessHours,
  maxAdvanceDays,
  blockedDates = [],
  prefill,
}: {
  services: PublicService[];
  initialService: PublicService | null;
  /** Pre-open a group's submenu (focus / indiba) when no specific service is given. */
  startGroup?: 'focus' | 'indiba';
  policyText: string;
  businessHours: WorkingHours;
  maxAdvanceDays: number;
  /** Dates fully closed (e.g. holidays) to disable in the calendar. */
  blockedDates?: string[];
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

  const initialGroup = (initialService?.bookingGroup as Group | undefined) ?? startGroup ?? null;
  const initialStep: Step = initialService ? 'time' : startGroup ? 'sub' : 'type';
  const [step, setStep] = useState<Step>(initialStep);
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
  const minFirstPrice = (list: PublicService[]) =>
    list.reduce((min, s) => Math.min(min, s.firstVisitPrice || s.price), Infinity);
  // "from" only earns its place when the group spans more than one price.
  const priceVaries = (list: PublicService[]) =>
    list.some((s) => s.price !== list[0].price);

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
    () => firstSelectableDate(businessHours, maxAdvanceDays, BOOKING_OPENS_DATE, blockedDates),
    [businessHours, maxAdvanceDays, blockedDates]
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
      return;
    }

    setError(res.error);
    // Only send them back to pick another time when this slot is genuinely gone;
    // for any other failure stay on the form so their details aren't lost.
    const slotTaken = /no longer available|conflicts|already/i.test(res.error ?? '');
    if (slotTaken) {
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

  // A single top-left Back control, driven by the current step.
  const isDeepLinkEntry = Boolean(initialService) && (step === 'time' || step === 'practitioner');
  const canGoBack = step !== 'type' && step !== 'done' && !isDeepLinkEntry;
  function goBack() {
    if (step === 'sub') setStep('type');
    else if (step === 'practitioner') setStep(group && group !== 'custom' ? 'sub' : 'type');
    else if (step === 'time') backFromTime();
    else if (step === 'details') setStep('time');
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
    setStep(initialStep);
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
            onClick={() => addToCalendar({ service: svcName(service), date, time, durationMinutes })}
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
        {canGoBack && (
          <button
            onClick={goBack}
            className="mb-6 inline-flex cursor-pointer items-center gap-1.5 text-sm font-medium tracking-wide text-white-70 transition-colors hover:text-gold"
          >
            <LuChevronLeft className="h-4 w-4" aria-hidden /> {b.back}
          </button>
        )}
        {error && <p className="mb-6 text-sm text-red-400">{error}</p>}

        {/* Step: choose facial type (Custom / Focus / INDIBA) */}
        {step === 'type' && (
          <div>
            <h2 className="mb-8 font-serif text-2xl text-white">{b.chooseTreatment}</h2>
            {services.length === 0 ? (
              <p className="text-white-50">{b.noTreatments}</p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {ungrouped.map((s) => (
                  <GroupCard
                    key={s.id}
                    title={svcName(s)}
                    hint={durationLabel(s.durationMinutes, locale)}
                    description={locale === 'es' && s.descriptionEs ? s.descriptionEs : s.description}
                    price={s.price}
                    firstPrice={s.firstVisitPrice}
                    firstLabel={copy.firstVisit}
                    badge={s.temporary ? copy.seasonal : undefined}
                    onClick={() => void chooseService(s)}
                  />
                ))}
                {customService && (
                  <GroupCard
                    title={svcName(customService)}
                    hint={copy.customDuration}
                    description={svcName(customService) === copy.customName ? copy.customDesc : customService.description}
                    price={customService.price}
                    firstPrice={customService.firstVisitPrice}
                    firstLabel={copy.firstVisit}
                    onClick={() => chooseGroup('custom')}
                  />
                )}
                {indibaServices.length > 0 && (
                  <GroupCard
                    title={copy.indibaName}
                    hint={copy.indibaDuration}
                    description={copy.indibaDesc}
                    price={minPrice(indibaServices)}
                    firstPrice={minFirstPrice(indibaServices)}
                    from={priceVaries(indibaServices)}
                    fromLabel={b.from}
                    firstLabel={copy.firstVisit}
                    onClick={() => chooseGroup('indiba')}
                  />
                )}
                {focusServices.length > 0 && (
                  <GroupCard
                    title={copy.focusName}
                    hint={copy.focusDuration}
                    description={copy.focusDesc}
                    price={minPrice(focusServices)}
                    firstPrice={minFirstPrice(focusServices)}
                    from={priceVaries(focusServices)}
                    fromLabel={b.from}
                    firstLabel={copy.firstVisit}
                    onClick={() => chooseGroup('focus')}
                  />
                )}
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
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                    <span className="font-serif text-lg text-white">{svcName(s)}</span>
                    <PriceTag
                      price={s.price}
                      firstPrice={s.firstVisitPrice}
                      firstLabel={copy.firstVisit}
                      className="shrink-0 text-left sm:text-right"
                    />
                  </div>
                  <span className="mt-1 text-xs uppercase tracking-wider text-white-30">
                    {formatDuration(s.durationMinutes)}
                  </span>
                </button>
              ))}
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
                minDate={BOOKING_OPENS_DATE}
                blockedDates={blockedDates}
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

            <div className="mt-8">
              <Button variant="elegant" onClick={confirm} disabled={submitting}>
                {submitting ? b.booking : b.confirm}
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
  firstPrice,
  from,
  fromLabel,
  firstLabel,
  badge,
  onClick,
}: {
  title: string;
  hint: string;
  description: string;
  price: number;
  firstPrice?: number;
  from?: boolean;
  fromLabel?: string;
  firstLabel: string;
  /** Optional tag shown above the title (e.g. "Seasonal"). */
  badge?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group flex h-full flex-col border border-white-10 p-6 text-left transition-colors hover:border-gold/40"
    >
      {badge && (
        <span className="mb-2 inline-flex w-fit border border-gold/40 px-2 py-0.5 text-[10px] uppercase tracking-wider text-gold">
          {badge}
        </span>
      )}
      {/* Stacked on small screens so long names and the price never collide. */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
        <span className="font-serif text-lg text-white transition-colors group-hover:text-gold">
          {title}
        </span>
        <PriceTag
          price={price}
          firstPrice={firstPrice}
          from={from}
          fromLabel={fromLabel}
          firstLabel={firstLabel}
          className="shrink-0 text-left sm:text-right"
        />
      </div>
      <span className="mt-1 text-xs uppercase tracking-wider text-white-30">{hint}</span>
      <span className="mt-3 text-sm font-light leading-relaxed text-white-50">{description}</span>
    </button>
  );
}
