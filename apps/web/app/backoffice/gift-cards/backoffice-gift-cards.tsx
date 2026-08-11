'use client';

import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { Button, Input, Textarea, Badge } from '@/components/ui';
import { formatPrice } from '@mediterranea/shared/utils';
import {
  getGiftCards,
  issueGiftCardManual,
  redeemGiftCard,
  voidGiftCard,
} from '@/actions/gift-cards';
import type { GiftCard, GiftCardStatus } from '@mediterranea/shared/types';

const STATUS_VARIANT: Record<GiftCardStatus, 'completed' | 'pending' | 'cancelled'> = {
  active: 'completed',
  depleted: 'pending',
  void: 'cancelled',
};

function cardDate(c: GiftCard): string {
  const ts = c.createdAt as unknown as { seconds?: number; _seconds?: number } | undefined;
  const secs = ts?.seconds ?? ts?._seconds;
  return secs ? format(new Date(secs * 1000), 'MMM d, yyyy') : '';
}

export function BackofficeGiftCards() {
  const [cards, setCards] = useState<GiftCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<'list' | 'issue'>('list');
  const [busyId, setBusyId] = useState<string | null>(null);

  // Issue form
  const [amount, setAmount] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redeem inline
  const [redeemFor, setRedeemFor] = useState<string | null>(null);
  const [redeemAmount, setRedeemAmount] = useState('');
  const [redeemNote, setRedeemNote] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const res = await getGiftCards();
    if (res.success && res.data) setCards(res.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function issue() {
    setError(null);
    if (!amount.trim() || !recipientEmail.trim()) {
      setError('Amount and recipient email are required.');
      return;
    }
    setSaving(true);
    const res = await issueGiftCardManual({
      amount: Number(amount),
      recipientName,
      recipientEmail,
      message,
    });
    setSaving(false);
    if (res.success) {
      setAmount('');
      setRecipientName('');
      setRecipientEmail('');
      setMessage('');
      setMode('list');
      await load();
    } else {
      setError(res.error);
    }
  }

  async function doRedeem(card: GiftCard) {
    setBusyId(card.id);
    const res = await redeemGiftCard(card.id, Number(redeemAmount), redeemNote);
    setBusyId(null);
    if (res.success) {
      setRedeemFor(null);
      setRedeemAmount('');
      setRedeemNote('');
      await load();
    } else {
      alert(res.error);
    }
  }

  async function doVoid(card: GiftCard) {
    if (!confirm(`Void gift card ${card.code}? The remaining balance can no longer be used.`)) return;
    setBusyId(card.id);
    const res = await voidGiftCard(card.id);
    setBusyId(null);
    if (res.success) await load();
  }

  if (loading) return <div className="py-16 text-center text-white-50">Loading gift cards…</div>;

  // ── Issue form ──────────────────────────────────────────────────────────────
  if (mode === 'issue') {
    return (
      <div className="max-w-xl border border-white-10 bg-dark-800 p-8">
        <h2 className="mb-6 font-serif text-xl text-white">Issue a gift card</h2>
        <div className="space-y-5">
          <div className="w-40">
            <Input id="gc-amount" label="Amount (€)" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <Input id="gc-rn" label="Recipient name" value={recipientName} onChange={(e) => setRecipientName(e.target.value)} />
          <Input id="gc-re" label="Recipient email" type="email" value={recipientEmail} onChange={(e) => setRecipientEmail(e.target.value)} />
          <Textarea id="gc-m" label="Message (optional)" value={message} onChange={(e) => setMessage(e.target.value)} rows={2} />
          {error && <p className="text-sm text-red-400">{error}</p>}
          <div className="flex gap-3 pt-2">
            <Button variant="elegant" onClick={issue} disabled={saving}>
              {saving ? 'Issuing…' : 'Issue & email'}
            </Button>
            <Button variant="ghost" onClick={() => setMode('list')} disabled={saving}>
              Cancel
            </Button>
          </div>
          <p className="text-xs text-white-30">
            The recipient is emailed a code. Manual cards don’t take payment — use for promos or in-person sales.
          </p>
        </div>
      </div>
    );
  }

  // ── List ────────────────────────────────────────────────────────────────────
  const outstanding = cards
    .filter((c) => c.status === 'active')
    .reduce((sum, c) => sum + (c.balance ?? 0), 0);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <Button variant="elegant" onClick={() => { setError(null); setMode('issue'); }}>
          + Issue gift card
        </Button>
        <span className="text-sm text-white-50">
          Outstanding balance: <span className="text-white">{formatPrice(outstanding)}</span>
        </span>
      </div>

      {cards.length === 0 ? (
        <div className="border border-white-10 bg-dark-800 p-16 text-center text-white-50">
          No gift cards yet.
        </div>
      ) : (
        <div className="space-y-4">
          {cards.map((c) => (
            <div key={c.id} className="border border-white-10 bg-dark-800 p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-lg tracking-wider text-white">{c.code}</span>
                    <Badge variant={STATUS_VARIANT[c.status]}>{c.status}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-white-50">
                    {formatPrice(c.balance)} left of {formatPrice(c.initialAmount)} ·{' '}
                    {c.source === 'online' ? 'Purchased' : 'Issued'} {cardDate(c)}
                  </p>
                  <p className="mt-1 text-xs text-white-30">
                    {c.recipientName || c.recipientEmail || c.purchaserName || '—'}
                    {c.recipientEmail ? ` · ${c.recipientEmail}` : ''}
                  </p>
                  {c.message && <p className="mt-2 text-sm italic text-white-50">“{c.message}”</p>}
                </div>
              </div>

              {redeemFor === c.id ? (
                <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-white-10 pt-4">
                  <div className="w-32">
                    <Input id={`r-amt-${c.id}`} label="Redeem €" type="number" value={redeemAmount} onChange={(e) => setRedeemAmount(e.target.value)} />
                  </div>
                  <div className="flex-1 min-w-[10rem]">
                    <Input id={`r-note-${c.id}`} label="Note (optional)" value={redeemNote} onChange={(e) => setRedeemNote(e.target.value)} />
                  </div>
                  <Button variant="elegant" size="sm" disabled={busyId === c.id} onClick={() => doRedeem(c)}>
                    Apply
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setRedeemFor(null)}>
                    Cancel
                  </Button>
                </div>
              ) : (
                <div className="mt-4 flex flex-wrap gap-3 border-t border-white-10 pt-4">
                  {c.status === 'active' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => { setRedeemFor(c.id); setRedeemAmount(''); setRedeemNote(''); }}
                    >
                      Redeem
                    </Button>
                  )}
                  {c.status !== 'void' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={busyId === c.id}
                      onClick={() => doVoid(c)}
                      className="ml-auto text-red-400 hover:bg-red-500/10 hover:text-red-300"
                    >
                      Void
                    </Button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
