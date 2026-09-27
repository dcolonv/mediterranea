import type { Appointment } from '@mediterranea/shared/types';

/**
 * When a client may still change their own appointment.
 *
 * Shared deliberately: the same rule now has two callers — the signed-in
 * account area and the signed-link flow from the confirmation email. Copying it
 * into both is how they quietly drift apart.
 */

/** Current date + minutes-since-midnight in Europe/Madrid, where the studio is. */
export function malagaNow(): { date: string; minutes: number } {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Madrid',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '00';
  return {
    date: `${get('year')}-${get('month')}-${get('day')}`,
    minutes: (Number(get('hour')) % 24) * 60 + Number(get('minute')),
  };
}

export function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + (m || 0);
}

/** Minutes from now (Málaga) until an appointment starts. Negative if past. */
export function minutesUntil(date: string, time: string): number {
  const now = malagaNow();
  const days = Math.round((Date.parse(date) - Date.parse(now.date)) / 86_400_000);
  return days * 1440 + timeToMinutes(time) - now.minutes;
}

/** Statuses a client can still act on. */
export function isLive(status: Appointment['status']): boolean {
  return status === 'pending' || status === 'confirmed';
}

/**
 * Why this appointment can't be changed, or null when it can. Locale-aware so
 * the signed-link page can answer in the language the client booked in.
 */
export function modifiableError(
  appt: Pick<Appointment, 'status' | 'appointmentDate' | 'appointmentTime'>,
  cutoffHours: number,
  locale: 'en' | 'es' = 'en'
): string | null {
  const es = locale === 'es';

  if (!isLive(appt.status)) {
    return es
      ? 'Esta cita ya no se puede modificar.'
      : 'This appointment can no longer be changed.';
  }

  if (minutesUntil(appt.appointmentDate, appt.appointmentTime) < cutoffHours * 60) {
    return es
      ? `Los cambios deben hacerse con al menos ${cutoffHours} horas de antelación. Llámanos, por favor.`
      : `Changes must be made at least ${cutoffHours} hours in advance. Please call us.`;
  }

  return null;
}
