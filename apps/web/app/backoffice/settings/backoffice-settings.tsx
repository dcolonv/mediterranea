'use client';

import { useState, useEffect } from 'react';
import { Button, Input, Textarea } from '@/components/ui';
import { getSettings, updateSettings } from '@/actions/settings';
import { DEFAULT_STUDIO_SETTINGS } from '@mediterranea/shared/constants';
import type { DayHours, Weekday, WorkingHours } from '@mediterranea/shared/types';
import type { StudioSettingsFormData } from '@mediterranea/shared/validations';

const WEEKDAYS: { key: Weekday; label: string }[] = [
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday' },
  { key: 'saturday', label: 'Saturday' },
  { key: 'sunday', label: 'Sunday' },
];

export function BackofficeSettings() {
  const [hours, setHours] = useState<WorkingHours>(DEFAULT_STUDIO_SETTINGS.businessHours);
  const [minLeadHours, setMinLeadHours] = useState('2');
  const [maxAdvanceDays, setMaxAdvanceDays] = useState('60');
  const [slotInterval, setSlotInterval] = useState('30');
  const [cutoffHours, setCutoffHours] = useState('24');
  const [policyText, setPolicyText] = useState('');

  const [loyaltyEnabled, setLoyaltyEnabled] = useState(false);
  const [earnRate, setEarnRate] = useState('1');
  const [redeemRate, setRedeemRate] = useState('20');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getSettings().then((res) => {
      if (res.success) {
        const s = res.data;
        setHours(s.businessHours ?? DEFAULT_STUDIO_SETTINGS.businessHours);
        setMinLeadHours(String(s.booking.minLeadHours));
        setMaxAdvanceDays(String(s.booking.maxAdvanceDays));
        setSlotInterval(String(s.booking.slotIntervalMinutes));
        setCutoffHours(String(s.cancellation.cutoffHours));
        setPolicyText(s.cancellation.policyText);
        setLoyaltyEnabled(s.loyalty?.enabled ?? false);
        setEarnRate(String(s.loyalty?.earnPointsPerEuro ?? 1));
        setRedeemRate(String(s.loyalty?.redeemPointsPerEuro ?? 20));
      }
      setLoading(false);
    });
  }, []);

  function toggleDay(day: Weekday, working: boolean) {
    setHours((prev) => ({
      ...prev,
      [day]: working ? (prev[day] ?? { open: '09:00', close: '18:00' }) : null,
    }));
  }

  function setDayTime(day: Weekday, field: 'open' | 'close', value: string) {
    setHours((prev) => {
      const current = prev[day] ?? { open: '09:00', close: '18:00' };
      return { ...prev, [day]: { ...current, [field]: value } };
    });
  }

  async function save() {
    setError(null);
    setSaved(false);

    const payload: StudioSettingsFormData = {
      businessHours: hours as Record<string, DayHours | null>,
      booking: {
        minLeadHours: Number(minLeadHours),
        maxAdvanceDays: Number(maxAdvanceDays),
        slotIntervalMinutes: Number(slotInterval),
      },
      loyalty: {
        enabled: loyaltyEnabled,
        earnPointsPerEuro: Number(earnRate) || 0,
        redeemPointsPerEuro: Number(redeemRate) || 20,
      },
      cancellation: {
        cutoffHours: Number(cutoffHours),
        policyText: policyText.trim(),
      },
    };

    if (
      [payload.booking.minLeadHours, payload.booking.maxAdvanceDays, payload.booking.slotIntervalMinutes, payload.cancellation.cutoffHours].some(
        (n) => !Number.isFinite(n)
      )
    ) {
      setError('Booking numbers must be valid.');
      return;
    }

    setSaving(true);
    const res = await updateSettings(payload);
    setSaving(false);
    if (res.success) {
      setSaved(true);
    } else {
      setError(typeof res.error === 'string' ? res.error : 'Failed to save settings.');
    }
  }

  if (loading) {
    return <div className="py-16 text-center text-white-50">Loading settings…</div>;
  }

  return (
    <div className="max-w-3xl space-y-10">
      {/* Business hours */}
      <section className="border border-white-10 bg-dark-800 p-8">
        <h2 className="mb-1 font-serif text-xl text-white">Business hours</h2>
        <p className="mb-6 text-sm text-white-50">
          When the studio is open. Bookable times are also bounded by each practitioner’s own hours.
        </p>
        <div className="space-y-2">
          {WEEKDAYS.map(({ key, label }) => {
            const day = hours[key];
            const working = day != null;
            return (
              <div key={key} className="flex items-center gap-4 border border-white-10 bg-dark-900 px-4 py-3">
                <label className="flex w-40 cursor-pointer items-center gap-3 text-white-70">
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
      </section>

      {/* Booking rules */}
      <section className="border border-white-10 bg-dark-800 p-8">
        <h2 className="mb-1 font-serif text-xl text-white">Booking rules</h2>
        <p className="mb-6 text-sm text-white-50">
          These bound the availability engine used across walk-ins, the assistant, and online booking.
        </p>
        <div className="grid gap-5 sm:grid-cols-3">
          <Input
            id="min-lead"
            label="Min. lead time (hours)"
            type="number"
            value={minLeadHours}
            onChange={(e) => setMinLeadHours(e.target.value)}
          />
          <Input
            id="max-advance"
            label="Book up to (days ahead)"
            type="number"
            value={maxAdvanceDays}
            onChange={(e) => setMaxAdvanceDays(e.target.value)}
          />
          <Input
            id="slot-interval"
            label="Slot interval (min)"
            type="number"
            value={slotInterval}
            onChange={(e) => setSlotInterval(e.target.value)}
          />
        </div>
      </section>

      {/* Cancellation policy */}
      <section className="border border-white-10 bg-dark-800 p-8">
        <h2 className="mb-1 font-serif text-xl text-white">Cancellation policy</h2>
        <p className="mb-6 text-sm text-white-50">
          Shown to customers at booking. The cutoff governs self-service cancellations.
        </p>
        <div className="space-y-5">
          <div className="sm:max-w-xs">
            <Input
              id="cutoff"
              label="Self-cancel cutoff (hours before)"
              type="number"
              value={cutoffHours}
              onChange={(e) => setCutoffHours(e.target.value)}
            />
          </div>
          <Textarea
            id="policy-text"
            label="Policy text"
            value={policyText}
            onChange={(e) => setPolicyText(e.target.value)}
            rows={3}
          />
        </div>
      </section>

      {/* Loyalty */}
      <section className="border border-white-10 bg-dark-800 p-8">
        <h2 className="mb-1 font-serif text-xl text-white">Loyalty</h2>
        <p className="mb-6 text-sm text-white-50">
          Reward clients with points on completed appointments, redeemable for value.
        </p>
        <label className="mb-6 flex items-center gap-3 text-white-70">
          <input
            type="checkbox"
            checked={loyaltyEnabled}
            onChange={(e) => setLoyaltyEnabled(e.target.checked)}
            className="h-4 w-4 accent-gold"
          />
          <span className="text-sm">Enable loyalty points</span>
        </label>
        <div className="grid gap-5 sm:grid-cols-2">
          <Input
            id="earn-rate"
            label="Points earned per €1 spent"
            type="number"
            value={earnRate}
            onChange={(e) => setEarnRate(e.target.value)}
          />
          <Input
            id="redeem-rate"
            label="Points for €1 of value"
            type="number"
            value={redeemRate}
            onChange={(e) => setRedeemRate(e.target.value)}
          />
        </div>
      </section>

      <div className="flex items-center gap-4">
        <Button variant="elegant" onClick={save} disabled={saving}>
          {saving ? 'Saving…' : 'Save Settings'}
        </Button>
        {saved && <span className="text-sm text-green-400">Saved.</span>}
        {error && <span className="text-sm text-red-400">{error}</span>}
      </div>
    </div>
  );
}
