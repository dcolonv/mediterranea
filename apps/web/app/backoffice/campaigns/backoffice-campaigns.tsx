'use client';

import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { Button, Input, Textarea, Select, Badge } from '@/components/ui';
import {
  getCampaigns,
  createCampaign,
  sendCampaign,
  deleteCampaign,
  estimateAudience,
  type CampaignInput,
} from '@/actions/campaigns';
import type { Campaign, CampaignChannel, CampaignSegment } from '@mediterranea/shared/types';

const EMPTY: CampaignInput = {
  name: '',
  channel: 'email',
  segment: 'all',
  segmentValue: '',
  subject: '',
  body: '',
};

export function BackofficeCampaigns() {
  const [items, setItems] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<'list' | 'compose'>('list');
  const [form, setForm] = useState<CampaignInput>(EMPTY);
  const [audience, setAudience] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await getCampaigns();
    if (res.success && res.data) setItems(res.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Estimate audience as the segment changes.
  useEffect(() => {
    if (mode !== 'compose') return;
    let active = true;
    setAudience(null);
    estimateAudience(form.channel, form.segment, form.segmentValue).then((r) => {
      if (active && r.success) setAudience(r.count);
    });
    return () => {
      active = false;
    };
  }, [mode, form.channel, form.segment, form.segmentValue]);

  async function saveDraft(thenSend: boolean) {
    setError(null);
    if (!form.name.trim() || !form.body.trim()) {
      setError('Name and message are required.');
      return;
    }
    if (form.channel === 'email' && !form.subject.trim()) {
      setError('Email campaigns need a subject.');
      return;
    }
    setSaving(true);
    const res = await createCampaign(form);
    if (!res.success) {
      setSaving(false);
      setError(typeof res.error === 'string' ? res.error : 'Failed to save.');
      return;
    }
    if (thenSend && res.id) {
      const sendRes = await sendCampaign(res.id);
      setSaving(false);
      if (!sendRes.success) {
        setError(sendRes.error);
        await load();
        setMode('list');
        return;
      }
    } else {
      setSaving(false);
    }
    setForm(EMPTY);
    setMode('list');
    await load();
  }

  async function send(c: Campaign) {
    if (!confirm(`Send "${c.name}" now?`)) return;
    setBusyId(c.id);
    const res = await sendCampaign(c.id);
    setBusyId(null);
    if (res.success) await load();
    else alert(res.error);
  }

  async function remove(c: Campaign) {
    if (!confirm(`Delete "${c.name}"?`)) return;
    setBusyId(c.id);
    const res = await deleteCampaign(c.id);
    setBusyId(null);
    if (res.success) await load();
  }

  if (loading) return <div className="py-16 text-center text-white-50">Loading campaigns…</div>;

  if (mode === 'compose') {
    return (
      <div className="max-w-xl border border-white-10 bg-dark-800 p-8">
        <h2 className="mb-6 font-serif text-xl text-white">New campaign</h2>
        <div className="space-y-5">
          <Input id="c-name" label="Campaign name (internal)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <div className="grid gap-5 sm:grid-cols-2">
            <Select
              id="c-channel"
              label="Channel"
              value={form.channel}
              onChange={(e) => setForm({ ...form, channel: e.target.value as CampaignChannel })}
              options={[
                { value: 'email', label: 'Email' },
                { value: 'sms', label: 'SMS' },
              ]}
            />
            <Select
              id="c-segment"
              label="Audience"
              value={form.segment}
              onChange={(e) => setForm({ ...form, segment: e.target.value as CampaignSegment, segmentValue: '' })}
              options={[
                { value: 'all', label: 'All clients' },
                { value: 'marketing', label: 'Marketing opt-in' },
                { value: 'tag', label: 'By tag' },
                { value: 'inactive', label: 'Inactive clients' },
              ]}
            />
          </div>
          {form.segment === 'tag' && (
            <Input id="c-tag" label="Tag" value={form.segmentValue} onChange={(e) => setForm({ ...form, segmentValue: e.target.value })} placeholder="VIP" />
          )}
          {form.segment === 'inactive' && (
            <Input id="c-days" label="Not visited in (days)" type="number" value={form.segmentValue} onChange={(e) => setForm({ ...form, segmentValue: e.target.value })} placeholder="90" />
          )}

          <p className="text-sm text-white-50">
            Audience: <span className="text-white">{audience === null ? '…' : audience}</span> recipient
            {audience === 1 ? '' : 's'}
          </p>

          {form.channel === 'email' && (
            <Input id="c-subject" label="Subject" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
          )}
          <Textarea
            id="c-body"
            label="Message (use {name} for the recipient's first name)"
            value={form.body}
            onChange={(e) => setForm({ ...form, body: e.target.value })}
            rows={6}
          />

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="flex flex-wrap gap-3 pt-2">
            <Button variant="elegant" onClick={() => saveDraft(true)} disabled={saving}>
              {saving ? 'Working…' : 'Save & send now'}
            </Button>
            <Button variant="outline" onClick={() => saveDraft(false)} disabled={saving}>
              Save draft
            </Button>
            <Button variant="ghost" onClick={() => { setForm(EMPTY); setMode('list'); }} disabled={saving}>
              Cancel
            </Button>
          </div>
          <p className="text-xs text-white-30">
            Sending uses your configured email/SMS provider. If none is set, sends are logged (dormant) and counted as delivered.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <Button variant="elegant" onClick={() => { setForm(EMPTY); setError(null); setMode('compose'); }}>
          + New campaign
        </Button>
      </div>
      {items.length === 0 ? (
        <div className="border border-white-10 bg-dark-800 p-16 text-center text-white-50">No campaigns yet.</div>
      ) : (
        <div className="space-y-4">
          {items.map((c) => (
            <div key={c.id} className="border border-white-10 bg-dark-800 p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="font-serif text-lg text-white">{c.name}</h3>
                    <Badge variant={c.status === 'sent' ? 'completed' : 'pending'}>{c.status}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-white-50">
                    {c.channel.toUpperCase()} · {c.segment}
                    {c.segmentValue ? ` (${c.segmentValue})` : ''}
                    {c.status === 'sent' ? ` · ${c.sentCount ?? 0}/${c.recipientCount ?? 0} sent` : ''}
                  </p>
                  {c.sentAt?.toDate && (
                    <p className="mt-1 text-xs text-white-30">{format(c.sentAt.toDate(), 'MMM d, yyyy p')}</p>
                  )}
                </div>
                <div className="flex gap-3">
                  {c.status === 'draft' && (
                    <Button variant="elegant" size="sm" disabled={busyId === c.id} onClick={() => send(c)}>
                      Send
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" disabled={busyId === c.id} onClick={() => remove(c)} className="text-red-400 hover:bg-red-500/10 hover:text-red-300">
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
