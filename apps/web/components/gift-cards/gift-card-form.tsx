'use client';

import { useState } from 'react';
import { Button, Input, Textarea } from '@/components/ui';
import { formatPrice } from '@mediterranea/shared/utils';
import { useLang } from '@/components/i18n/language-provider';
import { createGiftCardCheckout } from '@/actions/gift-cards';

const PRESETS = [25, 50, 75, 100, 150];

export function GiftCardForm({ available }: { available: boolean }) {
  const { dict } = useLang();
  const g = dict.giftCards;

  const [amount, setAmount] = useState<number>(50);
  const [customMode, setCustomMode] = useState(false);
  const [custom, setCustom] = useState('');
  const [purchaserName, setPurchaserName] = useState('');
  const [purchaserEmail, setPurchaserEmail] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!available) {
    return (
      <div className="border border-white-10 bg-dark-800/50 p-8 text-center text-white-50">
        {g.unavailable}
      </div>
    );
  }

  const chosenAmount = customMode ? Number(custom) : amount;

  async function submit() {
    setError(null);
    if (!purchaserName.trim() || !purchaserEmail.trim()) {
      setError(dict.booking.provideDetails);
      return;
    }
    if (!Number.isFinite(chosenAmount) || chosenAmount < 10) {
      setError(`${g.amount}: ${formatPrice(10)}+`);
      return;
    }
    setLoading(true);
    const res = await createGiftCardCheckout({
      amount: chosenAmount,
      purchaserName,
      purchaserEmail,
      recipientName,
      recipientEmail,
      message,
    });
    if (res.success) {
      window.location.href = res.url; // redirect to Stripe Checkout
    } else {
      setError(res.error);
      setLoading(false);
    }
  }

  return (
    <div className="border border-white-10 bg-dark-800/50 p-8 sm:p-10">
      {/* Amount */}
      <label className="mb-3 block text-sm font-medium tracking-wide text-white-70">{g.amount}</label>
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => {
              setCustomMode(false);
              setAmount(p);
            }}
            className={`px-4 py-2 text-sm transition-colors ${
              !customMode && amount === p
                ? 'bg-gold text-charcoal'
                : 'border border-white-10 text-white-70 hover:border-gold/40'
            }`}
          >
            {formatPrice(p)}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setCustomMode(true)}
          className={`px-4 py-2 text-sm transition-colors ${
            customMode ? 'bg-gold text-charcoal' : 'border border-white-10 text-white-70 hover:border-gold/40'
          }`}
        >
          {g.custom}
        </button>
      </div>
      {customMode && (
        <div className="mt-3 w-40">
          <Input
            id="gc-custom"
            type="number"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            placeholder="€"
          />
        </div>
      )}

      {/* Purchaser */}
      <div className="mt-8 grid gap-5 sm:grid-cols-2">
        <Input id="gc-name" label={g.yourName} value={purchaserName} onChange={(e) => setPurchaserName(e.target.value)} />
        <Input
          id="gc-email"
          label={g.yourEmail}
          type="email"
          value={purchaserEmail}
          onChange={(e) => setPurchaserEmail(e.target.value)}
        />
      </div>

      {/* Recipient */}
      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <Input
          id="gc-rname"
          label={g.recipientName}
          value={recipientName}
          onChange={(e) => setRecipientName(e.target.value)}
        />
        <Input
          id="gc-remail"
          label={g.recipientEmail}
          type="email"
          value={recipientEmail}
          onChange={(e) => setRecipientEmail(e.target.value)}
        />
      </div>
      <p className="mt-2 text-xs text-white-30">{g.recipientHint}</p>

      <div className="mt-5">
        <Textarea id="gc-msg" label={g.message} value={message} onChange={(e) => setMessage(e.target.value)} rows={3} />
      </div>

      {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

      <div className="mt-8">
        <Button variant="elegant" size="lg" onClick={submit} disabled={loading}>
          {loading ? g.processing : `${g.continue} · ${formatPrice(chosenAmount || 0)}`}
        </Button>
      </div>
    </div>
  );
}
