'use client';

import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { Button, Input, Textarea, Select, Badge } from '@/components/ui';
import { getSchedulingRefs } from '@/actions/scheduling';
import {
  getWaitlist,
  addToWaitlist,
  updateWaitlistStatus,
  deleteWaitlistEntry,
} from '@/actions/waitlist';
import type { WaitlistEntry, WaitlistStatus, Service, Staff } from '@mediterranea/shared/types';
import type { WaitlistFormData } from '@mediterranea/shared/validations';

const STATUS_VARIANT: Record<WaitlistStatus, 'pending' | 'confirmed' | 'completed' | 'cancelled'> = {
  waiting: 'pending',
  offered: 'confirmed',
  booked: 'completed',
  cancelled: 'cancelled',
};

const STATUS_LABEL: Record<WaitlistStatus, string> = {
  waiting: 'Waiting',
  offered: 'Offered',
  booked: 'Booked',
  cancelled: 'Cancelled',
};

const EMPTY: WaitlistFormData = {
  serviceId: '',
  clientName: '',
  clientEmail: '',
  clientPhone: '',
  preferredDate: '',
  staffId: '',
  notes: '',
};

export function BackofficeWaitlist() {
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);

  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<WaitlistFormData>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [wl, refs] = await Promise.all([getWaitlist(), getSchedulingRefs()]);
    if (wl.success && wl.data) setEntries(wl.data);
    if (refs.success) {
      setServices(refs.services);
      setStaff(refs.staff);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const serviceName = (id: string) => services.find((s) => s.id === id)?.name ?? id;
  const staffName = (id?: string) => (id ? staff.find((s) => s.id === id)?.name : undefined);

  async function save() {
    if (!form.serviceId || !form.clientName.trim() || !form.clientEmail.trim() || !form.clientPhone.trim()) {
      setError('Treatment, name, email, and phone are required.');
      return;
    }
    setSaving(true);
    setError(null);
    const res = await addToWaitlist(form);
    setSaving(false);
    if (res.success) {
      setForm(EMPTY);
      setAdding(false);
      await load();
    } else {
      setError(typeof res.error === 'string' ? res.error : 'Failed to add.');
    }
  }

  async function setStatus(id: string, status: WaitlistStatus) {
    setBusyId(id);
    const res = await updateWaitlistStatus(id, status);
    setBusyId(null);
    if (res.success) setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, status } : e)));
  }

  async function remove(id: string) {
    if (!confirm('Remove this waitlist entry?')) return;
    setBusyId(id);
    const res = await deleteWaitlistEntry(id);
    setBusyId(null);
    if (res.success) setEntries((prev) => prev.filter((e) => e.id !== id));
  }

  if (loading) return <div className="py-16 text-center text-white-50">Loading waitlist…</div>;

  // ── Add form ────────────────────────────────────────────────────────────────
  if (adding) {
    return (
      <div className="max-w-xl border border-white-10 bg-dark-800 p-8">
        <h2 className="mb-6 font-serif text-xl text-white">Add to waitlist</h2>
        <div className="space-y-5">
          <Select
            id="wl-service"
            label="Treatment"
            value={form.serviceId}
            onChange={(e) => setForm({ ...form, serviceId: e.target.value })}
            options={[
              { value: '', label: 'Choose a treatment…' },
              ...services.map((s) => ({ value: s.id, label: s.name })),
            ]}
          />
          <Input
            id="wl-name"
            label="Client name"
            value={form.clientName}
            onChange={(e) => setForm({ ...form, clientName: e.target.value })}
          />
          <div className="grid gap-5 sm:grid-cols-2">
            <Input
              id="wl-email"
              label="Email"
              type="email"
              value={form.clientEmail}
              onChange={(e) => setForm({ ...form, clientEmail: e.target.value })}
            />
            <Input
              id="wl-phone"
              label="Phone"
              value={form.clientPhone}
              onChange={(e) => setForm({ ...form, clientPhone: e.target.value })}
            />
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium tracking-wide text-white-70">
                Preferred date (optional)
              </label>
              <input
                type="date"
                value={form.preferredDate}
                onChange={(e) => setForm({ ...form, preferredDate: e.target.value })}
                className="h-12 w-full border border-white-10 bg-dark-900 px-4 text-white focus:border-gold focus:outline-none"
              />
            </div>
            <Select
              id="wl-staff"
              label="Preferred practitioner (optional)"
              value={form.staffId}
              onChange={(e) => setForm({ ...form, staffId: e.target.value })}
              options={[
                { value: '', label: 'Any practitioner' },
                ...staff.map((s) => ({ value: s.id, label: s.name })),
              ]}
            />
          </div>
          <Textarea
            id="wl-notes"
            label="Notes (optional)"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            rows={2}
          />

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="flex gap-3 pt-2">
            <Button variant="elegant" onClick={save} disabled={saving}>
              {saving ? 'Adding…' : 'Add to waitlist'}
            </Button>
            <Button variant="ghost" onClick={() => setAdding(false)} disabled={saving}>
              Cancel
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ── List ────────────────────────────────────────────────────────────────────
  return (
    <div>
      <div className="mb-6">
        <Button variant="elegant" onClick={() => { setForm(EMPTY); setError(null); setAdding(true); }}>
          + Add to waitlist
        </Button>
      </div>

      {entries.length === 0 ? (
        <div className="border border-white-10 bg-dark-800 p-16 text-center text-white-50">
          The waitlist is empty. When an appointment is cancelled, matching waitlisted clients are
          notified automatically.
        </div>
      ) : (
        <div className="space-y-4">
          {entries.map((e) => (
            <div key={e.id} className="border border-white-10 bg-dark-800 p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="font-serif text-lg text-white">{e.clientName}</h3>
                    <Badge variant={STATUS_VARIANT[e.status]}>{STATUS_LABEL[e.status]}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-gold">{serviceName(e.serviceId)}</p>
                  <p className="mt-1 text-xs text-white-50">
                    {e.clientEmail} · {e.clientPhone}
                  </p>
                  <p className="mt-1 text-xs text-white-30">
                    {e.preferredDate
                      ? `Prefers ${format(new Date(`${e.preferredDate}T00:00:00`), 'MMM d, yyyy')}`
                      : 'Any date'}
                    {staffName(e.staffId) ? ` · ${staffName(e.staffId)}` : ''}
                  </p>
                  {e.notes && <p className="mt-2 text-sm text-white-70">{e.notes}</p>}
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-3 border-t border-white-10 pt-4">
                {e.status !== 'booked' && (
                  <Button variant="elegant" size="sm" disabled={busyId === e.id} onClick={() => setStatus(e.id, 'booked')}>
                    Mark booked
                  </Button>
                )}
                {e.status === 'waiting' && (
                  <Button variant="outline" size="sm" disabled={busyId === e.id} onClick={() => setStatus(e.id, 'offered')}>
                    Mark offered
                  </Button>
                )}
                {e.status !== 'waiting' && e.status !== 'booked' && (
                  <Button variant="outline" size="sm" disabled={busyId === e.id} onClick={() => setStatus(e.id, 'waiting')}>
                    Back to waiting
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={busyId === e.id}
                  onClick={() => remove(e.id)}
                  className="ml-auto text-red-400 hover:bg-red-500/10 hover:text-red-300"
                >
                  Remove
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
