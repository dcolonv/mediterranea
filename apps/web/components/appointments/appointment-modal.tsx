'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { Button, Badge, Textarea, Select } from '@/components/ui';
import { APPOINTMENT_STATUSES } from '@mediterranea/shared/constants';
import {
  updateAppointmentStatus,
  deleteAppointment,
  saveAppointmentNotes,
} from '@/actions/appointments';
import { getAvailability, rescheduleAppointment } from '@/actions/scheduling';
import type { Appointment, AppointmentStatus, Staff, Room } from '@mediterranea/shared/types';

interface Slot {
  time: string;
  staffIds: string[];
  roomIds: string[];
}

/** Statuses that can still be rescheduled. */
const RESCHEDULABLE = new Set<AppointmentStatus>(['pending', 'confirmed', 'checked-in']);

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
  confirmed: [
    { next: 'checked-in', label: 'Check In', tone: 'primary' },
    { next: 'no-show', label: 'No-show', tone: 'neutral' },
    { next: 'rejected', label: 'Reject', tone: 'danger' },
    { next: 'cancelled', label: 'Cancel', tone: 'danger' },
  ],
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
  const [mode, setMode] = useState<'detail' | 'reschedule'>('detail');

  // Reschedule flow.
  const [rDate, setRDate] = useState(appointment.appointmentDate);
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [chosen, setChosen] = useState<Slot | null>(null);
  const [chosenStaff, setChosenStaff] = useState('');
  const [chosenRoom, setChosenRoom] = useState('');
  const [rescheduling, setRescheduling] = useState(false);
  const [rError, setRError] = useState<string | null>(null);

  const [notes, setNotes] = useState(appointment.notes ?? '');
  const [savedNotes, setSavedNotes] = useState(appointment.notes ?? '');
  const [savingNotes, setSavingNotes] = useState(false);
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

  function openReschedule() {
    setMode('reschedule');
    setRDate(appointment.appointmentDate);
    setSlots(null);
    setChosen(null);
    setRError(null);
  }

  async function findTimes() {
    setLoadingSlots(true);
    setRError(null);
    setChosen(null);
    setSlots(null);
    const res = await getAvailability(appointment.serviceId, rDate);
    setLoadingSlots(false);
    if ('error' in res) {
      setRError(res.error);
      return;
    }
    setSlots(res.slots);
  }

  function pickSlot(s: Slot) {
    setChosen(s);
    setChosenStaff(
      appointment.staffId && s.staffIds.includes(appointment.staffId)
        ? appointment.staffId
        : (s.staffIds[0] ?? '')
    );
    setChosenRoom(
      appointment.roomId && s.roomIds.includes(appointment.roomId)
        ? appointment.roomId
        : (s.roomIds[0] ?? '')
    );
  }

  async function confirmReschedule() {
    if (!chosen || !chosenStaff || !chosenRoom) return;
    setRescheduling(true);
    setRError(null);
    const res = await rescheduleAppointment(appointment.id, {
      date: rDate,
      time: chosen.time,
      staffId: chosenStaff,
      roomId: chosenRoom,
    });
    setRescheduling(false);
    if (res.success) {
      onUpdate();
      onClose();
    } else {
      // Slot may have been taken since we looked — reset and let them re-search.
      setRError(res.error);
      setSlots(null);
      setChosen(null);
    }
  }

  const nameOfStaff = (id: string) => staff?.find((s) => s.id === id)?.name ?? id;
  const nameOfRoom = (id: string) => rooms?.find((r) => r.id === id)?.name ?? id;

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

        {mode === 'reschedule' ? (
          <>
            {/* Reschedule body */}
            <div className="p-6 space-y-5">
              <p className="text-sm text-white-50">
                Find a new time for <span className="text-white">{appointment.serviceName}</span>.
                Availability respects practitioner hours, rooms, and existing bookings.
              </p>

              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <label className="mb-2 block text-sm font-medium tracking-wide text-white-70">
                    Date
                  </label>
                  <input
                    type="date"
                    value={rDate}
                    onChange={(e) => {
                      setRDate(e.target.value);
                      setSlots(null);
                      setChosen(null);
                    }}
                    className="h-12 w-full border border-white-10 bg-dark-800 px-4 text-white focus:border-gold focus:outline-none"
                  />
                </div>
                <Button variant="outline" onClick={findTimes} disabled={loadingSlots}>
                  {loadingSlots ? 'Finding…' : 'Find times'}
                </Button>
              </div>

              {rError && <p className="text-sm text-red-400">{rError}</p>}

              {slots && slots.length === 0 && (
                <p className="text-sm text-white-50">No open times on this date.</p>
              )}

              {slots && slots.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {slots.map((s) => (
                    <button
                      key={s.time}
                      onClick={() => pickSlot(s)}
                      className={`px-3 py-2 text-sm transition-colors ${
                        chosen?.time === s.time
                          ? 'bg-gold text-charcoal'
                          : 'border border-white-10 text-white-70 hover:border-white-30'
                      }`}
                    >
                      {s.time}
                    </button>
                  ))}
                </div>
              )}

              {chosen && (
                <div className="grid grid-cols-2 gap-4">
                  <Select
                    id="r-staff"
                    label="Practitioner"
                    value={chosenStaff}
                    onChange={(e) => setChosenStaff(e.target.value)}
                    options={chosen.staffIds.map((id) => ({ value: id, label: nameOfStaff(id) }))}
                  />
                  <Select
                    id="r-room"
                    label="Room"
                    value={chosenRoom}
                    onChange={(e) => setChosenRoom(e.target.value)}
                    options={chosen.roomIds.map((id) => ({ value: id, label: nameOfRoom(id) }))}
                  />
                </div>
              )}
            </div>

            {/* Reschedule actions */}
            <div className="flex items-center gap-3 border-t border-white-10 p-6">
              <Button
                variant="elegant"
                size="sm"
                onClick={confirmReschedule}
                disabled={rescheduling || !chosen || !chosenStaff || !chosenRoom}
              >
                {rescheduling ? 'Saving…' : 'Confirm reschedule'}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMode('detail')}
                disabled={rescheduling}
              >
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
                <a
                  href={`mailto:${appointment.clientEmail}`}
                  className="text-gold hover:text-gold-light transition-colors break-all"
                >
                  {appointment.clientEmail}
                </a>
              </p>
            </div>
            <div>
              <span className="text-white-30 text-xs uppercase tracking-wider">Phone</span>
              <p className="mt-1">
                <a
                  href={`tel:${appointment.clientPhone}`}
                  className="text-gold hover:text-gold-light transition-colors"
                >
                  {appointment.clientPhone}
                </a>
              </p>
            </div>
          </div>

          {/* Treatment notes (editable) */}
          <div className="text-sm">
            <div className="flex items-center justify-between">
              <span className="text-white-30 text-xs uppercase tracking-wider">Treatment notes</span>
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
              placeholder="Add treatment notes, observations, or aftercare given…"
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
              {RESCHEDULABLE.has(appointment.status) && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={actionLoading}
                  onClick={openReschedule}
                  className="ml-auto"
                >
                  Reschedule
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                disabled={actionLoading}
                onClick={() => setShowDeleteConfirm(true)}
                className={`text-red-400 hover:text-red-300 hover:bg-red-500/10 ${
                  RESCHEDULABLE.has(appointment.status) ? '' : 'ml-auto'
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
