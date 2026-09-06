import { describe, it, expect } from 'vitest';
import { buildIcs, googleCalendarUrl } from './ics';

const EVENT = {
  service: 'INDIBA Full Facial',
  date: '2026-09-10',
  time: '11:30',
  durationMinutes: 75,
};

describe('buildIcs', () => {
  const ics = buildIcs(EVENT, new Date('2026-09-05T10:00:00Z'));

  it('produces a well-formed single-event calendar', () => {
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
    expect(ics.trimEnd().endsWith('END:VCALENDAR')).toBe(true);
    expect(ics.split('\r\n').filter((l) => l === 'BEGIN:VEVENT')).toHaveLength(1);
    // DTSTAMP is mandatory — some clients silently drop events without it.
    expect(ics).toContain('DTSTAMP:20260905T100000Z');
  });

  it('anchors the times to the studio timezone', () => {
    expect(ics).toContain('DTSTART;TZID=Europe/Madrid:20260910T113000');
    expect(ics).toContain('DTEND;TZID=Europe/Madrid:20260910T124500');
    expect(ics).toContain('TZID:Europe/Madrid');
  });

  it('rolls the end time over the hour correctly', () => {
    const ics = buildIcs({ ...EVENT, time: '17:30', durationMinutes: 120 });
    expect(ics).toContain('DTEND;TZID=Europe/Madrid:20260910T193000');
  });

  it('escapes commas in the location', () => {
    expect(ics).toContain('LOCATION:Avenida Juan Sebastian Elcano\\, 143');
  });

  it('keeps a newline in the treatment name from forging new properties', () => {
    const ics = buildIcs({ ...EVENT, service: 'Evil\nSUMMARY:injected' });
    const starts = ics.split('\r\n').filter((l) => l.startsWith('SUMMARY'));
    expect(starts).toHaveLength(1);
    expect(ics).toContain('SUMMARY:Evil\\nSUMMARY:injected');
  });

  it('folds lines longer than 75 octets', () => {
    const ics = buildIcs({ ...EVENT, service: 'A'.repeat(200) });
    const tooLong = ics.split('\r\n').filter((l) => l.length > 75);
    expect(tooLong).toEqual([]);
  });
});

describe('googleCalendarUrl', () => {
  it('builds a prefilled create-event link in the studio timezone', () => {
    const url = new URL(googleCalendarUrl(EVENT));
    expect(url.origin + url.pathname).toBe('https://calendar.google.com/calendar/render');
    expect(url.searchParams.get('action')).toBe('TEMPLATE');
    expect(url.searchParams.get('dates')).toBe('20260910T113000/20260910T124500');
    expect(url.searchParams.get('ctz')).toBe('Europe/Madrid');
    expect(url.searchParams.get('text')).toBe('INDIBA Full Facial — Mediterránea Face Studio');
  });
});
