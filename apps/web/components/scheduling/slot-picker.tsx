'use client';

import { useState } from 'react';
import { Button } from '@/components/ui';

export interface BackofficeSlot {
  time: string;
  available: boolean;
  staffIds: string[];
  roomIds: string[];
}

/**
 * A day's start times for staff: open ones selectable, taken ones struck
 * through, plus an "other time" field for anything off the grid (e.g. a past
 * visit that started at 18:45).
 */
export function SlotPicker({
  slots,
  selected,
  onPick,
  onOtherTime,
}: {
  slots: BackofficeSlot[];
  selected?: string;
  onPick: (slot: BackofficeSlot) => void;
  onOtherTime: (time: string) => void;
}) {
  const [other, setOther] = useState('');

  return (
    <div>
      {slots.length === 0 ? (
        <p className="text-sm text-white-50">No times on the grid for this day.</p>
      ) : (
        <>
          <div className="mb-4 flex items-center gap-5 text-xs text-white-50">
            <span className="flex items-center gap-2">
              <span className="h-3 w-3 border border-gold/50" /> Available
            </span>
            <span className="flex items-center gap-2">
              <span className="h-3 w-3 border border-white-10 bg-white-10" /> Taken
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {slots.map((s) => (
              <button
                key={s.time}
                type="button"
                disabled={!s.available}
                onClick={() => onPick(s)}
                className={`border px-3 py-2 text-sm transition-colors ${
                  selected === s.time
                    ? 'border-gold bg-gold/15 text-white'
                    : s.available
                      ? 'border-white-10 text-white-70 hover:border-gold/40 hover:text-white'
                      : 'cursor-not-allowed border-white-10/50 text-white-30 line-through'
                }`}
              >
                {s.time}
              </button>
            ))}
          </div>
        </>
      )}

      <div className="mt-5 flex items-end gap-2">
        <label className="flex flex-col gap-2 text-sm font-medium tracking-wide text-white-70">
          Other time
          <input
            type="time"
            value={other}
            onChange={(e) => setOther(e.target.value)}
            className="h-10 border border-white-10 bg-dark-800 px-3 text-white focus:border-gold focus:outline-none"
          />
        </label>
        <Button type="button" variant="outline" size="sm" disabled={!other} onClick={() => onOtherTime(other)}>
          Use
        </Button>
      </div>
      <p className="mt-2 text-xs text-white-30">
        For a time off the grid. Opening hours aren’t checked; clashes with other bookings are.
      </p>
    </div>
  );
}
