'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Button, Badge, Textarea, Select } from '@/components/ui';
import { APPOINTMENT_STATUSES, PAYMENT_METHODS } from '@mediterranea/shared/constants';
import { formatDuration, formatPrice } from '@mediterranea/shared/utils';
import {
  updateAppointmentStatus,
  deleteAppointment,
  saveAppointmentNotes,
  saveAppointmentPrice,
  saveAppointmentPayment,
} from '@/actions/appointments';
import {
  getAppointmentPassInfo,
  getBackofficeSlots,
  getSchedulingRefs,
  rescheduleAppointment,
} from '@/actions/scheduling';
import type { AppointmentPass } from '@/lib/agent/data';
import { SlotPicker, type BackofficeSlot } from '@/components/scheduling/slot-picker';
import { TreatmentRecord } from '@/components/appointments/treatment-record';
import type {
  Appointment,
  AppointmentStatus,
  PaymentMethod,
  Service,
  Staff,
  Room,
} from '@mediterranea/shared/types';

interface Refs {
  services: Service[];
  staff: Staff[];
  rooms: Room[];
}

/** Statuses whose treatment, date and time can still be edited — past visits included. */
const EDITABLE = new Set<AppointmentStatus>(['pending', 'confirmed', 'checked-in', 'completed', 'no-show']);

type Tone = 'primary' | 'neutral' | 'danger';

const statusActions: Record<
  AppointmentStatus,
  { next: AppointmentStatus; label: string; tone: Tone }[]
> = {
  pending: [
    { next: 'confirmed', label: 'Confirm', tone: 'primary' },
    { next: 'rejected', label: 'Reject', tone: 'danger' },
    { next: 'cancelled', label: 'Cancel', tone: 'danger' },
  ],
  // No check-in step: staff complete an appointment straight away when it's done.
  confirmed: [
    { next: 'completed', label: 'Complete', tone: 'primary' },
    { next: 'no-show', label: 'No-show', tone: 'neutral' },
    { next: 'rejected', label: 'Reject', tone: 'danger' },
    { next: 'cancelled', label: 'Cancel', tone: 'danger' },
  ],
  // Older appointments may still be checked in.
  'checked-in': [
    { next: 'completed', label: 'Complete', tone: 'primary' },
    { next: 'no-show', label: 'No-show', tone: 'neutral' },
  ],
  completed: [],
  cancelled: [],
  rejected: [],
  'no-show': [],
};

const SOURCE_LABELS: Record<NonNullable<Appointment['source']>, string> = {
  online: 'Online',
  'walk-in': 'Walk-in',
  agent: 'Assistant',
};

interface AppointmentModalProps {
  appointment: Appointment;
  onClose: () => void;
  onUpdate: () => void;
  /** Optional refs to resolve practitioner / room names for the detail view. */
  staff?: Staff[];
  rooms?: Room[];
}

