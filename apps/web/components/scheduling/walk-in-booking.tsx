'use client';

import { useState, useEffect, useMemo } from 'react';
import { LuChevronLeft } from 'react-icons/lu';
import { format } from 'date-fns';
import { Button, Input, Select, Textarea, PriceTag } from '@/components/ui';
import { formatDuration } from '@mediterranea/shared/utils';
import { BOOKING_OPENS_DATE } from '@mediterranea/shared/constants';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { durationLabel } from '@/lib/i18n/duration';
import { weekdayOf } from '@/lib/agent/availability';
import { MonthCalendar, firstSelectableDate } from '@/components/booking/month-calendar';
import { GroupCard } from '@/components/booking/group-card';
import { SlotPicker, type BackofficeSlot } from '@/components/scheduling/slot-picker';
import { getPublicPolicy } from '@/actions/public-booking';
import { getBackofficeSlots, bookWalkIn, searchClients } from '@/actions/scheduling';
import type { Service, Staff, Room, WorkingHours } from '@mediterranea/shared/types';

type Step = 'type' | 'sub' | 'practitioner' | 'time' | 'details' | 'done';
type Group = 'custom' | 'focus' | 'indiba';
type Slot = BackofficeSlot;

interface ClientMatch {
  id: string;
  name: string;
  email: string;
  phone: string;
}
interface CalendarPolicy {
  businessHours: WorkingHours;
  maxAdvanceDays: number;
  blockedDates: string[];
}

const STEPS: { key: Step; label: string }[] = [
  { key: 'type', label: 'Treatment' },
  { key: 'time', label: 'Date & time' },
  { key: 'details', label: 'Client' },
];

// Group titles and blurbs match the public booking page.
const copy = getDictionary('en').services;

/**
 * Backoffice booking, in the same steps a client follows online: treatment →
 * options (for grouped treatments) → practitioner (only with 2+) → date & time
 * → client. Only the client's name is required. Past days can be picked to
 * backfill visits that weren't recorded; those save as completed, silently.
 */
