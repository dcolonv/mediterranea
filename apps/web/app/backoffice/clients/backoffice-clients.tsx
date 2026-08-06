'use client';

import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { Button, Input, Textarea, Badge } from '@/components/ui';
import { APPOINTMENT_STATUSES } from '@mediterranea/shared/constants';
import {
  getCustomers,
  getCustomerAppointments,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  getCustomerTotalSpend,
  exportCustomerData,
  hardDeleteCustomer,
} from '@/actions/customers';
import { formatPrice } from '@mediterranea/shared/utils';
import type { Customer, Appointment } from '@mediterranea/shared/types';
import type { CustomerFormData } from '@mediterranea/shared/validations';

type Mode = 'list' | 'form' | 'detail';

interface FormState {
  name: string;
  email: string;
  phone: string;
  notes: string;
  tags: string; // comma-separated in the UI
}

const EMPTY_FORM: FormState = { name: '', email: '', phone: '', notes: '', tags: '' };

function toFormData(f: FormState): CustomerFormData {
  return {
    name: f.name.trim(),
    email: f.email.trim(),
    phone: f.phone.trim(),
    notes: f.notes.trim(),
    tags: f.tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean),
  };
}

export function BackofficeClients() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [mode, setMode] = useState<Mode>('list');
  const [active, setActive] = useState<Customer | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null); // null = new

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [history, setHistory] = useState<Appointment[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [totalSpend, setTotalSpend] = useState<number | null>(null);
  const [erasing, setErasing] = useState(false);

  const load = useCallback(async (term?: string) => {
    setLoading(true);
    const res = await getCustomers(term);
    if (res.success && res.data) setCustomers(res.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Debounced search.
  useEffect(() => {
    const t = setTimeout(() => load(search), 250);
    return () => clearTimeout(t);
  }, [search, load]);

  async function openDetail(customer: Customer) {
    setActive(customer);
    setMode('detail');
    setHistoryLoading(true);
    setTotalSpend(null);
    const [hist, spend] = await Promise.all([
      getCustomerAppointments(customer.id),
      getCustomerTotalSpend(customer.id, customer.email),
    ]);
    if (hist.success && hist.data) setHistory(hist.data);
    else setHistory([]);
    if (spend.success) setTotalSpend(spend.total);
    setHistoryLoading(false);
  }

  async function handleExport(c: Customer) {
    const res = await exportCustomerData(c.id);
    if (!res.success) {
      alert(res.error);
      return;
    }
    const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${c.email.replace(/[^a-z0-9]/gi, '_')}-data.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleErase(c: Customer) {
    if (
      !confirm(
        `GDPR erasure: permanently delete ${c.name}'s record AND all their appointments? This cannot be undone.`
      )
    )
      return;
    setErasing(true);
    const res = await hardDeleteCustomer(c.id);
    setErasing(false);
    if (res.success) {
      await load(search);
      setMode('list');
    } else {
      alert(res.error);
    }
  }

  function startCreate() {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setError(null);
    setMode('form');
  }

  function startEdit(c: Customer) {
    setForm({
      name: c.name,
      email: c.email,
      phone: c.phone,
      notes: c.notes ?? '',
      tags: (c.tags ?? []).join(', '),
    });
    setEditingId(c.id);
    setError(null);
    setMode('form');
  }

  async function save() {
    const data = toFormData(form);
    if (!data.name || !data.email || !data.phone) {
      setError('Name, email, and phone are required.');
      return;
    }
    setSaving(true);
    const res = editingId ? await updateCustomer(editingId, data) : await createCustomer(data);
    setSaving(false);
    if (res.success) {
      await load(search);
      setMode('list');
    } else {
      setError(typeof res.error === 'string' ? res.error : 'Failed to save client.');
    }
  }

  async function handleDelete(c: Customer) {
    if (!confirm(`Delete "${c.name}"? This removes the client record (appointments are kept).`)) return;
    const res = await deleteCustomer(c.id);
    if (res.success) {
      await load(search);
      setMode('list');
    }
  }

  // ── Form view ──────────────────────────────────────────────────────────────
  if (mode === 'form') {
    return (
      <div className="max-w-xl border border-white-10 bg-dark-800 p-8">
        <h2 className="mb-6 font-serif text-xl text-white">
          {editingId ? 'Edit Client' : 'New Client'}
        </h2>
        <div className="space-y-5">
          <Input
            id="client-name"
            label="Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Ana García"
          />
          <Input
            id="client-email"
            label="Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="ana@example.com"
          />
          <Input
            id="client-phone"
            label="Phone"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="+34 600 000 000"
          />
          <Input
            id="client-tags"
            label="Tags (comma-separated)"
            value={form.tags}
            onChange={(e) => setForm({ ...form, tags: e.target.value })}
            placeholder="VIP, new"
          />
          <Textarea
            id="client-notes"
            label="Notes"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="Preferences, sensitivities, anything worth remembering…"
            rows={4}
          />

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="flex gap-3 pt-2">
            <Button variant="elegant" onClick={save} disabled={saving}>
              {saving ? 'Saving…' : 'Save Client'}
            </Button>
            <Button
              variant="ghost"
              onClick={() => setMode(editingId && active ? 'detail' : 'list')}
              disabled={saving}
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ── Detail view ────────────────────────────────────────────────────────────
  if (mode === 'detail' && active) {
    // Firestore Timestamps serialize to { _seconds } or { seconds } across the boundary.
    const ct = active.consent?.consentedAt as unknown as
      | { seconds?: number; _seconds?: number }
      | undefined;
    const consentDateSeconds = ct?.seconds ?? ct?._seconds;
    return (
      <div className="max-w-2xl">
        <button
          onClick={() => setMode('list')}
          className="mb-6 text-sm text-white-50 transition-colors hover:text-white"
        >
          ‹ Back to clients
        </button>

        <div className="border border-white-10 bg-dark-800 p-8">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="font-serif text-2xl text-white">{active.name}</h2>
              <div className="mt-2 space-y-1 text-sm">
                <a href={`mailto:${active.email}`} className="block text-gold hover:text-gold-light">
                  {active.email}
                </a>
                <a href={`tel:${active.phone}`} className="block text-gold hover:text-gold-light">
                  {active.phone}
                </a>
              </div>
            </div>
            <div className="text-right text-sm text-white-50">
              <div>
                <span className="text-2xl font-serif text-white">{active.totalVisits ?? 0}</span> visits
              </div>
              {totalSpend !== null && (
                <div className="mt-1 text-xs text-white-50">{formatPrice(totalSpend)} spent</div>
              )}
              {active.lastVisitDate && (
                <div className="mt-1 text-xs text-white-30">
                  Last: {format(new Date(`${active.lastVisitDate}T00:00:00`), 'MMM d, yyyy')}
                </div>
              )}
            </div>
          </div>

          {active.tags && active.tags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {active.tags.map((t) => (
                <span
                  key={t}
                  className="bg-white-10 px-2 py-0.5 text-[11px] uppercase tracking-wider text-white-70"
                >
                  {t}
                </span>
              ))}
            </div>
          )}

          {active.notes && (
            <div className="mt-6">
              <span className="text-xs uppercase tracking-wider text-white-30">Notes</span>
              <p className="mt-1 whitespace-pre-wrap text-sm text-white-70">{active.notes}</p>
            </div>
          )}

          <div className="mt-6 flex flex-wrap gap-3 border-t border-white-10 pt-6">
            <Button variant="outline" size="sm" onClick={() => startEdit(active)}>
              Edit
            </Button>
            <Button variant="ghost" size="sm" onClick={() => handleExport(active)}>
              Export data
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDelete(active)}
              className="text-red-400 hover:bg-red-500/10 hover:text-red-300"
            >
              Delete record
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={erasing}
              onClick={() => handleErase(active)}
              className="ml-auto text-red-400 hover:bg-red-500/10 hover:text-red-300"
            >
              {erasing ? 'Erasing…' : 'Erase (GDPR)'}
            </Button>
          </div>
        </div>

        {/* Skin profile */}
        {active.skinProfile &&
          (active.skinProfile.skinType ||
            (active.skinProfile.concerns && active.skinProfile.concerns.length > 0) ||
            active.skinProfile.preferences) && (
            <div className="mt-6 border border-white-10 bg-dark-800 p-6">
              <h3 className="mb-3 font-serif text-lg text-white">Skin profile</h3>
              <dl className="space-y-2 text-sm">
                {active.skinProfile.skinType && (
                  <RecordRow label="Skin type" value={active.skinProfile.skinType} />
                )}
                {active.skinProfile.concerns && active.skinProfile.concerns.length > 0 && (
                  <RecordRow label="Concerns" value={active.skinProfile.concerns.join(', ')} />
                )}
                {active.skinProfile.preferences && (
                  <RecordRow label="Preferences" value={active.skinProfile.preferences} />
                )}
              </dl>
            </div>
          )}

        {/* Intake */}
        {active.intake &&
          (active.intake.allergies ||
            active.intake.medications ||
            active.intake.conditions ||
            active.intake.notes) && (
            <div className="mt-6 border border-white-10 bg-dark-800 p-6">
              <h3 className="mb-3 font-serif text-lg text-white">Consultation &amp; intake</h3>
              <dl className="space-y-2 text-sm">
                {active.intake.allergies && <RecordRow label="Allergies" value={active.intake.allergies} />}
                {active.intake.medications && (
                  <RecordRow label="Medications" value={active.intake.medications} />
                )}
                {active.intake.conditions && (
                  <RecordRow label="Conditions" value={active.intake.conditions} />
                )}
                {active.intake.notes && <RecordRow label="Notes" value={active.intake.notes} />}
              </dl>
            </div>
          )}

        {/* Consent */}
        {active.consent && (
          <div className="mt-6 border border-white-10 bg-dark-800 p-6">
            <h3 className="mb-3 font-serif text-lg text-white">Consent</h3>
            <dl className="space-y-2 text-sm">
              <RecordRow
                label="Treatment consent"
                value={active.consent.treatmentConsent ? 'Given' : 'Not given'}
              />
              <RecordRow
                label="Marketing"
                value={active.consent.marketingOptIn ? 'Opted in' : 'Opted out'}
              />
              {active.consent.signedName && (
                <RecordRow label="Signed" value={active.consent.signedName} />
              )}
              {consentDateSeconds && (
                <RecordRow
                  label="Date"
                  value={format(new Date(consentDateSeconds * 1000), 'MMM d, yyyy')}
                />
              )}
              {active.consent.version && <RecordRow label="Version" value={active.consent.version} />}
            </dl>
          </div>
        )}

        {/* History */}
        <div className="mt-8">
          <h3 className="mb-4 font-serif text-lg text-white">Appointment history</h3>
          {historyLoading ? (
            <div className="py-8 text-center text-white-50">Loading history…</div>
          ) : history.length === 0 ? (
            <div className="border border-white-10 bg-dark-800 p-8 text-center text-white-50">
              No appointments on record.
            </div>
          ) : (
            <div className="border border-white-10 bg-dark-800">
              {history.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between gap-4 border-b border-white-10 p-4 last:border-b-0"
                >
                  <div className="min-w-0">
                    <div className="text-white">{a.serviceName}</div>
                    <div className="text-sm text-white-50">
                      {format(new Date(`${a.appointmentDate}T00:00:00`), 'MMM d, yyyy')} · {a.appointmentTime}
                    </div>
                  </div>
                  <Badge variant={a.status}>{APPOINTMENT_STATUSES[a.status].label}</Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── List view ──────────────────────────────────────────────────────────────
  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="w-full sm:max-w-xs">
          <Input
            id="client-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email, or phone…"
          />
        </div>
        <Button variant="elegant" onClick={startCreate} className="ml-auto">
          + Add Client
        </Button>
      </div>

      {loading ? (
        <div className="py-16 text-center text-white-50">Loading clients…</div>
      ) : customers.length === 0 ? (
        <div className="border border-white-10 bg-dark-800 p-16 text-center text-white-50">
          {search ? 'No clients match your search.' : 'No clients yet.'}
        </div>
      ) : (
        <div className="border border-white-10 bg-dark-800">
          {customers.map((c) => (
            <button
              key={c.id}
              onClick={() => openDetail(c)}
              className="flex w-full items-center gap-4 border-b border-white-10 p-4 text-left transition-colors last:border-b-0 hover:bg-white-10"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-white">{c.name}</span>
                  {(c.tags ?? []).map((t) => (
                    <span
                      key={t}
                      className="bg-white-10 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-white-50"
                    >
                      {t}
                    </span>
                  ))}
                </div>
                <div className="truncate text-sm text-white-50">
                  {c.email} · {c.phone}
                </div>
              </div>
              <div className="shrink-0 text-right text-xs text-white-30">
                <div>
                  <span className="text-white-70">{c.totalVisits ?? 0}</span> visits
                </div>
                {c.lastVisitDate && (
                  <div>{format(new Date(`${c.lastVisitDate}T00:00:00`), 'MMM d, yyyy')}</div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function RecordRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-6">
      <dt className="shrink-0 text-white-30">{label}</dt>
      <dd className="whitespace-pre-wrap text-right text-white-70">{value}</dd>
    </div>
  );
}
