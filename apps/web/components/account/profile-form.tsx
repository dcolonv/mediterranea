'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input, Textarea, Select } from '@/components/ui';
import { updateMyProfile } from '@/actions/account';
import type { PlainCustomer } from '@/lib/auth/customer';

const SKIN_TYPES = ['', 'normal', 'dry', 'oily', 'combination', 'sensitive'];
const CONCERNS = ['Acne', 'Fine lines & aging', 'Pigmentation', 'Redness', 'Dryness', 'Sensitivity'];

export function ProfileForm({ customer }: { customer: PlainCustomer }) {
  const router = useRouter();
  const [name, setName] = useState(customer.name);
  const [phone, setPhone] = useState(customer.phone);
  const [skinType, setSkinType] = useState(customer.skinProfile.skinType ?? '');
  const [concerns, setConcerns] = useState<string[]>(customer.skinProfile.concerns ?? []);
  const [preferences, setPreferences] = useState(customer.skinProfile.preferences ?? '');

  const [allergies, setAllergies] = useState(customer.intake.allergies ?? '');
  const [medications, setMedications] = useState(customer.intake.medications ?? '');
  const [conditions, setConditions] = useState(customer.intake.conditions ?? '');
  const [intakeNotes, setIntakeNotes] = useState(customer.intake.notes ?? '');

  const [treatmentConsent, setTreatmentConsent] = useState(customer.consent.treatmentConsent);
  const [marketingOptIn, setMarketingOptIn] = useState(customer.consent.marketingOptIn);
  const [signedName, setSignedName] = useState(customer.consent.signedName ?? '');

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleConcern(c: string) {
    setConcerns((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
    setSaved(false);
  }

  async function save() {
    if (treatmentConsent && !signedName.trim()) {
      setError('Please type your name to confirm consent.');
      return;
    }
    setSaving(true);
    setError(null);
    setSaved(false);
    const res = await updateMyProfile({
      name,
      phone,
      skinProfile: { skinType, concerns, preferences },
      intake: { allergies, medications, conditions, notes: intakeNotes },
      consent: { treatmentConsent, marketingOptIn, signedName },
    });
    setSaving(false);
    if (res.success) {
      setSaved(true);
      router.refresh();
    } else {
      setError(res.error);
    }
  }

  return (
    <div className="space-y-8">
      <section className="border border-white-10 bg-dark-800/50 p-8">
        <h2 className="mb-6 font-serif text-xl text-white">Contact details</h2>
        <div className="space-y-5">
          <Input id="p-name" label="Full name" value={name} onChange={(e) => setName(e.target.value)} />
          <Input id="p-email" label="Email" value={customer.email} disabled />
          <Input id="p-phone" label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
      </section>

      <section className="border border-white-10 bg-dark-800/50 p-8">
        <h2 className="mb-1 font-serif text-xl text-white">Skin profile</h2>
        <p className="mb-6 text-sm text-white-50">
          Helps your practitioner tailor each treatment. Optional.
        </p>
        <div className="space-y-6">
          <div className="sm:max-w-xs">
            <Select
              id="p-skintype"
              label="Skin type"
              value={skinType}
              onChange={(e) => setSkinType(e.target.value)}
              options={SKIN_TYPES.map((t) => ({
                value: t,
                label: t ? t[0].toUpperCase() + t.slice(1) : 'Not sure',
              }))}
            />
          </div>

          <div>
            <span className="mb-2 block text-sm font-medium tracking-wide text-white-70">Concerns</span>
            <div className="grid gap-2 sm:grid-cols-2">
              {CONCERNS.map((c) => (
                <label key={c} className="flex items-center gap-3 border border-white-10 px-3 py-2 text-white-70">
                  <input
                    type="checkbox"
                    checked={concerns.includes(c)}
                    onChange={() => toggleConcern(c)}
                    className="h-4 w-4 accent-gold"
                  />
                  <span className="text-sm">{c}</span>
                </label>
              ))}
            </div>
          </div>

          <Textarea
            id="p-prefs"
            label="Preferences, allergies, or sensitivities"
            value={preferences}
            onChange={(e) => setPreferences(e.target.value)}
            rows={3}
          />
        </div>
      </section>

      <section className="border border-white-10 bg-dark-800/50 p-8">
        <h2 className="mb-1 font-serif text-xl text-white">Consultation &amp; intake</h2>
        <p className="mb-6 text-sm text-white-50">
          Confidential — shared only with your practitioner to keep treatments safe.
        </p>
        <div className="space-y-5">
          <Textarea
            id="i-allergies"
            label="Allergies"
            value={allergies}
            onChange={(e) => setAllergies(e.target.value)}
            rows={2}
            placeholder="e.g. none, or list any known allergies"
          />
          <Textarea
            id="i-medications"
            label="Current medications"
            value={medications}
            onChange={(e) => setMedications(e.target.value)}
            rows={2}
          />
          <Textarea
            id="i-conditions"
            label="Medical conditions"
            value={conditions}
            onChange={(e) => setConditions(e.target.value)}
            rows={2}
          />
          <Textarea
            id="i-notes"
            label="Anything else we should know"
            value={intakeNotes}
            onChange={(e) => setIntakeNotes(e.target.value)}
            rows={2}
          />
        </div>
      </section>

      <section className="border border-white-10 bg-dark-800/50 p-8">
        <h2 className="mb-1 font-serif text-xl text-white">Consent</h2>
        <p className="mb-6 text-sm text-white-50">
          We process your data to provide treatments and keep records, per our privacy policy.
        </p>
        <div className="space-y-5">
          <label className="flex items-start gap-3 text-white-70">
            <input
              type="checkbox"
              checked={treatmentConsent}
              onChange={(e) => setTreatmentConsent(e.target.checked)}
              className="mt-1 h-4 w-4 accent-gold"
            />
            <span className="text-sm">
              I consent to treatment and to the studio storing my intake and skin-profile
              information for that purpose.
            </span>
          </label>
          <label className="flex items-start gap-3 text-white-70">
            <input
              type="checkbox"
              checked={marketingOptIn}
              onChange={(e) => setMarketingOptIn(e.target.checked)}
              className="mt-1 h-4 w-4 accent-gold"
            />
            <span className="text-sm">
              I’d like to receive occasional offers and skincare tips (optional).
            </span>
          </label>
          {treatmentConsent && (
            <div className="sm:max-w-sm">
              <Input
                id="c-signature"
                label="Type your name to sign"
                value={signedName}
                onChange={(e) => setSignedName(e.target.value)}
                placeholder="Your full name"
              />
            </div>
          )}
        </div>
      </section>

      <div className="flex items-center gap-4">
        <Button variant="elegant" onClick={save} disabled={saving}>
          {saving ? 'Saving…' : 'Save profile'}
        </Button>
        {saved && <span className="text-sm text-green-400">Saved.</span>}
        {error && <span className="text-sm text-red-400">{error}</span>}
      </div>
    </div>
  );
}
