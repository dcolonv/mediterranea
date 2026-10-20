'use client';

import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { Button, Badge, Input, Select, Textarea } from '@/components/ui';
import { getAllReviews, setReviewStatus, deleteReview, addReview } from '@/actions/reviews';
import type { Review, ReviewStatus } from '@mediterranea/shared/types';

const STATUS_VARIANT: Record<ReviewStatus, 'pending' | 'completed' | 'cancelled'> = {
  pending: 'pending',
  published: 'completed',
  hidden: 'cancelled',
};

const STATUS_LABEL: Record<ReviewStatus, string> = {
  pending: 'Pending',
  published: 'Published',
  hidden: 'Hidden',
};

/** When it was written on Google when known, otherwise when it was added here. */
function reviewDate(r: Review): string {
  if (r.reviewDate) return format(new Date(`${r.reviewDate}T00:00:00`), 'MMM d, yyyy');
  const ts = r.createdAt as unknown as { seconds?: number; _seconds?: number } | undefined;
  const secs = ts?.seconds ?? ts?._seconds;
  return secs ? format(new Date(secs * 1000), 'MMM d, yyyy') : '';
}

const EMPTY_DRAFT = { authorName: '', rating: '5', comment: '', serviceName: '', reviewDate: '' };

/** Paste a review from Google; it's published straight away. */
function AddReviewForm({ onAdded, onCancel }: { onAdded: () => void; onCancel: () => void }) {
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (field: keyof typeof EMPTY_DRAFT) => (value: string) => setDraft((d) => ({ ...d, [field]: value }));

  async function save() {
    setSaving(true);
    setError(null);
    const res = await addReview({ ...draft, rating: Number(draft.rating) });
    setSaving(false);
    if (!res.success) {
      setError(res.error);
      return;
    }
    setDraft(EMPTY_DRAFT);
    onAdded();
  }

  return (
    <div className="mb-8 space-y-4 border border-white-10 bg-dark-800 p-6">
      <h2 className="font-serif text-xl text-white">Add a review from Google</h2>
      <div className="grid gap-4 sm:grid-cols-3">
        <Input id="rv-name" label="Name" value={draft.authorName} onChange={(e) => set('authorName')(e.target.value)} />
        <Select
          id="rv-rating"
          label="Stars"
          value={draft.rating}
          onChange={(e) => set('rating')(e.target.value)}
          options={[5, 4, 3, 2, 1].map((n) => ({ value: String(n), label: '★'.repeat(n) }))}
        />
        <Input
          id="rv-date"
          label="Date (optional)"
          type="date"
          value={draft.reviewDate}
          onChange={(e) => set('reviewDate')(e.target.value)}
        />
      </div>
      <Textarea
        id="rv-comment"
        label="Review"
        value={draft.comment}
        onChange={(e) => set('comment')(e.target.value)}
        rows={4}
        placeholder="Paste the review text"
      />
      <Input
        id="rv-service"
        label="Treatment (optional)"
        value={draft.serviceName}
        onChange={(e) => set('serviceName')(e.target.value)}
        placeholder="e.g. 1.5 Hour Facial"
      />
      {error && <p className="text-sm text-red-400">{error}</p>}
      <div className="flex gap-3">
        <Button variant="elegant" onClick={save} disabled={saving || !draft.authorName.trim()}>
          {saving ? 'Adding…' : 'Add review'}
        </Button>
        <Button variant="ghost" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

export function BackofficeReviews() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<ReviewStatus | 'all'>('all');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await getAllReviews();
    if (res.success && res.data) setReviews(res.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function changeStatus(id: string, status: ReviewStatus) {
    setBusyId(id);
    const res = await setReviewStatus(id, status);
    setBusyId(null);
    if (res.success) {
      setReviews((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this review permanently?')) return;
    setBusyId(id);
    const res = await deleteReview(id);
    setBusyId(null);
    if (res.success) setReviews((prev) => prev.filter((r) => r.id !== id));
  }

  const visible = filter === 'all' ? reviews : reviews.filter((r) => r.status === filter);
  const counts = {
    all: reviews.length,
    pending: reviews.filter((r) => r.status === 'pending').length,
    published: reviews.filter((r) => r.status === 'published').length,
    hidden: reviews.filter((r) => r.status === 'hidden').length,
  };

  if (loading) return <div className="py-16 text-center text-white-50">Loading reviews…</div>;

  return (
    <div>
      {adding ? (
        <AddReviewForm
          onAdded={() => {
            setAdding(false);
            void load();
          }}
          onCancel={() => setAdding(false)}
        />
      ) : (
        <div className="mb-6">
          <Button variant="elegant" onClick={() => setAdding(true)}>
            + Add review
          </Button>
        </div>
      )}

      {/* Filter tabs */}
      <div className="mb-6 flex flex-wrap gap-2">
        {(['all', 'pending', 'published', 'hidden'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 text-xs uppercase tracking-wider transition-colors ${
              filter === f ? 'bg-gold text-charcoal' : 'border border-white-10 text-white-50 hover:text-white'
            }`}
          >
            {f} ({counts[f]})
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="border border-white-10 bg-dark-800 p-16 text-center text-white-50">
          No reviews here.
        </div>
      ) : (
        <div className="space-y-4">
          {visible.map((r) => (
            <div key={r.id} className="border border-white-10 bg-dark-800 p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="text-gold">
                      {'★'.repeat(r.rating)}
                      <span className="text-white-30">{'★'.repeat(5 - r.rating)}</span>
                    </span>
                    <Badge variant={STATUS_VARIANT[r.status]}>{STATUS_LABEL[r.status]}</Badge>
                    {r.source === 'google' && (
                      <span className="text-[11px] uppercase tracking-wider text-white-30">Google</span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-white-50">
                    {[r.authorName, r.serviceName, reviewDate(r)].filter(Boolean).join(' · ')}
                  </p>
                </div>
              </div>

              {r.comment && <p className="mt-4 text-white-70">“{r.comment}”</p>}

              <div className="mt-4 flex flex-wrap gap-3 border-t border-white-10 pt-4">
                {r.status !== 'published' && (
                  <Button
                    variant="elegant"
                    size="sm"
                    disabled={busyId === r.id}
                    onClick={() => changeStatus(r.id, 'published')}
                  >
                    Publish
                  </Button>
                )}
                {r.status !== 'hidden' && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={busyId === r.id}
                    onClick={() => changeStatus(r.id, 'hidden')}
                  >
                    Hide
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={busyId === r.id}
                  onClick={() => handleDelete(r.id)}
                  className="ml-auto text-red-400 hover:bg-red-500/10 hover:text-red-300"
                >
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
