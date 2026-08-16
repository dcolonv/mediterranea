'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button, Input } from '@/components/ui';
import { CAPABILITIES, CAPABILITY_LABELS, type Capability } from '@/lib/auth/capabilities';
import {
  getAdmins,
  addAdmin,
  removeAdmin,
  setAdminCapabilities,
  type AdminEntry,
} from '@/actions/team';

export function BackofficeTeam() {
  const [admins, setAdmins] = useState<AdminEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [newEmail, setNewEmail] = useState('');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await getAdmins();
    if (res.success && res.data) setAdmins(res.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function toggle(admin: AdminEntry, cap: Capability) {
    const has = admin.capabilities.includes(cap);
    // Empty = full access; toggling the first cap converts to a restricted set of everything-but.
    let next: Capability[];
    if (admin.capabilities.length === 0) {
      // Was full access → restrict by removing just this one.
      next = CAPABILITIES.filter((c) => c !== cap);
    } else {
      next = has
        ? (admin.capabilities.filter((c) => c !== cap) as Capability[])
        : ([...admin.capabilities, cap] as Capability[]);
    }
    setBusy(admin.email);
    const res = await setAdminCapabilities(admin.email, next);
    setBusy(null);
    if (res.success) {
      setAdmins((prev) => prev.map((a) => (a.email === admin.email ? { ...a, capabilities: next } : a)));
    }
  }

  async function grantFull(admin: AdminEntry) {
    setBusy(admin.email);
    const res = await setAdminCapabilities(admin.email, []);
    setBusy(null);
    if (res.success) setAdmins((prev) => prev.map((a) => (a.email === admin.email ? { ...a, capabilities: [] } : a)));
  }

  async function add() {
    setError(null);
    const res = await addAdmin(newEmail, []);
    if (res.success) {
      setNewEmail('');
      await load();
    } else {
      setError(res.error);
    }
  }

  async function remove(email: string) {
    if (!confirm(`Remove admin access for ${email}?`)) return;
    const res = await removeAdmin(email);
    if (res.success) await load();
    else alert(res.error);
  }

  if (loading) return <div className="py-16 text-center text-white-50">Loading team…</div>;

  return (
    <div>
      {/* Add admin */}
      <div className="mb-8 flex flex-wrap items-end gap-3">
        <div className="w-full sm:max-w-xs">
          <Input id="new-admin" label="Add an admin by email" type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="name@email.com" />
        </div>
        <Button variant="elegant" onClick={add}>
          Add admin
        </Button>
        {error && <span className="text-sm text-red-400">{error}</span>}
      </div>

      <div className="space-y-4">
        {admins.map((a) => {
          const full = a.capabilities.length === 0;
          return (
            <div key={a.email} className="border border-white-10 bg-dark-800 p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span className="text-white">{a.email}</span>
                  {full && <span className="ml-3 text-xs uppercase tracking-wider text-gold">Full access</span>}
                </div>
                <div className="flex gap-3">
                  {!full && (
                    <Button variant="outline" size="sm" disabled={busy === a.email} onClick={() => grantFull(a)}>
                      Grant full access
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => remove(a.email)}
                    className="text-red-400 hover:bg-red-500/10 hover:text-red-300"
                  >
                    Remove
                  </Button>
                </div>
              </div>

              <div className="mt-4 grid gap-2 border-t border-white-10 pt-4 sm:grid-cols-2 lg:grid-cols-3">
                {CAPABILITIES.map((cap) => (
                  <label key={cap} className="flex items-center gap-2 text-sm text-white-70">
                    <input
                      type="checkbox"
                      checked={full || a.capabilities.includes(cap)}
                      disabled={busy === a.email}
                      onChange={() => toggle(a, cap)}
                      className="h-4 w-4 accent-gold"
                    />
                    <span>{CAPABILITY_LABELS[cap]}</span>
                  </label>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-6 text-xs text-white-30">
        No capabilities selected = full access. Nav sections hide for admins who lack the matching
        capability.
      </p>
    </div>
  );
}
