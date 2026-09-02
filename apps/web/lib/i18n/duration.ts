import type { Locale } from './config';

/**
 * Human duration for public copy: "45 minutes", "1 hour", "1.5 hours".
 * Fuller than `formatDuration` ("45 min", "1h"), which suits compact admin UI.
 */
export function durationLabel(minutes: number, locale: Locale): string {
  const es = locale === 'es';
  if (minutes < 60) return es ? `${minutes} minutos` : `${minutes} minutes`;

  const hours = minutes / 60;
  // Show halves as "1.5 hours"; anything else keeps the minutes remainder.
  if (Number.isInteger(hours) || minutes % 30 === 0) {
    const value = Number.isInteger(hours) ? String(hours) : hours.toFixed(1);
    const one = value === '1';
    if (es) return one ? '1 hora' : `${value} horas`;
    return one ? '1 hour' : `${value} hours`;
  }

  const h = Math.floor(hours);
  const rest = minutes % 60;
  return es ? `${h} h ${rest} min` : `${h} h ${rest} min`;
}