export function AppointmentModal({
  appointment,
  onClose,
  onUpdate,
  staff,
  rooms,
}: AppointmentModalProps) {
  const [actionLoading, setActionLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [mode, setMode] = useState<'detail' | 'edit'>('detail');

  // Edit flow: treatment, date, time, practitioner, room.
  const [refs, setRefs] = useState<Refs | null>(null);
  const [eServiceId, setEServiceId] = useState(appointment.serviceId);
  const [eDate, setEDate] = useState(appointment.appointmentDate);
  const [slots, setSlots] = useState<BackofficeSlot[] | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [chosen, setChosen] = useState<BackofficeSlot | null>(null);
  const [chosenStaff, setChosenStaff] = useState('');
  const [chosenRoom, setChosenRoom] = useState('');
  const [saving, setSaving] = useState(false);
  const [eError, setEError] = useState<string | null>(null);

  // The pass this appointment is a session of, if any.
  const [pass, setPass] = useState<AppointmentPass | null>(null);
  useEffect(() => {
    if (!appointment.passId) return;
    getAppointmentPassInfo(appointment.id).then(setPass);
  }, [appointment.id, appointment.passId]);

  const [notes, setNotes] = useState(appointment.notes ?? '');
  const [savedNotes, setSavedNotes] = useState(appointment.notes ?? '');
  const [savingNotes, setSavingNotes] = useState(false);

  // The price agreed when booking; editable for corrections such as a discount.
  const [price, setPrice] = useState<number | undefined>(appointment.price);
  const [priceInput, setPriceInput] = useState('');
  const [editingPrice, setEditingPrice] = useState(false);
  const [savingPrice, setSavingPrice] = useState(false);
  const [priceError, setPriceError] = useState<string | null>(null);
  const [payment, setPayment] = useState<PaymentMethod | undefined>(appointment.paymentMethod);
  const [savingPayment, setSavingPayment] = useState(false);
  const notesDirty = notes !== savedNotes;

  const staffName = appointment.staffId
    ? staff?.find((s) => s.id === appointment.staffId)?.name
    : undefined;
  const roomName = appointment.roomId
    ? rooms?.find((r) => r.id === appointment.roomId)?.name
    : undefined;

  async function handleStatusChange(newStatus: AppointmentStatus) {
    setActionLoading(true);
    const result = await updateAppointmentStatus(appointment.id, newStatus);
    if (result.success) {
      onUpdate();
      onClose();
    }
    setActionLoading(false);
  }

  async function handleSavePrice() {
    const value = Number(priceInput.replace(',', '.'));
    setSavingPrice(true);
    setPriceError(null);
    const result = await saveAppointmentPrice(appointment.id, value);
    setSavingPrice(false);
    if (!result.success) {
      setPriceError(result.error ?? 'Failed to save the price.');
      return;
    }
    setPrice(Math.round(value * 100) / 100);
    setEditingPrice(false);
    onUpdate();
  }

  // Tapping the recorded method again clears it.
  async function handlePayment(method: PaymentMethod) {
    const next = payment === method ? null : method;
    setSavingPayment(true);
    setPriceError(null);
    const result = await saveAppointmentPayment(appointment.id, next);
    setSavingPayment(false);
    if (!result.success) {
      setPriceError(result.error ?? 'Failed to save the payment method.');
      return;
    }
    setPayment(next ?? undefined);
    onUpdate();
  }

  async function handleSaveNotes() {
    setSavingNotes(true);
    const result = await saveAppointmentNotes(appointment.id, notes);
    if (result.success) {
      setSavedNotes(notes);
      onUpdate();
    }
    setSavingNotes(false);
  }

  async function handleDelete() {
    setActionLoading(true);
    const result = await deleteAppointment(appointment.id);
    if (result.success) {
      onUpdate();
      onClose();
    }
    setActionLoading(false);
  }

  function pickSlot(slot: BackofficeSlot) {
    setChosen(slot);
    setChosenStaff(
      appointment.staffId && slot.staffIds.includes(appointment.staffId)
        ? appointment.staffId
        : (slot.staffIds[0] ?? '')
    );
    setChosenRoom(
      appointment.roomId && slot.roomIds.includes(appointment.roomId)
        ? appointment.roomId
        : (slot.roomIds[0] ?? '')
    );
  }

  // A time off the grid: any qualified practitioner and matching room; the
  // server still refuses a clash.
  function otherSlot(time: string, serviceId: string, r: Refs): BackofficeSlot {
    const service = r.services.find((sv) => sv.id === serviceId);
    return {
      time,
      available: true,
      staffIds: r.staff.filter((p) => p.serviceIds?.includes(serviceId)).map((p) => p.id),
      roomIds: r.rooms
        .filter((room) => !service?.roomType || room.type === service.roomType)
        .map((room) => room.id),
    };
  }

  async function loadSlots(serviceId: string, date: string, r: Refs) {
    setLoadingSlots(true);
    setEError(null);
    setSlots(null);
    setChosen(null);
    const res = await getBackofficeSlots(serviceId, date, { ignoreAppointmentId: appointment.id });
    setLoadingSlots(false);
    if ('error' in res) {
      setEError(res.error);
      return;
    }
    setSlots(res.slots);
    // Keep the current time selected while it still fits, so changing only the
    // treatment is a single save.
    if (date === appointment.appointmentDate) {
      const current = res.slots.find((sl) => sl.time === appointment.appointmentTime);
      if (current?.available) pickSlot(current);
      else if (!current) pickSlot(otherSlot(appointment.appointmentTime, serviceId, r));
    }
  }

  async function openEdit() {
    setMode('edit');
    setEServiceId(appointment.serviceId);
    setEDate(appointment.appointmentDate);
    setEError(null);
    let r = refs;
    if (!r) {
      const res = await getSchedulingRefs();
      if (!res.success) {
        setEError(res.error);
        return;
      }
      r = { services: res.services, staff: res.staff, rooms: res.rooms };
      setRefs(r);
    }
    await loadSlots(appointment.serviceId, appointment.appointmentDate, r);
  }

  async function saveEdit() {
    if (!chosen || !chosenStaff || !chosenRoom) return;
    setSaving(true);
    setEError(null);
    const res = await rescheduleAppointment(appointment.id, {
      date: eDate,
      time: chosen.time,
      staffId: chosenStaff,
      roomId: chosenRoom,
      ...(eServiceId !== appointment.serviceId && { serviceId: eServiceId }),
    });
    setSaving(false);
    if (res.success) {
      onUpdate();
      onClose();
    } else {
      setEError(res.error);
    }
  }

  const nameOfStaff = (id: string) =>
    (refs?.staff ?? staff)?.find((s) => s.id === id)?.name ?? id;
  const nameOfRoom = (id: string) => (refs?.rooms ?? rooms)?.find((r) => r.id === id)?.name ?? id;
  // Keep the current treatment selectable even if it has since been retired.
  const serviceOptions = refs
    ? [
        ...(refs.services.some((sv) => sv.id === appointment.serviceId)
          ? []
          : [{ value: appointment.serviceId, label: appointment.serviceName }]),
        // An appointment is one session, so passes aren't offered as its treatment.
        ...refs.services.filter((sv) => !sv.bundle).map((sv) => ({
          value: sv.id,
          label: `${sv.name} (${formatDuration(sv.durationMinutes)})`,
        })),
      ]
    : [];

  const actions = statusActions[appointment.status];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto border border-white-10 bg-dark-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-white-10">
          <div>
            <h2 className="font-serif text-2xl text-white">{appointment.clientName}</h2>
            <p className="mt-1 text-gold">{appointment.serviceName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-white-50 hover:text-white transition-colors p-1"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {mode === 'edit' ? (
          <>
            {/* Edit body */}
            <div className="p-6 space-y-5">
              <p className="text-sm text-white-50">
                Change the treatment, date or time. Past dates are fine for correcting a visit;
                clashes with other bookings are still blocked. The client isn’t notified.
              </p>

              {refs && (
                <Select
                  id="e-service"
                  label="Treatment"
                  value={eServiceId}
                  onChange={(e) => {
                    setEServiceId(e.target.value);
                    void loadSlots(e.target.value, eDate, refs);
                  }}
                  options={serviceOptions}
                />
              )}

              <div>
                <label className="mb-2 block text-sm font-medium tracking-wide text-white-70">Date</label>
                <input
                  type="date"
                  value={eDate}
                  onChange={(e) => {
                    setEDate(e.target.value);
                    if (e.target.value && refs) void loadSlots(eServiceId, e.target.value, refs);
                  }}
                  className="h-12 w-full border border-white-10 bg-dark-800 px-4 text-white focus:border-gold focus:outline-none"
                />
              </div>

              {eError && <p className="text-sm text-red-400">{eError}</p>}
              {loadingSlots && <p className="text-sm text-white-50">Finding times…</p>}
              {!loadingSlots && slots && refs && (
                <SlotPicker
                  slots={slots}
                  selected={chosen?.time}
                  onPick={pickSlot}
                  onOtherTime={(time) => pickSlot(otherSlot(time, eServiceId, refs))}
                />
              )}

              {chosen && (
                <div className="space-y-4 border-t border-white-10 pt-5">
                  <p className="text-sm text-white-70">
                    New time:{' '}
                    <span className="text-white">
                      {format(new Date(`${eDate}T00:00:00`), 'MMMM d, yyyy')} at {chosen.time}
                    </span>
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <Select
                      id="e-staff"
                      label="Practitioner"
                      value={chosenStaff}
                      onChange={(e) => setChosenStaff(e.target.value)}
                      options={chosen.staffIds.map((id) => ({ value: id, label: nameOfStaff(id) }))}
                    />
                    <Select
                      id="e-room"
                      label="Room"
                      value={chosenRoom}
                      onChange={(e) => setChosenRoom(e.target.value)}
                      options={chosen.roomIds.map((id) => ({ value: id, label: nameOfRoom(id) }))}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Edit actions */}
            <div className="flex items-center gap-3 border-t border-white-10 p-6">
              <Button
                variant="elegant"
                size="sm"
                onClick={saveEdit}
                disabled={saving || !chosen || !chosenStaff || !chosenRoom}
              >
                {saving ? 'Saving…' : 'Save changes'}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setMode('detail')} disabled={saving}>
                Back
              </Button>
            </div>
          </>
        ) : (
          <>
        {/* Body */}
        <div className="p-6 space-y-5">
          <div className="flex items-center gap-3">
            <Badge variant={appointment.status}>
              {APPOINTMENT_STATUSES[appointment.status].label}
            </Badge>
            {appointment.source && (
              <span className="text-[11px] uppercase tracking-wider text-white-30">
                {SOURCE_LABELS[appointment.source]}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-white-30 text-xs uppercase tracking-wider">Date</span>
              <p className="text-white mt-1">
                {format(new Date(appointment.appointmentDate + 'T00:00:00'), 'MMMM d, yyyy')}
              </p>
            </div>
            <div>
              <span className="text-white-30 text-xs uppercase tracking-wider">Time</span>
              <p className="text-white mt-1">
                {appointment.appointmentTime}
                {appointment.durationMinutes ? (
                  <span className="text-white-30"> · {appointment.durationMinutes} min</span>
                ) : null}
              </p>
            </div>
          </div>

          <div className="text-sm">
            <span className="text-white-30 text-xs uppercase tracking-wider">Price</span>
            {editingPrice ? (
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={priceInput}
                  onChange={(e) => setPriceInput(e.target.value)}
                  aria-label="Price in euros"
                  className="h-9 w-28 border border-white-10 bg-dark-800 px-3 text-white focus:border-gold focus:outline-none"
                />
                <Button variant="ghost" size="sm" onClick={handleSavePrice} disabled={savingPrice || !priceInput}>
                  {savingPrice ? 'Saving…' : 'Save'}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setEditingPrice(false)} disabled={savingPrice}>
                  Cancel
                </Button>
                {priceError && <span className="text-xs text-red-400">{priceError}</span>}
              </div>
            ) : (
              <p className="text-white mt-1">
                {price !== undefined ? formatPrice(price) : <span className="text-white-30">Not recorded</span>}
                <button
                  type="button"
                  onClick={() => {
                    setPriceInput(price !== undefined ? String(price) : '');
                    setPriceError(null);
                    setEditingPrice(true);
                  }}
                  className="ml-3 text-xs text-gold hover:text-gold-light"
                >
                  {price !== undefined ? 'Change' : 'Set'}
                </button>
              </p>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="text-xs text-white-50">Paid by</span>
              {(Object.keys(PAYMENT_METHODS) as PaymentMethod[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  disabled={savingPayment}
                  aria-pressed={payment === m}
                  onClick={() => void handlePayment(m)}
                  className={`border px-3 py-1 text-xs transition-colors disabled:opacity-50 ${
                    payment === m
                      ? 'border-gold bg-gold/15 text-white'
                      : 'border-white-10 text-white-50 hover:border-white-30 hover:text-white'
                  }`}
                >
                  {PAYMENT_METHODS[m]}
                </button>
              ))}
              {!editingPrice && priceError && <span className="text-xs text-red-400">{priceError}</span>}
            </div>
          </div>

          {(staffName || roomName) && (
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-white-30 text-xs uppercase tracking-wider">Practitioner</span>
                <p className="text-white mt-1">{staffName ?? '—'}</p>
              </div>
              <div>
                <span className="text-white-30 text-xs uppercase tracking-wider">Room</span>
                <p className="text-white mt-1">{roomName ?? '—'}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-white-30 text-xs uppercase tracking-wider">Email</span>
              <p className="mt-1">
                {appointment.clientEmail ? (
                  <a
                    href={`mailto:${appointment.clientEmail}`}
                    className="text-gold hover:text-gold-light transition-colors break-all"
                  >
                    {appointment.clientEmail}
                  </a>
                ) : (
                  <span className="text-white-30">—</span>
                )}
              </p>
            </div>
            <div>
              <span className="text-white-30 text-xs uppercase tracking-wider">Phone</span>
              <p className="mt-1">
                {appointment.clientPhone ? (
                  <a
                    href={`tel:${appointment.clientPhone}`}
                    className="text-gold hover:text-gold-light transition-colors"
                  >
                    {appointment.clientPhone}
                  </a>
                ) : (
                  <span className="text-white-30">—</span>
                )}
              </p>
            </div>
          </div>

          {pass && (
            <div className="text-sm">
              <span className="text-white-30 text-xs uppercase tracking-wider">Pack</span>
              <p className="text-white mt-1">
                {pass.name}
                {pass.session ? ` · session ${pass.session} of ${pass.sessions}` : ''}
              </p>
              <p className="mt-0.5 text-xs text-white-50">
                {pass.used} used · {pass.booked} booked · {pass.remaining} left to book
              </p>
              {pass.session === 1 && (
                <p className="mt-1 text-xs text-gold">
                  First session: {formatPrice(pass.price)} for the pack, paid at the studio.
                </p>
              )}
            </div>
          )}

          <TreatmentRecord appointment={appointment} onSaved={onUpdate} />

          {/* General notes (editable); also holds what the client wrote when booking. */}
          <div className="text-sm">
            <div className="flex items-center justify-between">
              <span className="text-white-30 text-xs uppercase tracking-wider">Notes</span>
              {notesDirty && (
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={savingNotes}
                  onClick={handleSaveNotes}
                  className="text-gold hover:text-gold-light -my-1"
                >
                  {savingNotes ? 'Saving…' : 'Save'}
                </Button>
              )}
            </div>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Booking notes, client requests, anything else…"
              rows={3}
              className="mt-2"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="p-6 border-t border-white-10">
          {showDeleteConfirm ? (
            <div className="space-y-3">
              <p className="text-sm text-red-400">Are you sure you want to delete this appointment?</p>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={actionLoading}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleDelete}
                  disabled={actionLoading}
                  className="bg-red-500 text-white hover:bg-red-600 border-0"
                >
                  {actionLoading ? 'Deleting...' : 'Confirm Delete'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              {actions.map((action) => (
                <Button
                  key={action.next}
                  variant={action.tone === 'primary' ? 'elegant' : 'outline'}
                  size="sm"
                  disabled={actionLoading}
                  onClick={() => handleStatusChange(action.next)}
                  className={
                    action.tone === 'danger'
                      ? 'text-red-400 border-red-500/40 hover:bg-red-500/10'
                      : undefined
                  }
                >
                  {action.label}
                </Button>
              ))}
              {actions.length === 0 && (
                <span className="text-xs text-white-30">
                  This appointment is {APPOINTMENT_STATUSES[appointment.status].label.toLowerCase()}.
                </span>
              )}
              {EDITABLE.has(appointment.status) && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={actionLoading}
                  onClick={() => void openEdit()}
                  className="ml-auto"
                >
                  Edit
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                disabled={actionLoading}
                onClick={() => setShowDeleteConfirm(true)}
                className={`text-red-400 hover:text-red-300 hover:bg-red-500/10 ${
                  EDITABLE.has(appointment.status) ? '' : 'ml-auto'
                }`}
              >
                Delete
              </Button>
            </div>
          )}
        </div>
          </>
        )}
      </div>
    </div>
  );
}
