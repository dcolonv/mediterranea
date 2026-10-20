'use client';

import { useEffect, useRef, useState } from 'react';
import { format } from 'date-fns';
import { Button, Textarea } from '@/components/ui';
import {
  getPreviousTreatment,
  saveTreatmentRecord,
  transcribeTreatmentPhoto,
  type PreviousTreatment,
} from '@/actions/treatment-notes';
import type { Appointment } from '@mediterranea/shared/types';

/**
 * Shrink a photo in the browser so it uploads quickly and fits the request
 * limit; handwriting stays legible at about 2000 px on the long side.
 */
async function photoToDataUrl(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 2000 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  for (const quality of [0.82, 0.7, 0.55]) {
    const url = canvas.toDataURL('image/jpeg', quality);
    if (url.length < 900_000) return url;
  }
  return canvas.toDataURL('image/jpeg', 0.45);
}

const addTo = (current: string, more: string) => (current.trim() && more ? `${current.trim()}\n\n${more}` : current || more);

/**
 * An appointment's treatment record: what was applied, what to do next time,
 * and the client's previous record for reference. Notes can be typed or read
 * from a photo of the paper handbook.
 */
export function TreatmentRecord({ appointment, onSaved }: { appointment: Appointment; onSaved: () => void }) {
  const [applied, setApplied] = useState(appointment.appliedTreatment ?? '');
  const [next, setNext] = useState(appointment.nextTreatment ?? '');
  const [saved, setSaved] = useState({ applied: appointment.appliedTreatment ?? '', next: appointment.nextTreatment ?? '' });
  const [saving, setSaving] = useState(false);
  const [reading, setReading] = useState(false);
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);
  const [previous, setPrevious] = useState<PreviousTreatment | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const dirty = applied !== saved.applied || next !== saved.next;

  useEffect(() => {
    getPreviousTreatment(appointment.id).then(setPrevious);
  }, [appointment.id]);

  async function save() {
    setSaving(true);
    setMessage(null);
    const res = await saveTreatmentRecord(appointment.id, { applied, next });
    setSaving(false);
    if (!res.success) {
      setMessage({ text: res.error, error: true });
      return;
    }
    setSaved({ applied: applied.trim(), next: next.trim() });
    setApplied(applied.trim());
    setNext(next.trim());
    setMessage({ text: 'Saved.' });
    onSaved();
  }

  async function readPhoto(file: File) {
    setReading(true);
    setMessage(null);
    try {
      const res = await transcribeTreatmentPhoto(appointment.id, await photoToDataUrl(file));
      if (!res.success) {
        setMessage({ text: res.error, error: true });
        return;
      }
      // Added below anything already written, for review before saving.
      setApplied((v) => addTo(v, res.applied));
      setNext((v) => addTo(v, res.next));
      setMessage({ text: 'Transcribed. Check the text, then save.' });
    } catch {
      setMessage({ text: 'Couldn’t open that photo. Try another one.', error: true });
    } finally {
      setReading(false);
    }
  }

  return (
    <div className="text-sm">
      <span className="text-white-30 text-xs uppercase tracking-wider">Treatment record</span>

      {previous && (
        <div className="mt-2 border border-white-10 bg-dark-800 p-3 text-xs">
          <p className="text-white-50">
            Last visit · {format(new Date(`${previous.date}T00:00:00`), 'MMM d, yyyy')} · {previous.serviceName}
          </p>
          {previous.applied && (
            <p className="mt-1 whitespace-pre-wrap text-white-70">
              <span className="text-white-30">Applied: </span>
              {previous.applied}
            </p>
          )}
          {previous.next && (
            <p className="mt-1 whitespace-pre-wrap text-gold">
              <span className="text-white-30">Next time: </span>
              {previous.next}
            </p>
          )}
        </div>
      )}

      <div className="mt-3 space-y-3">
        <Textarea
          label="Applied"
          value={applied}
          onChange={(e) => setApplied(e.target.value)}
          placeholder="What you applied today: products, device settings, steps…"
          rows={3}
        />
        <Textarea
          label="Next time"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          placeholder="What to do at the next visit…"
          rows={2}
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = ''; // allow choosing the same photo again
            if (file) void readPhoto(file);
          }}
        />
        <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={reading || saving}>
          {reading ? 'Reading photo…' : 'Transcribe from photo'}
        </Button>
        {dirty && (
          <Button variant="elegant" size="sm" onClick={save} disabled={saving || reading}>
            {saving ? 'Saving…' : 'Save record'}
          </Button>
        )}
        {message && (
          <span className={`text-xs ${message.error ? 'text-red-400' : 'text-white-50'}`}>{message.text}</span>
        )}
      </div>
      <p className="mt-2 text-xs text-white-30">
        A photo of your handbook is read by the AI assistant to fill in the text above. It isn’t kept.
      </p>
    </div>
  );
}