export function WalkInBooking({
  services,
  staff,
  rooms,
  initialDate,
  onClose,
  onBooked,
}: {
  services: Service[];
  staff: Staff[];
  rooms: Room[];
  initialDate: string;
  onClose: () => void;
  onBooked: () => void;
}) {
  const customService = services.find((s) => s.bookingGroup === 'custom') ?? null;
  const focusServices = services.filter((s) => s.bookingGroup === 'focus');
  const indibaServices = services.filter((s) => s.bookingGroup === 'indiba');
  const ungrouped = services.filter(
    (s) => !['custom', 'focus', 'indiba'].includes(s.bookingGroup ?? '')
  );

  const [step, setStep] = useState<Step>('type');
  const [group, setGroup] = useState<Group | null>(null);
  const [service, setService] = useState<Service | null>(null);
  const [staffId, setStaffId] = useState(''); // '' = any available

  const [policy, setPolicy] = useState<CalendarPolicy | null>(null);
  const [date, setDate] = useState('');
  const [daySlots, setDaySlots] = useState<Slot[] | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const [slot, setSlot] = useState<Slot | null>(null);
  const [assignedStaffId, setAssignedStaffId] = useState('');
  const [assignedRoomId, setAssignedRoomId] = useState('');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [search, setSearch] = useState('');
  const [matches, setMatches] = useState<ClientMatch[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailed, setEmailed] = useState(false);
  const [past, setPast] = useState(false);

  const staffName = (id: string) => staff.find((s) => s.id === id)?.name;
  const roomName = (id: string) => rooms.find((r) => r.id === id)?.name ?? id;
  const qualifiedStaff = (s: Service) => staff.filter((p) => p.serviceIds?.includes(s.id));
  const minPrice = (list: Service[]) => list.reduce((min, s) => Math.min(min, s.price), Infinity);
  const minFirstPrice = (list: Service[]) =>
    list.reduce((min, s) => Math.min(min, s.firstVisitPrice || s.price), Infinity);
  const priceVaries = (list: Service[]) => list.some((s) => s.price !== list[0].price);

  useEffect(() => {
    getPublicPolicy().then(({ businessHours, maxAdvanceDays, blockedDates }) =>
      setPolicy({ businessHours, maxAdvanceDays, blockedDates })
    );
  }, []);

  // Open on the day the calendar was showing (past days included) when the
  // studio is open that day, else the next open day.
  const defaultDate = useMemo(() => {
    if (!policy) return '';
    const bookable =
      Boolean(policy.businessHours[weekdayOf(initialDate)]) &&
      !policy.blockedDates.includes(initialDate);
    if (bookable) return initialDate;
    return firstSelectableDate(
      policy.businessHours,
      policy.maxAdvanceDays,
      BOOKING_OPENS_DATE,
      policy.blockedDates
    );
  }, [policy, initialDate]);
  const isPastDate = Boolean(date) && date < format(new Date(), 'yyyy-MM-dd');

  function chooseService(s: Service) {
    setService(s);
    setDate('');
    setDaySlots(null);
    setSlot(null);
    const qualified = qualifiedStaff(s);
    // A single practitioner is picked for you; with several, ask.
    setStaffId(qualified.length === 1 ? qualified[0].id : '');
    setStep(qualified.length >= 2 ? 'practitioner' : 'time');
  }

  function chooseGroup(g: Group) {
    if (g === 'custom' && customService) {
      setGroup('custom');
      chooseService(customService);
      return;
    }
    setGroup(g);
    setStep('sub');
  }

  function choosePractitioner(id: string) {
    setStaffId(id);
    setDate('');
    setDaySlots(null);
    setSlot(null);
    setStep('time');
  }

  async function selectDate(d: string) {
    if (!service) return;
    setDate(d);
    setSlot(null);
    setDaySlots(null);
    setLoadingSlots(true);
    setError(null);
    const res = await getBackofficeSlots(service.id, d, { staffId: staffId || undefined });
    setLoadingSlots(false);
    if ('error' in res) {
      setError(res.error);
      return;
    }
    setDaySlots(res.slots);
  }

  useEffect(() => {
    if (step === 'time' && service && defaultDate && !date) void selectDate(defaultDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, service, defaultDate, date]);

  function pickSlot(s: Slot) {
    setSlot(s);
    setAssignedStaffId(staffId && s.staffIds.includes(staffId) ? staffId : s.staffIds[0]);
    setAssignedRoomId(s.roomIds[0]);
    setError(null);
    setStep('details');
  }

  // A time off the grid: offer every qualified practitioner and matching room;
  // the server still refuses a clash.
  function pickOtherTime(time: string) {
    if (!service) return;
    pickSlot({
      time,
      available: true,
      staffIds: staffId ? [staffId] : qualifiedStaff(service).map((s) => s.id),
      roomIds: rooms.filter((r) => !service.roomType || r.type === service.roomType).map((r) => r.id),
    });
  }

  async function runSearch(term: string) {
    setSearch(term);
    if (term.trim().length < 2) {
      setMatches([]);
      return;
    }
    const res = await searchClients(term);
    setMatches(res.success ? res.data : []);
  }

  function pickClient(c: ClientMatch) {
    setName(c.name);
    setEmail(c.email);
    setPhone(c.phone);
    setCustomerId(c.id);
    setSearch('');
    setMatches([]);
  }

  function clearClient() {
    setName('');
    setEmail('');
    setPhone('');
    setCustomerId('');
  }

  async function book() {
    if (!service || !slot) return;
    if (!name.trim()) {
      setError('Enter the client’s name.');
      return;
    }
    if (email.trim() && !/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError('That email doesn’t look right. Fix it or leave it empty.');
      return;
    }
    setSubmitting(true);
    setError(null);
    const res = await bookWalkIn({
      serviceId: service.id,
      date,
      time: slot.time,
      staffId: assignedStaffId,
      roomId: assignedRoomId,
      clientName: name,
      clientEmail: email,
      clientPhone: phone,
      customerId: customerId || undefined,
      notes,
    });
    setSubmitting(false);
    if (!res.success) {
      setError(res.error);
      // The slot was taken since the times loaded — back to pick another.
      if ('conflicts' in res) {
        void selectDate(date);
        setStep('time');
      }
      return;
    }
    setEmailed(res.emailed);
    setPast(res.past);
    setStep('done');
    onBooked();
  }

  function goBack() {
    setError(null);
    if (step === 'sub') setStep('type');
    else if (step === 'practitioner') setStep(group && group !== 'custom' ? 'sub' : 'type');
    else if (step === 'time') {
      if (service && qualifiedStaff(service).length >= 2) setStep('practitioner');
      else setStep(group && group !== 'custom' ? 'sub' : 'type');
    } else if (step === 'details') setStep('time');
  }

  // What happens next for the client, shown once the appointment is saved.
  function doneMessage(): string {
    if (past) return 'Recorded as a completed visit. Nothing was sent to the client, since it’s in the past.';
    if (emailed) return `A confirmation email is on its way to ${email.trim()}.`;
    if (email.trim()) {
      return `Confirmation emails are turned off. Let ${name.trim()} know the appointment is confirmed.`;
    }
    return `No email on file. Let ${name.trim()} know the appointment is confirmed.`;
  }

  function resetToStart() {
    setStep('type');
    setGroup(null);
    setService(null);
    setStaffId('');
    setDate('');
    setDaySlots(null);
    setSlot(null);
    clearClient();
    setNotes('');
    setError(null);
  }

  const summary = service
    ? [
        service.name,
        formatDuration(service.durationMinutes),
        staffName(step === 'details' ? assignedStaffId : staffId),
      ]
        .filter(Boolean)
        .join(' · ')
    : '';
  const activeIndex = step === 'time' ? 1 : step === 'details' ? 2 : 0;
  const prettyDate = date ? format(new Date(`${date}T00:00:00`), 'EEEE, d MMMM yyyy') : '';

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4">
      <div className="my-8 w-full max-w-3xl border border-white-10 bg-dark-800 p-6 sm:p-8">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="font-serif text-2xl text-white">New Appointment</h2>
          <button onClick={onClose} className="text-white-50 hover:text-white text-2xl leading-none">
            ×
          </button>
        </div>

        {step !== 'done' && (
          <div className="mb-8 flex items-center gap-2 sm:gap-4">
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
        )}

        {step !== 'type' && step !== 'done' && (
          <button
            onClick={goBack}
            className="mb-6 inline-flex cursor-pointer items-center gap-1.5 text-sm font-medium tracking-wide text-white-70 transition-colors hover:text-gold"
          >
            <LuChevronLeft className="h-4 w-4" aria-hidden /> Back
          </button>
        )}
        {error && <p className="mb-6 text-sm text-red-400">{error}</p>}

        {/* Step: treatment */}
        {step === 'type' && (
          <div>
            <h3 className="mb-6 font-serif text-xl text-white">Choose a treatment</h3>
            {services.length === 0 ? (
              <p className="text-white-50">No active treatments.</p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {ungrouped.map((s) => (
                  <GroupCard
                    key={s.id}
                    title={s.name}
                    hint={durationLabel(s.durationMinutes, 'en')}
                    description={s.description}
                    price={s.price}
                    firstPrice={s.firstVisitPrice}
                    firstLabel={copy.firstVisit}
                    badge={s.temporary ? copy.seasonal : undefined}
                    onClick={() => chooseService(s)}
                  />
                ))}
                {customService && (
                  <GroupCard
                    title={customService.name}
                    hint={copy.customDuration}
                    description={
                      customService.name === copy.customName ? copy.customDesc : customService.description
                    }
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
                    fromLabel="from"
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
                    fromLabel="from"
                    firstLabel={copy.firstVisit}
                    onClick={() => chooseGroup('focus')}
                  />
                )}
              </div>
            )}
          </div>
        )}

        {/* Step: options within a group (Focus treatments / INDIBA lengths) */}
        {step === 'sub' && group && group !== 'custom' && (
          <div>
            <h3 className="mb-6 font-serif text-xl text-white">
              {group === 'focus' ? copy.focusName : copy.indibaName}
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              {(group === 'focus' ? focusServices : indibaServices).map((s) => (
                <button
                  key={s.id}
                  onClick={() => chooseService(s)}
                  className="flex flex-col border border-white-10 p-5 text-left transition-colors hover:border-gold/40"
                >
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                    <span className="font-serif text-lg text-white">{s.name}</span>
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
                  {s.description && (
                    <span className="mt-3 text-sm font-light leading-relaxed text-white-50">{s.description}</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step: practitioner (only with 2+ qualified) */}
        {step === 'practitioner' && service && (
          <div>
            <h3 className="mb-2 font-serif text-xl text-white">Choose a practitioner</h3>
            <p className="mb-6 text-sm text-white-50">{summary}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                onClick={() => choosePractitioner('')}
                className="border border-white-10 p-5 text-left transition-colors hover:border-gold/40"
              >
                <span className="font-serif text-lg text-white">Any available</span>
                <span className="mt-1 block text-xs text-white-30">Shows the most open times</span>
              </button>
              {qualifiedStaff(service).map((s) => (
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
            <h3 className="mb-2 font-serif text-xl text-white">Pick a date & time</h3>
            <p className="mb-6 text-sm text-white-50">{summary}</p>

            {qualifiedStaff(service).length === 0 ? (
              <p className="text-sm text-white-50">
                No active practitioner is qualified for this treatment. Assign one in Staff.
              </p>
            ) : !policy ? (
              <p className="text-sm text-white-50">Loading calendar…</p>
            ) : (
              <div className="grid gap-6 md:grid-cols-[minmax(0,20rem)_1fr]">
                <MonthCalendar
                  businessHours={policy.businessHours}
                  maxAdvanceDays={policy.maxAdvanceDays}
                  allowPast
                  blockedDates={policy.blockedDates}
                  locale="en"
                  selectedDate={date || defaultDate}
                  onSelectDate={selectDate}
                  prevLabel="Previous month"
                  nextLabel="Next month"
                />

                <div>
                  {loadingSlots && <p className="text-sm text-white-50">Finding times…</p>}
                  {!loadingSlots && daySlots && (
                    <>
                      <p className="mb-3 text-sm text-white-70">{prettyDate}</p>
                      {isPastDate && (
                        <p className="mb-4 text-xs text-gold">
                          This day is in the past: the visit is saved as completed and no messages are
                          sent.
                        </p>
                      )}
                      <SlotPicker slots={daySlots} onPick={pickSlot} onOtherTime={pickOtherTime} />
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step: client */}
        {step === 'details' && service && slot && (
          <div>
            <h3 className="mb-2 font-serif text-xl text-white">Client</h3>
            <p className="mb-6 text-sm text-white-50">
              {summary} · {prettyDate} at {slot.time}
            </p>

            {(slot.staffIds.length > 1 || slot.roomIds.length > 1) && (
              <div className="mb-6 grid gap-4 sm:grid-cols-2">
                {slot.staffIds.length > 1 && (
                  <Select
                    id="wb-slot-staff"
                    label="Practitioner"
                    value={assignedStaffId}
                    onChange={(e) => setAssignedStaffId(e.target.value)}
                    options={slot.staffIds.map((id) => ({ value: id, label: staffName(id) ?? id }))}
                  />
                )}
                {slot.roomIds.length > 1 && (
                  <Select
                    id="wb-slot-room"
                    label="Room"
                    value={assignedRoomId}
                    onChange={(e) => setAssignedRoomId(e.target.value)}
                    options={slot.roomIds.map((id) => ({ value: id, label: roomName(id) }))}
                  />
                )}
              </div>
            )}

            {customerId ? (
              <p className="mb-4 text-sm text-white-50">
                Existing client.{' '}
                <button onClick={clearClient} className="text-gold hover:text-gold-light">
                  Choose someone else
                </button>
              </p>
            ) : (
              <div className="relative mb-4">
                <Input
                  id="wb-search"
                  placeholder="Search existing clients by name, email or phone…"
                  value={search}
                  onChange={(e) => runSearch(e.target.value)}
                />
                {matches.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full border border-white-10 bg-dark-900 shadow-lg">
                    {matches.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => pickClient(c)}
                        className="block w-full px-4 py-2 text-left text-sm text-white-70 hover:bg-white-10"
                      >
                        <span className="text-white">{c.name}</span>
                        {(c.phone || c.email) && (
                          <span className="text-white-30"> · {c.phone || c.email}</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="space-y-4">
              <Input id="wb-name" label="Name" value={name} onChange={(e) => setName(e.target.value)} />
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  id="wb-email"
                  label="Email (optional)"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <Input
                  id="wb-phone"
                  label="Phone (optional)"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              <p className="text-xs text-white-30">
                With an email, the client gets a confirmation. Without one, let them know it’s
                confirmed yourself.
              </p>
              <Textarea
                id="wb-notes"
                label="Notes (optional)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>

            <div className="mt-6 flex gap-3">
              <Button variant="elegant" onClick={book} disabled={submitting}>
                {submitting ? 'Booking…' : 'Book Appointment'}
              </Button>
              <Button variant="ghost" onClick={onClose} disabled={submitting}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Booked */}
        {step === 'done' && service && slot && (
          <div className="py-4 text-center">
            <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full border border-gold/40">
              <svg className="h-7 w-7 text-gold" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <h3 className="font-serif text-2xl text-white">{past ? 'Saved' : 'Booked'}</h3>
            <p className="mt-4 text-white-70">
              {name.trim()} · {service.name}
              {staffName(assignedStaffId) ? ` with ${staffName(assignedStaffId)}` : ''}
              <br />
              {prettyDate} at {slot.time}
            </p>
            <p className={`mx-auto mt-4 max-w-md text-sm ${emailed || past ? 'text-white-50' : 'text-gold'}`}>
              {doneMessage()}
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button variant="elegant" onClick={onClose}>
                Done
              </Button>
              <Button variant="ghost" onClick={resetToStart}>
                Book another
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
