'use client';

import { useState } from 'react';
import { Button, Input, Select } from '@/components/ui';
import { getAvailability, bookWalkIn, searchClients } from '@/actions/scheduling';
import type { Service, Staff, Room } from '@mediterranea/shared/types';

interface Slot {
  time: string;
  staffIds: string[];
  roomIds: string[];
}
interface ClientMatch {
  id: string;
  name: string;
  email: string;
  phone: string;
}

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
  const [serviceId, setServiceId] = useState('');
  const [date, setDate] = useState(initialDate);
  const [staffFilter, setStaffFilter] = useState(''); // '' = any

  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [finding, setFinding] = useState(false);
  const [availError, setAvailError] = useState<string | null>(null);

  const [selectedTime, setSelectedTime] = useState('');
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [selectedRoomId, setSelectedRoomId] = useState('');

  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [notes, setNotes] = useState('');

  const [search, setSearch] = useState('');
  const [matches, setMatches] = useState<ClientMatch[]>([]);

  const [booking, setBooking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const staffName = (id: string) => staff.find((s) => s.id === id)?.name ?? id;
  const roomName = (id: string) => rooms.find((r) => r.id === id)?.name ?? id;

  function resetAvailability() {
    setSlots(null);
    setSelectedTime('');
    setSelectedStaffId('');
    setSelectedRoomId('');
  }

  async function findTimes() {
    if (!serviceId || !date) {
      setAvailError('Choose a service and date first.');
      return;
    }
    setFinding(true);
    setAvailError(null);
    resetAvailability();
    const result = await getAvailability(serviceId, date, staffFilter || undefined);
    setFinding(false);
    if ('error' in result) {
      setAvailError(result.error);
      return;
    }
    setSlots(result.slots);
    if (result.slots.length === 0) {
      setAvailError('No open times for that service, date, and practitioner.');
    }
  }

  function pickTime(slot: Slot) {
    setSelectedTime(slot.time);
    setSelectedStaffId(staffFilter && slot.staffIds.includes(staffFilter) ? staffFilter : slot.staffIds[0]);
    setSelectedRoomId(slot.roomIds[0]);
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
    setClientName(c.name);
    setClientEmail(c.email);
    setClientPhone(c.phone);
    setSearch('');
    setMatches([]);
  }

  async function book() {
    if (!selectedTime || !selectedStaffId || !selectedRoomId) {
      setError('Pick an available time slot.');
      return;
    }
    if (!clientName.trim() || !clientEmail.trim() || !clientPhone.trim()) {
      setError('Client name, email, and phone are required.');
      return;
    }
    setBooking(true);
    setError(null);
    const res = await bookWalkIn({
      serviceId,
      date,
      time: selectedTime,
      staffId: selectedStaffId,
      roomId: selectedRoomId,
      clientName,
      clientEmail,
      clientPhone,
      notes,
    });
    setBooking(false);
    if (res.success) {
      onBooked();
      onClose();
    } else {
      setError(res.error);
      // A conflict means the slot was taken since we searched — refresh times.
      if ('conflicts' in res) resetAvailability();
    }
  }

  const activeSlot = slots?.find((s) => s.time === selectedTime);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4">
      <div className="my-8 w-full max-w-2xl border border-white-10 bg-dark-800 p-8">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="font-serif text-2xl text-white">New Appointment</h2>
          <button onClick={onClose} className="text-white-50 hover:text-white text-2xl leading-none">
            ×
          </button>
        </div>

        <div className="space-y-6">
          {/* Service + date + staff */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Select
              id="wb-service"
              label="Treatment"
              placeholder="Select…"
              value={serviceId}
              onChange={(e) => {
                setServiceId(e.target.value);
                resetAvailability();
              }}
              options={services.map((s) => ({ value: s.id, label: `${s.name} (${s.durationMinutes}m)` }))}
            />
            <Input
              id="wb-date"
              label="Date"
              type="date"
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                resetAvailability();
              }}
            />
            <Select
              id="wb-staff"
              label="Practitioner"
              value={staffFilter}
              onChange={(e) => {
                setStaffFilter(e.target.value);
                resetAvailability();
              }}
              options={[
                { value: '', label: 'Any' },
                ...staff.map((s) => ({ value: s.id, label: s.name })),
              ]}
            />
          </div>

          <Button variant="outline" onClick={findTimes} disabled={finding}>
            {finding ? 'Finding…' : 'Find available times'}
          </Button>

          {availError && <p className="text-sm text-white-50">{availError}</p>}

          {/* Slots */}
          {slots && slots.length > 0 && (
            <div>
              <p className="mb-2 text-sm text-white-70">Available times</p>
              <div className="flex flex-wrap gap-2">
                {slots.map((slot) => (
                  <button
                    key={slot.time}
                    onClick={() => pickTime(slot)}
                    className={`px-4 py-2 text-sm border transition-colors ${
                      selectedTime === slot.time
                        ? 'border-gold bg-gold/15 text-gold'
                        : 'border-white-10 text-white-70 hover:border-white-30'
                    }`}
                  >
                    {slot.time}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Staff/room for the chosen slot */}
          {activeSlot && (
            <div className="grid gap-4 sm:grid-cols-2 border-t border-white-10 pt-6">
              <Select
                id="wb-slot-staff"
                label="Assign practitioner"
                value={selectedStaffId}
                onChange={(e) => setSelectedStaffId(e.target.value)}
                options={activeSlot.staffIds.map((id) => ({ value: id, label: staffName(id) }))}
              />
              <Select
                id="wb-slot-room"
                label="Assign room"
                value={selectedRoomId}
                onChange={(e) => setSelectedRoomId(e.target.value)}
                options={activeSlot.roomIds.map((id) => ({ value: id, label: roomName(id) }))}
              />
            </div>
          )}

          {/* Client */}
          <div className="border-t border-white-10 pt-6">
            <p className="mb-3 text-sm font-medium tracking-wide text-white-70">Client</p>

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
                      <span className="text-white-30"> · {c.phone}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <Input id="wb-name" label="Name" value={clientName} onChange={(e) => setClientName(e.target.value)} />
              <Input
                id="wb-email"
                label="Email"
                type="email"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
              />
              <Input id="wb-phone" label="Phone" value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} />
            </div>
            <div className="mt-4">
              <Input id="wb-notes" label="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="flex gap-3 border-t border-white-10 pt-6">
            <Button variant="elegant" onClick={book} disabled={booking || !activeSlot}>
              {booking ? 'Booking…' : 'Book Appointment'}
            </Button>
            <Button variant="ghost" onClick={onClose} disabled={booking}>
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
