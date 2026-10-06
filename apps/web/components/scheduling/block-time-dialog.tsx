'use client';

import { useState } from 'react';
import { Button, Input, Select } from '@/components/ui';
import { addStaffTimeOff } from '@/actions/staff';
import type { Staff } from '@mediterranea/shared/types';

const fieldClass =
  'h-12 w-full border border-white-10 bg-dark-800 px-4 text-white focus:border-gold focus:outline-none';

/**
 * Block time for a practitioner straight from the calendar — the same time off
 * the Staff page edits. A whole day (or a range of days), or part of one day.
 */
export function BlockTimeDialog({
  staff,
  initialDate,
  initialStaffId = '',
  onClose,
  onSaved,
}: {
  staff: Staff[];
  initialDate: string;
  /** Preselect a practitioner, e.g. the calendar's staff filter. */
  initialStaffId?: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  // A single practitioner is picked for you.
  const [staffId, setStaffId] = useState(
    initialStaffId || (staff.length === 1 ? staff[0].id : '')
  );
  const [allDay, setAllDay] = useState(true);
  const [date, setDate] = useState(initialDate);
  const [endDate, setEndDate] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (!staffId) {
      setError('Choose a practitioner.');
      return;
    }
    if (!allDay && (!start || !end)) {
      setError('Set the start and end times, or block the whole day.');
      return;
    }
    setSaving(true);
    setError(null);
    const res = await addStaffTimeOff(staffId, {
      date,
      ...(allDay ? { endDate: endDate || undefined } : { start, end }),
      reason,
    });
    setSaving(false);
    if (!res.success) {
      setError(res.error);
      return;
    }
    onSaved();
    onClose();
  }

  const single = staff.length === 1 ? staff[0] : null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4">
      <div className="my-8 w-full max-w-lg border border-white-10 bg-dark-800 p-6 sm:p-8">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-serif text-2xl text-white">Block Time</h2>
          <button onClick={onClose} className="text-white-50 hover:text-white text-2xl leading-none">
            ×
          </button>
        </div>
        <p className="mb-6 text-sm text-white-50">
          {single ? `${single.name} won’t be bookable then.` : 'The practitioner won’t be bookable then.'}{' '}
          Appointments already booked in that time stay as they are.
        </p>

        <div className="space-y-5">
          {!single && (
            <Select
              id="bt-staff"
              label="Practitioner"
              placeholder="Select…"
              value={staffId}
              onChange={(e) => setStaffId(e.target.value)}
              options={staff.map((s) => ({ value: s.id, label: s.name }))}
            />
          )}

          <label className="flex cursor-pointer items-center gap-3 text-sm text-white-70">
            <input
              type="checkbox"
              checked={allDay}
              onChange={(e) => setAllDay(e.target.checked)}
              className="h-4 w-4 accent-gold"
            />
            All day
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium tracking-wide text-white-70">
                {allDay ? 'From' : 'Date'}
              </label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={fieldClass} />
            </div>
            {allDay && (
              <div>
                <label className="mb-2 block text-sm font-medium tracking-wide text-white-70">
                  To (optional)
                </label>
                <input
                  type="date"
                  value={endDate}
                  min={date || undefined}
                  onChange={(e) => setEndDate(e.target.value)}
                  className={fieldClass}
                />
              </div>
            )}
          </div>

          {!allDay && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-2 block text-sm font-medium tracking-wide text-white-70">From</label>
                <input type="time" value={start} onChange={(e) => setStart(e.target.value)} className={fieldClass} />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium tracking-wide text-white-70">To</label>
                <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} className={fieldClass} />
              </div>
            </div>
          )}

          <Input
            id="bt-reason"
            label="Reason (optional)"
            placeholder="Doctor’s appointment"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="flex gap-3 border-t border-white-10 pt-6">
            <Button variant="elegant" onClick={save} disabled={saving || !date}>
              {saving ? 'Saving…' : 'Block Time'}
            </Button>
            <Button variant="ghost" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
