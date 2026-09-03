'use client';

import { useEffect, useState } from 'react';
import { useLang } from '@/components/i18n/language-provider';

// Opening day: 8 September 2026, 09:00 Málaga time (CEST, UTC+2).
const TARGET_MS = new Date('2026-09-08T09:00:00+02:00').getTime();

function remaining() {
  const diff = Math.max(0, TARGET_MS - Date.now());
  return {
    days: Math.floor(diff / 86_400_000),
    hours: Math.floor((diff % 86_400_000) / 3_600_000),
    minutes: Math.floor((diff % 3_600_000) / 60_000),
    seconds: Math.floor((diff % 60_000) / 1_000),
    done: diff === 0,
  };
}

/**
 * Slim opening-day countdown strip shown above the hero. Sits below the fixed
 * header (hence the top offset) and disappears once the studio is open.
 */
export function CountdownBanner() {
  const { dict } = useLang();
  const c = dict.comingSoon;
  // Null on first render so server and client markup match (no hydration flash).
  const [t, setT] = useState<ReturnType<typeof remaining> | null>(null);

  useEffect(() => {
    setT(remaining());
    const id = setInterval(() => setT(remaining()), 1000);
    return () => clearInterval(id);
  }, []);

  // Once the studio is open the strip goes away, but the spacer stays so the
  // fixed header keeps clearing the hero below.
  if (t?.done) return <div className="h-24" aria-hidden />;

  const units: { value: number | null; label: string }[] = [
    { value: t?.days ?? null, label: c.days },
    { value: t?.hours ?? null, label: c.hours },
    { value: t?.minutes ?? null, label: c.minutes },
    { value: t?.seconds ?? null, label: c.seconds },
  ];

  return (
    <div className="relative z-30 border-b border-white-10 bg-dark-800 pt-24">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-center gap-2 px-4 py-3 sm:flex-row sm:gap-8 sm:px-6 sm:py-4 lg:px-8">
        <p className="text-center text-[10px] uppercase tracking-[0.2em] text-gold sm:text-left sm:text-xs sm:tracking-[0.25em]">
          {c.eyebrow} · {c.date}
        </p>

        {/* Wraps rather than overflowing on narrow phones. */}
        <div className="flex flex-wrap items-baseline justify-center gap-x-3 gap-y-1 sm:gap-x-6">
          {units.map(({ value, label }) => (
            <div key={label} className="flex items-baseline gap-1">
              <span className="font-serif text-base tabular-nums text-white sm:text-xl">
                {value === null ? '--' : String(value).padStart(2, '0')}
              </span>
              <span className="text-[9px] uppercase tracking-wider text-white-30 sm:text-[10px]">
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
