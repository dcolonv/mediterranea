/** Small display formatters for the admin app. */

/** 'YYYY-MM-DD' → 'Mon, Jul 21, 2026' (parsed as local, no TZ shift). */
export function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!y || !m || !d) return dateStr;
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/** 'YYYY-MM-DD' → 'Jul 21' short form. */
export function formatDateShort(dateStr: string): string {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!y || !m || !d) return dateStr;
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

/** '14:30' → '2:30 PM'. */
export function formatTime(timeStr: string): string {
  if (!timeStr) return '';
  const [h, min] = timeStr.split(':').map(Number);
  if (Number.isNaN(h)) return timeStr;
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return `${hour12}:${String(min ?? 0).padStart(2, '0')} ${period}`;
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** Local device date as 'YYYY-MM-DD'. */
export function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Shift an ISO date by a number of days. */
export function shiftISO(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d + days);
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
}

/** Monday of the week containing the given ISO date. */
export function weekStartISO(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  const offset = (dt.getDay() + 6) % 7; // days since Monday
  return shiftISO(iso, -offset);
}

/** 'YYYY-MM-DD' → 'Mon'. */
export function weekdayShort(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: 'short' });
}

/** 'YYYY-MM-DD' → day-of-month number as a string. */
export function dayOfMonth(iso: string): string {
  return String(Number(iso.split('-')[2]));
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
