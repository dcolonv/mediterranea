'use client';

import { useMemo, useState } from 'react';
import { LuChevronLeft, LuChevronRight } from 'react-icons/lu';
import type { WorkingHours, Weekday } from '@mediterranea/shared/types';

const WEEKDAY_KEYS: Weekday[] = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
];

function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** The soonest bookable date: the first open, non-blocked day that is today-or-later and ≥ minDate. */
export function firstSelectableDate(
  businessHours: WorkingHours,
  maxAdvanceDays: number,
  minDate = '',
  blockedDates: string[] = []
): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const blocked = new Set(blockedDates);
  for (let i = 0; i <= maxAdvanceDays; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const ds = ymd(d);
    if (ds >= minDate && !blocked.has(ds) && businessHours?.[WEEKDAY_KEYS[d.getDay()]]) return ds;
  }
  return minDate || ymd(today);
}

/**
 * A month grid for picking a booking date. Days that are in the past, beyond the
 * booking window, or on a closed weekday are disabled. Monday-first, localized.
 */
export function MonthCalendar({
  businessHours,
  maxAdvanceDays,
  minDate = '',
  blockedDates = [],
  locale,
  selectedDate,
  onSelectDate,
  prevLabel,
  nextLabel,
}: {
  businessHours: WorkingHours;
  maxAdvanceDays: number;
  /** Earliest selectable date (e.g. the opening date), 'YYYY-MM-DD'. */
  minDate?: string;
  /** Fully-closed dates (e.g. holidays) to disable. */
  blockedDates?: string[];
  locale: 'es' | 'en';
  selectedDate: string;
  onSelectDate: (date: string) => void;
  prevLabel: string;
  nextLabel: string;
}) {
  const blocked = useMemo(() => new Set(blockedDates), [blockedDates]);
  const intlLocale = locale === 'es' ? 'es-ES' : 'en-GB';

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  const todayStr = ymd(today);
  const floorStr = minDate && minDate > todayStr ? minDate : todayStr;
  const maxDate = useMemo(() => {
    const d = new Date(today);
    d.setDate(d.getDate() + maxAdvanceDays);
    return d;
  }, [today, maxAdvanceDays]);
  const maxStr = ymd(maxDate);

  const [view, setView] = useState(() => {
    const init = selectedDate ? new Date(`${selectedDate}T00:00:00`) : today;
    return { year: init.getFullYear(), month: init.getMonth() };
  });

  const monthTitle = useMemo(() => {
    const d = new Date(view.year, view.month, 1);
    return cap(new Intl.DateTimeFormat(intlLocale, { month: 'long', year: 'numeric' }).format(d));
  }, [view, intlLocale]);

  // Monday-first weekday headers.
  const weekdayHeaders = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(intlLocale, { weekday: 'short' });
    // 2024-01-01 is a Monday.
    return Array.from({ length: 7 }, (_, i) => cap(fmt.format(new Date(2024, 0, 1 + i))));
  }, [intlLocale]);

  const firstOfMonth = new Date(view.year, view.month, 1);
  const leading = (firstOfMonth.getDay() + 6) % 7; // Monday-first offset
  const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();

  const cells: (Date | null)[] = [
    ...Array.from({ length: leading }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(view.year, view.month, i + 1)),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const floorDate = new Date(`${floorStr}T00:00:00`);
  const canPrev =
    view.year > floorDate.getFullYear() ||
    (view.year === floorDate.getFullYear() && view.month > floorDate.getMonth());
  const canNext =
    view.year < maxDate.getFullYear() ||
    (view.year === maxDate.getFullYear() && view.month < maxDate.getMonth());

  function shift(delta: number) {
    setView((v) => {
      const d = new Date(v.year, v.month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  }

  function isOpenDay(d: Date): boolean {
    return Boolean(businessHours?.[WEEKDAY_KEYS[d.getDay()]]);
  }

  return (
    <div className="border border-white-10 bg-dark-800/40 p-5 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => shift(-1)}
          disabled={!canPrev}
          aria-label={prevLabel}
          className="flex h-9 w-9 items-center justify-center border border-white-10 text-white-70 transition-colors hover:border-gold/40 hover:text-white disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-white-10"
        >
          <LuChevronLeft className="h-4 w-4" aria-hidden />
        </button>
        <span className="font-serif text-lg tracking-wide text-white">{monthTitle}</span>
        <button
          type="button"
          onClick={() => shift(1)}
          disabled={!canNext}
          aria-label={nextLabel}
          className="flex h-9 w-9 items-center justify-center border border-white-10 text-white-70 transition-colors hover:border-gold/40 hover:text-white disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-white-10"
        >
          <LuChevronRight className="h-4 w-4" aria-hidden />
        </button>
      </div>

      <div className="mb-2 grid grid-cols-7 gap-1 text-center">
        {weekdayHeaders.map((w, i) => (
          <span key={i} className="py-1 text-[10px] uppercase tracking-wider text-white-30">
            {w}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          if (!d) return <span key={i} />;
          const ds = ymd(d);
          const selectable = ds >= floorStr && ds <= maxStr && isOpenDay(d) && !blocked.has(ds);
          const isSelected = ds === selectedDate;
          return (
            <button
              key={i}
              type="button"
              disabled={!selectable}
              onClick={() => onSelectDate(ds)}
              className={`aspect-square text-sm transition-colors ${
                isSelected
                  ? 'border border-gold bg-gold/15 text-white'
                  : selectable
                    ? 'border border-transparent text-white-70 hover:border-gold/40 hover:text-white'
                    : 'cursor-not-allowed text-white-30'
              }`}
            >
              {d.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}
