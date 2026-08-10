'use client';

import { useEffect, useState } from 'react';

// Opening day: 8 September 2026, 09:00 Málaga time (CEST, UTC+2).
const TARGET_MS = new Date('2026-09-08T09:00:00+02:00').getTime();

interface Remaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  done: boolean;
}

function calc(): Remaining {
  const diff = Math.max(0, TARGET_MS - Date.now());
  return {
    days: Math.floor(diff / 86_400_000),
    hours: Math.floor((diff % 86_400_000) / 3_600_000),
    minutes: Math.floor((diff % 3_600_000) / 60_000),
    seconds: Math.floor((diff % 60_000) / 1_000),
    done: diff === 0,
  };
}

const UNITS: { key: keyof Omit<Remaining, 'done'>; label: string }[] = [
  { key: 'days', label: 'Days' },
  { key: 'hours', label: 'Hours' },
  { key: 'minutes', label: 'Minutes' },
  { key: 'seconds', label: 'Seconds' },
];

export function CountdownTimer() {
  // Start null so the server and first client render match (no hydration flash).
  const [t, setT] = useState<Remaining | null>(null);

  useEffect(() => {
    setT(calc());
    const id = setInterval(() => setT(calc()), 1000);
    return () => clearInterval(id);
  }, []);

  if (t?.done) {
    return (
      <p className="font-serif text-2xl text-gold sm:text-3xl">We&apos;re open — welcome.</p>
    );
  }

  return (
    <div className="flex items-start justify-center gap-4 sm:gap-8">
      {UNITS.map(({ key, label }) => (
        <div key={key} className="flex flex-col items-center">
          <div className="min-w-[3.5rem] border border-white-10 bg-dark-800/60 px-3 py-4 sm:min-w-[5rem] sm:px-5 sm:py-6">
            <span className="font-serif text-3xl tabular-nums text-white sm:text-5xl">
              {t ? String(t[key]).padStart(2, '0') : '--'}
            </span>
          </div>
          <span className="mt-3 text-[10px] uppercase tracking-[0.25em] text-gold/70 sm:text-xs">
            {label}
          </span>
        </div>
      ))}
    </div>
  );
}
