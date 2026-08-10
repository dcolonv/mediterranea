'use client';

import { useState } from 'react';
import { Button, Textarea } from '@/components/ui';
import { useLang } from '@/components/i18n/language-provider';
import { submitMyReview } from '@/actions/reviews';

export function ReviewForm({
  appointmentId,
  onDone,
  onCancel,
}: {
  appointmentId: string;
  onDone: () => void;
  onCancel: () => void;
}) {
  const { dict } = useLang();
  const r = dict.reviews;
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (rating < 1) {
      setError(r.yourRating);
      return;
    }
    setSaving(true);
    setError(null);
    const res = await submitMyReview({ appointmentId, rating, comment });
    setSaving(false);
    if (res.success) onDone();
    else setError(res.error ?? 'Error');
  }

  return (
    <div className="mt-3 border-t border-white-10 pt-3">
      <span className="mb-2 block text-xs uppercase tracking-wider text-white-50">{r.yourRating}</span>
      <div className="flex gap-1" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setRating(n)}
            onMouseEnter={() => setHover(n)}
            aria-label={`${n}`}
            className={`text-2xl leading-none transition-colors ${
              n <= (hover || rating) ? 'text-gold' : 'text-white-30'
            }`}
          >
            ★
          </button>
        ))}
      </div>

      <Textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder={r.comment}
        rows={3}
        className="mt-3"
      />

      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}

      <div className="mt-3 flex gap-2">
        <Button variant="elegant" size="sm" onClick={submit} disabled={saving}>
          {saving ? r.submitting : r.submit}
        </Button>
        <Button variant="ghost" size="sm" onClick={onCancel} disabled={saving}>
          {r.cancel}
        </Button>
      </div>
    </div>
  );
}
