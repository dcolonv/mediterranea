'use client';

import { useState, useEffect } from 'react';
import { Button, Input, Badge } from '@/components/ui';
import { getStaffList, createStaff, updateStaff, deleteStaff } from '@/actions/staff';
import { getAllServices } from '@/actions/services';
import type { Staff, Service, DayHours, Weekday, TimeOff } from '@mediterranea/shared/types';
import type { StaffFormData } from '@mediterranea/shared/validations';

const WEEKDAYS: { key: Weekday; label: string }[] = [
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday' },
  { key: 'saturday', label: 'Saturday' },
  { key: 'sunday', label: 'Sunday' },
];

type HoursMap = Partial<Record<Weekday, DayHours | null>>;

const DEFAULT_HOURS: HoursMap = {
  monday: { open: '09:00', close: '18:00' },
  tuesday: { open: '09:00', close: '18:00' },
  wednesday: { open: '09:00', close: '18:00' },
  thursday: { open: '09:00', close: '18:00' },
  friday: { open: '09:00', close: '18:00' },
  saturday: { open: '10:00', close: '16:00' },
  sunday: null,
};

export function BackofficeStaff() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null); // null = list, '' = new

  // Form fields
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [active, setActive] = useState(true);
  const [serviceIds, setServiceIds] = useState<string[]>([]);
  const [hours, setHours] = useState<HoursMap>(DEFAULT_HOURS);
  const [timeOff, setTimeOff] = useState<TimeOff[]>([]);
  // Draft inputs for a new time-off entry.
  const [toDate, setToDate] = useState('');
  const [toStart, setToStart] = useState('');
  const [toEnd, setToEnd] = useState('');
  const [toReason, setToReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function addTimeOff() {
    if (!toDate) return;
    const entry: TimeOff = { date: toDate };
    if (toStart && toEnd) {
      entry.start = toStart;
      entry.end = toEnd;
    }
    if (toReason.trim()) entry.reason = toReason.trim();
    setTimeOff((prev) => [...prev, entry].sort((a, b) => a.date.localeCompare(b.date)));
    setToDate('');
    setToStart('');
    setToEnd('');
    setToReason('');
  }

  function removeTimeOff(index: number) {
    setTimeOff((prev) => prev.filter((_, i) => i !== index));
  }

  async function load() {
    setLoading(true);
    const [staffRes, servicesRes] = await Promise.all([getStaffList(), getAllServices()]);
    if (staffRes.success && staffRes.data) setStaff(staffRes.data);
    if (servicesRes.success && servicesRes.data) setServices(servicesRes.data);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function startCreate() {
    setName('');
    setRole('');
    setActive(true);
    setServiceIds([]);
    setHours(DEFAULT_HOURS);
    setTimeOff([]);
    setError(null);
    setEditingId('');
  }

  function startEdit(s: Staff) {
    setName(s.name);
    setRole(s.role);
    setActive(s.active);
    setServiceIds(s.serviceIds ?? []);
    setHours({ ...DEFAULT_HOURS, ...(s.workingHours ?? {}) });
    setTimeOff(s.timeOff ?? []);
    setError(null);
    setEditingId(s.id);
  }

  function toggleService(id: string) {
    setServiceIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function toggleDay(day: Weekday, working: boolean) {
    setHours((prev) => ({
      ...prev,
      [day]: working ? prev[day] ?? { open: '09:00', close: '18:00' } : null,
    }));
  }

  function setDayTime(day: Weekday, field: 'open' | 'close', value: string) {
    setHours((prev) => {
      const current = prev[day] ?? { open: '09:00', close: '18:00' };
      return { ...prev, [day]: { ...current, [field]: value } };
    });
  }

  async function save() {
    if (name.trim().length < 2 || !role.trim()) {
      setError('Name (2+ chars) and role are required.');
      return;
    }
    setSaving(true);
    const payload: StaffFormData = {
      name,
      role,
      active,
      serviceIds,
      workingHours: hours as Record<string, DayHours | null>,
      timeOff,
    };
    const res = editingId ? await updateStaff(editingId, payload) : await createStaff(payload);
    setSaving(false);
    if (res.success) {
      setEditingId(null);
      await load();
    } else {
      setError(typeof res.error === 'string' ? res.error : 'Failed to save staff member.');
    }
  }

  async function handleDelete(s: Staff) {
    if (!confirm(`Delete "${s.name}"? This cannot be undone.`)) return;
    const res = await deleteStaff(s.id);
    if (res.success) await load();
  }

  const serviceName = (id: string) => services.find((s) => s.id === id)?.name ?? id;

  if (loading) {
    return <div className="py-16 text-center text-white-50">Loading staff...</div>;
  }

  // Form view
  if (editingId !== null) {
    return (
      <div className="max-w-3xl border border-white-10 bg-dark-800 p-8">
        <h2 className="font-serif text-xl text-white mb-6">
          {editingId ? 'Edit Staff Member' : 'New Staff Member'}
        </h2>

        <div className="space-y-8">
          <div className="grid gap-5 sm:grid-cols-2">
            <Input
              id="staff-name"
              label="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Dr. Mariana"
            />
            <Input
              id="staff-role"
              label="Role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="Lead Aesthetician"
            />
          </div>

          <label className="flex items-center gap-3 text-white-70">
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="h-4 w-4 accent-gold"
            />
            <span className="text-sm">Active (bookable)</span>
          </label>

          {/* Qualifications */}
          <div>
            <p className="mb-3 text-sm font-medium tracking-wide text-white-70">
              Qualified treatments
            </p>
            {services.length === 0 ? (
              <p className="text-sm text-white-50">
                No services yet — add services first to assign qualifications.
              </p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {services.map((svc) => (
                  <label
                    key={svc.id}
                    className="flex items-center gap-3 border border-white-10 bg-dark-900 px-4 py-3 text-white-70 cursor-pointer hover:border-white-30"
                  >
                    <input
                      type="checkbox"
                      checked={serviceIds.includes(svc.id)}
                      onChange={() => toggleService(svc.id)}
                      className="h-4 w-4 accent-gold"
                    />
                    <span className="text-sm">
                      {svc.name}
                      {!svc.isActive && <span className="text-white-30"> (inactive)</span>}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Working hours */}
          <div>
            <p className="mb-3 text-sm font-medium tracking-wide text-white-70">Working hours</p>
            <div className="space-y-2">
              {WEEKDAYS.map(({ key, label }) => {
                const day = hours[key];
                const working = day != null;
                return (
                  <div
                    key={key}
                    className="flex items-center gap-4 border border-white-10 bg-dark-900 px-4 py-3"
                  >
                    <label className="flex w-40 items-center gap-3 text-white-70 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={working}
                        onChange={(e) => toggleDay(key, e.target.checked)}
                        className="h-4 w-4 accent-gold"
                      />
                      <span className="text-sm">{label}</span>
                    </label>
                    {working ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="time"
                          value={day!.open}
                          onChange={(e) => setDayTime(key, 'open', e.target.value)}
                          className="h-10 border border-white-10 bg-dark-800 px-3 text-white focus:border-gold focus:outline-none"
                        />
                        <span className="text-white-30">—</span>
                        <input
                          type="time"
                          value={day!.close}
                          onChange={(e) => setDayTime(key, 'close', e.target.value)}
                          className="h-10 border border-white-10 bg-dark-800 px-3 text-white focus:border-gold focus:outline-none"
                        />
                      </div>
                    ) : (
                      <span className="text-sm text-white-30">Closed</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Time off / holidays */}
          <div>
            <p className="mb-1 text-sm font-medium tracking-wide text-white-70">Time off / holidays</p>
            <p className="mb-3 text-xs text-white-30">
              Block dates when you’re away. Leave the times empty to block the whole day; set From/To to
              block only part of a day.
            </p>

            {timeOff.length > 0 && (
              <div className="mb-3 space-y-2">
                {timeOff.map((t, i) => (
                  <div
                    key={`${t.date}-${i}`}
                    className="flex items-center gap-3 border border-white-10 bg-dark-900 px-4 py-2 text-sm"
                  >
                    <span className="text-white">{t.date}</span>
                    <span className="text-white-50">
                      {t.start && t.end ? `${t.start}–${t.end}` : 'All day'}
                    </span>
                    {t.reason && <span className="text-white-30">· {t.reason}</span>}
                    <button
                      type="button"
                      onClick={() => removeTimeOff(i)}
                      className="ml-auto cursor-pointer text-red-400 transition-colors hover:text-red-300"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-wrap items-end gap-2 border border-white-10 bg-dark-900 p-3">
              <div>
                <label className="mb-1 block text-xs text-white-50">Date</label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="h-10 border border-white-10 bg-dark-800 px-3 text-white focus:border-gold focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-white-50">From</label>
                <input
                  type="time"
                  value={toStart}
                  onChange={(e) => setToStart(e.target.value)}
                  className="h-10 border border-white-10 bg-dark-800 px-3 text-white focus:border-gold focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-white-50">To</label>
                <input
                  type="time"
                  value={toEnd}
                  onChange={(e) => setToEnd(e.target.value)}
                  className="h-10 border border-white-10 bg-dark-800 px-3 text-white focus:border-gold focus:outline-none"
                />
              </div>
              <div className="min-w-[8rem] flex-1">
                <label className="mb-1 block text-xs text-white-50">Reason (optional)</label>
                <input
                  type="text"
                  value={toReason}
                  onChange={(e) => setToReason(e.target.value)}
                  placeholder="Vacation"
                  className="h-10 w-full border border-white-10 bg-dark-800 px-3 text-white focus:border-gold focus:outline-none"
                />
              </div>
              <Button variant="outline" size="sm" onClick={addTimeOff} disabled={!toDate}>
                Add
              </Button>
            </div>
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="flex gap-3 pt-2">
            <Button variant="elegant" onClick={save} disabled={saving}>
              {saving ? 'Saving…' : 'Save Staff Member'}
            </Button>
            <Button variant="ghost" onClick={() => setEditingId(null)} disabled={saving}>
              Cancel
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // List view
  return (
    <div>
      <div className="mb-6">
        <Button variant="elegant" onClick={startCreate}>
          + Add Staff Member
        </Button>
      </div>

      {staff.length === 0 ? (
        <div className="border border-white-10 bg-dark-800 p-16 text-center text-white-50">
          No staff yet. Add a practitioner to enable scheduling.
        </div>
      ) : (
        <div className="space-y-4">
          {staff.map((s) => {
            const workingDays = WEEKDAYS.filter(({ key }) => s.workingHours?.[key]).length;
            return (
              <div key={s.id} className="border border-white-10 bg-dark-800 p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-serif text-xl text-white">{s.name}</h3>
                      <Badge variant={s.active ? 'completed' : 'cancelled'}>
                        {s.active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <p className="text-gold">{s.role}</p>
                    <p className="mt-2 text-sm text-white-50">
                      {(s.serviceIds?.length ?? 0)} treatment
                      {(s.serviceIds?.length ?? 0) === 1 ? '' : 's'} · {workingDays} working day
                      {workingDays === 1 ? '' : 's'}
                    </p>
                    {s.serviceIds?.length ? (
                      <p className="mt-1 text-xs text-white-30">
                        {s.serviceIds.map(serviceName).join(' · ')}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex gap-3">
                    <Button variant="outline" size="sm" onClick={() => startEdit(s)}>
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(s)}
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
