'use client';

import { useEffect, useState } from 'react';
import { useLang } from '@/components/i18n/language-provider';

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

export function CountdownTimer() {
  const { dict } = useLang();
  // Start null so the server and first client render match (no hydration flash).
  const [t, setT] = useState<Remaining | null>(null);

  const UNITS: { key: keyof Omit<Remaining, 'done'>; label: string }[] = [
    { key: 'days', label: dict.comingSoon.days },
    { key: 'hours', label: dict.comingSoon.hours },
    { key: 'minutes', label: dict.comingSoon.minutes },
    { key: 'seconds', label: dict.comingSoon.seconds },
  ];

  useEffect(() => {
    setT(calc());
    const id = setInterval(() => setT(calc()), 1000);
    return () => clearInterval(id);
  }, []);

  if (t?.done) {
    return <p className="font-serif text-2xl text-gold sm:text-3xl">{dict.comingSoon.open}</p>;
  }

  return (
    <div className="flex items-start justify-center gap-3 sm:gap-6">
      {UNITS.map(({ key, label }) => (
        <div key={key} className="flex flex-col items-center">
          <div className="min-w-[2.75rem] border border-white-10 bg-dark-800/60 px-2.5 py-3 sm:min-w-[3.75rem] sm:px-4 sm:py-4">
            <span className="font-serif text-2xl tabular-nums text-white sm:text-3xl">
              {t ? String(t[key]).padStart(2, '0') : '--'}
            </span>
          </div>
          <span className="mt-2.5 text-[9px] uppercase tracking-[0.25em] text-gold/70 sm:text-[11px]">
            {label}
          </span>
        </div>
      ))}
    </div>
  );
}
