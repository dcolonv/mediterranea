/**
 * Builds the iCalendar document for a booked appointment.
 *
 * Kept free of personal data on purpose: the event carries the treatment, the
 * time and the studio address, nothing about the client. That is what lets the
 * file be served from a plain GET with the details in the query string.
 */
import { CONTACT_INFO } from '@mediterranea/shared/constants';

/** The studio's timezone — every appointment time is local to Málaga. */
export const STUDIO_TZ = 'Europe/Madrid';

export interface CalendarEvent {
  /** Treatment name, already in the client's language. */
  service: string;
  /** YYYY-MM-DD */
  date: string;
  /** HH:MM, local to the studio. */
  time: string;
  durationMinutes: number;
}

/** Escape the characters that carry meaning inside an iCalendar value. */
function esc(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/**
 * Fold lines at 75 octets as RFC 5545 requires. Long treatment names would
 * otherwise produce over-length lines that stricter parsers reject.
 */
function fold(line: string): string {
  if (line.length <= 75) return line;
  const parts = [line.slice(0, 75)];
  let rest = line.slice(75);
  while (rest.length > 74) {
    parts.push(` ${rest.slice(0, 74)}`);
    rest = rest.slice(74);
  }
  if (rest) parts.push(` ${rest}`);
  return parts.join('\r\n');
}

function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m + minutes;
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

/** 2026-09-08 + 11:30 → 20260908T113000 */
function stamp(date: string, time: string): string {
  return `${date.replace(/-/g, '')}T${time.replace(':', '')}00`;
}

/**
 * Europe/Madrid rules, so phones set to another timezone still show the
 * appointment at the hour the client actually booked.
 */
const VTIMEZONE = [
  'BEGIN:VTIMEZONE',
  `TZID:${STUDIO_TZ}`,
  'BEGIN:DAYLIGHT',
  'TZOFFSETFROM:+0100',
  'TZOFFSETTO:+0200',
  'TZNAME:CEST',
  'DTSTART:19700329T020000',
  'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU',
  'END:DAYLIGHT',
  'BEGIN:STANDARD',
  'TZOFFSETFROM:+0200',
  'TZOFFSETTO:+0100',
  'TZNAME:CET',
  'DTSTART:19701025T030000',
  'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU',
  'END:STANDARD',
  'END:VTIMEZONE',
];

export function buildIcs(event: CalendarEvent, now = new Date()): string {
  const end = addMinutes(event.time, event.durationMinutes);
  const location = `${CONTACT_INFO.address}, ${CONTACT_INFO.city}`;

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Mediterranea Face Studio//Booking//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    ...VTIMEZONE,
    'BEGIN:VEVENT',
    `UID:${event.date}-${event.time.replace(':', '')}@mediterraneafacestudio.com`,
    // DTSTAMP is mandatory; some clients drop events without it.
    `DTSTAMP:${now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')}`,
    `DTSTART;TZID=${STUDIO_TZ}:${stamp(event.date, event.time)}`,
    `DTEND;TZID=${STUDIO_TZ}:${stamp(event.date, end)}`,
    fold(`SUMMARY:${esc(`${event.service} — Mediterránea Face Studio`)}`),
    fold(`LOCATION:${esc(location)}`),
    fold(`DESCRIPTION:${esc(`${event.service}\nMediterránea Face Studio\n${CONTACT_INFO.phone}`)}`),
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR',
  ];

  return lines.join('\r\n');
}

/**
 * Google Calendar's "create event" link. Android routes calendar.google.com
 * through the installed Calendar app, so this opens the app with the event
 * already filled in rather than downloading a file.
 */
export function googleCalendarUrl(event: CalendarEvent): string {
  const end = addMinutes(event.time, event.durationMinutes);
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `${event.service} — Mediterránea Face Studio`,
    dates: `${stamp(event.date, event.time)}/${stamp(event.date, end)}`,
    ctz: STUDIO_TZ,
    location: `${CONTACT_INFO.address}, ${CONTACT_INFO.city}`,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
