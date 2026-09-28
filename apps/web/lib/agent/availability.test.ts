import { describe, it, expect } from 'vitest';
import {
  timeToMinutes,
  minutesToTime,
  rangesOverlap,
  weekdayOf,
  addDaysStr,
  staffOffAt,
  computeSlots,
  computeFixedSlots,
  gridTimes,
  detectConflicts,
  expandTimeOff,
  type AvailStaff,
} from './availability';
import type { DayHours } from '@mediterranea/shared/types';

const HOURS: DayHours = { open: '09:00', close: '18:00' };

describe('time helpers', () => {
  it('converts time ↔ minutes', () => {
    expect(timeToMinutes('09:00')).toBe(540);
    expect(timeToMinutes('13:30')).toBe(810);
    expect(minutesToTime(540)).toBe('09:00');
    expect(minutesToTime(810)).toBe('13:30');
    expect(minutesToTime(600)).toBe('10:00');
  });

  it('resolves the weekday of a date', () => {
    expect(weekdayOf('2026-09-08')).toBe('tuesday'); // opening day
    expect(weekdayOf('2026-09-13')).toBe('sunday');
  });

  it('adds days across month boundaries', () => {
    expect(addDaysStr('2026-08-31', 1)).toBe('2026-09-01');
    expect(addDaysStr('2026-09-08', 60)).toBe('2026-11-07');
  });
});

describe('rangesOverlap', () => {
  it('detects overlap and adjacency correctly', () => {
    expect(rangesOverlap(540, 600, 570, 630)).toBe(true); // partial
    expect(rangesOverlap(540, 600, 600, 660)).toBe(false); // touching, not overlapping
    expect(rangesOverlap(540, 600, 500, 540)).toBe(false); // touching before
    expect(rangesOverlap(540, 660, 570, 600)).toBe(true); // contained
  });
});

describe('staffOffAt', () => {
  const staff: AvailStaff = {
    id: 's1',
    timeOff: [
      { date: '2026-09-10' }, // whole day
      { date: '2026-09-11', start: '13:00', end: '14:00' }, // lunch
    ],
  };
  it('blocks a whole-day time off', () => {
    expect(staffOffAt(staff, '2026-09-10', 540, 600)).toBe(true);
  });
  it('blocks only the overlapping window on a partial day', () => {
    expect(staffOffAt(staff, '2026-09-11', 780, 840)).toBe(true); // 13:00-14:00
    expect(staffOffAt(staff, '2026-09-11', 600, 660)).toBe(false); // 10:00-11:00
  });
  it('ignores other days', () => {
    expect(staffOffAt(staff, '2026-09-12', 540, 600)).toBe(false);
  });
  it('blocks every day in a multi-day range', () => {
    const onHoliday: AvailStaff = {
      id: 's1',
      timeOff: [{ date: '2026-09-14', endDate: '2026-09-18' }], // a week off
    };
    expect(staffOffAt(onHoliday, '2026-09-14', 540, 600)).toBe(true); // first day
    expect(staffOffAt(onHoliday, '2026-09-16', 540, 600)).toBe(true); // mid-range
    expect(staffOffAt(onHoliday, '2026-09-18', 540, 600)).toBe(true); // last day (inclusive)
    expect(staffOffAt(onHoliday, '2026-09-19', 540, 600)).toBe(false); // day after
    expect(staffOffAt(onHoliday, '2026-09-13', 540, 600)).toBe(false); // day before
  });
});

describe('computeSlots', () => {
  const staff: AvailStaff[] = [{ id: 's1', workingHours: { tuesday: HOURS } }];
  const base = {
    date: '2026-09-08',
    weekday: 'tuesday' as const,
    duration: 60,
    businessHours: HOURS,
    intervalMinutes: 30,
    bufferMinutes: 0,
    earliestMinutes: 0,
    staff,
    rooms: [{ id: 'r1' }],
    dayAppointments: [],
  };

  it('returns an empty list when the studio is closed', () => {
    expect(computeSlots({ ...base, businessHours: null })).toEqual([]);
  });

  it('generates slots on the grid that fit before closing', () => {
    const slots = computeSlots(base);
    expect(slots[0].time).toBe('09:00');
    // last 60-min slot must start no later than 17:00 (ends 18:00)
    expect(slots[slots.length - 1].time).toBe('17:00');
    // 09:00..17:00 at 30-min steps = 17 slots
    expect(slots).toHaveLength(17);
  });

  it('respects the lead-time cutoff (earliestMinutes)', () => {
    const slots = computeSlots({ ...base, earliestMinutes: 660 }); // 11:00
    expect(slots[0].time).toBe('11:00');
  });

  it('excludes a slot when the only room is busy', () => {
    const slots = computeSlots({
      ...base,
      dayAppointments: [{ roomId: 'r1', appointmentTime: '09:00', durationMinutes: 60 }],
    });
    expect(slots.find((s) => s.time === '09:00')).toBeUndefined();
    expect(slots.find((s) => s.time === '09:30')).toBeUndefined(); // still overlaps 09:00-10:00
    expect(slots.find((s) => s.time === '10:00')).toBeDefined();
  });

  it('excludes a slot when the only qualified staff is busy', () => {
    const slots = computeSlots({
      ...base,
      dayAppointments: [{ staffId: 's1', appointmentTime: '14:00', durationMinutes: 60 }],
    });
    expect(slots.find((s) => s.time === '14:00')).toBeUndefined();
    expect(slots.find((s) => s.time === '13:00')).toBeDefined();
  });

  it('honors staff working hours narrower than studio hours', () => {
    const slots = computeSlots({
      ...base,
      staff: [{ id: 's1', workingHours: { tuesday: { open: '10:00', close: '12:00' } } }],
    });
    // 60-min service on a 30-min grid within 10:00-12:00 → starts 10:00, 10:30, 11:00.
    expect(slots.map((s) => s.time)).toEqual(['10:00', '10:30', '11:00']);
  });

  it('returns no slots when a staff member is on time off', () => {
    const slots = computeSlots({
      ...base,
      staff: [{ id: 's1', workingHours: { tuesday: HOURS }, timeOff: [{ date: '2026-09-08' }] }],
    });
    expect(slots).toEqual([]);
  });

  it('enforces a cool-down buffer around an appointment', () => {
    // A 60-min appt at 11:00 (ends 12:00) with a 30-min buffer.
    const slots = computeSlots({
      ...base,
      bufferMinutes: 30,
      dayAppointments: [{ staffId: 's1', appointmentTime: '11:00', durationMinutes: 60 }],
    });
    const times = slots.map((s) => s.time);
    // After: appt ends 12:00, buffer clears at 12:30.
    expect(times).not.toContain('11:30'); // overlaps the appt
    expect(times).not.toContain('12:00'); // within the 30-min buffer
    expect(times).toContain('12:30'); // buffer cleared → bookable
    // Before: a 60-min slot must end ≥30 min before 11:00, i.e. start ≤09:30.
    expect(times).not.toContain('10:30'); // ends 11:30, overlaps
    expect(times).not.toContain('10:00'); // ends 11:00, no gap before the appt
    expect(times).toContain('09:30'); // ends 10:30, exactly a 30-min gap → ok
  });
});

describe('computeFixedSlots', () => {
  const staff: AvailStaff[] = [{ id: 's1', workingHours: { tuesday: HOURS } }];
  const base = {
    candidateTimes: ['10:00', '12:00', '14:00', '16:00', '18:00'], // custom
    duration: 120,
    bufferMinutes: 0,
    earliestMinutes: 0,
    date: '2026-09-08',
    staff,
    rooms: [{ id: 'r1' }],
    dayAppointments: [],
  };

  it('returns every candidate, all available when nothing is booked', () => {
    const slots = computeFixedSlots(base);
    expect(slots.map((s) => s.time)).toEqual(['10:00', '12:00', '14:00', '16:00', '18:00']);
    expect(slots.every((s) => s.available)).toBe(true);
  });

  it('allows a slot that runs past the studio close time (18:00 → 20:00)', () => {
    const slots = computeFixedSlots(base);
    expect(slots.find((s) => s.time === '18:00')?.available).toBe(true);
  });

  it('blocks candidates that overlap an existing booking', () => {
    // A focus booking 11:00–11:45 overlaps the custom 10:00–12:00 slot.
    const slots = computeFixedSlots({
      ...base,
      dayAppointments: [{ staffId: 's1', roomId: 'r1', appointmentTime: '11:00', durationMinutes: 45 }],
    });
    const byTime = Object.fromEntries(slots.map((s) => [s.time, s.available]));
    expect(byTime['10:00']).toBe(false); // 10:00–12:00 overlaps 11:00–11:45
    expect(byTime['12:00']).toBe(true); // 12:00–14:00 is clear
  });

  it('marks past candidates unavailable via earliestMinutes', () => {
    const slots = computeFixedSlots({ ...base, earliestMinutes: 13 * 60 });
    const byTime = Object.fromEntries(slots.map((s) => [s.time, s.available]));
    expect(byTime['10:00']).toBe(false);
    expect(byTime['12:00']).toBe(false);
    expect(byTime['14:00']).toBe(true);
  });

  it('drops the slot when the practitioner is on time off', () => {
    const slots = computeFixedSlots({
      ...base,
      staff: [{ id: 's1', workingHours: { tuesday: HOURS }, timeOff: [{ date: '2026-09-08' }] }],
    });
    expect(slots.every((s) => !s.available)).toBe(true);
  });

  it('honors staff working hours when respectStaffHours is set', () => {
    const slots = computeFixedSlots({
      ...base,
      weekday: 'tuesday',
      respectStaffHours: true,
      staff: [{ id: 's1', workingHours: { tuesday: { open: '12:00', close: '16:00' } } }],
    });
    const byTime = Object.fromEntries(slots.map((s) => [s.time, s.available]));
    expect(byTime['10:00']).toBe(false); // before the practitioner starts
    expect(byTime['12:00']).toBe(true); // 12:00–14:00 fits
    expect(byTime['16:00']).toBe(false); // would run past 16:00
  });

  it('lets a practitioner who works until closing cover the after-hours window', () => {
    const slots = computeFixedSlots({
      ...base,
      candidateTimes: ['17:00', '18:00'],
      weekday: 'tuesday',
      respectStaffHours: true,
      afterHours: { close: timeToMinutes('18:00'), minutes: 120 },
    });
    const byTime = Object.fromEntries(slots.map((s) => [s.time, s.available]));
    expect(byTime['17:00']).toBe(true); // 17:00–19:00
    expect(byTime['18:00']).toBe(true); // 18:00–20:00, the full allowance
  });

  it('does not stretch a shift that ends before closing', () => {
    const slots = computeFixedSlots({
      ...base,
      candidateTimes: ['14:00', '16:00'],
      weekday: 'tuesday',
      respectStaffHours: true,
      afterHours: { close: timeToMinutes('18:00'), minutes: 120 },
      staff: [{ id: 's1', workingHours: { tuesday: { open: '12:00', close: '16:00' } } }],
    });
    const byTime = Object.fromEntries(slots.map((s) => [s.time, s.available]));
    expect(byTime['14:00']).toBe(true); // 14:00–16:00 fits the shift
    expect(byTime['16:00']).toBe(false); // the shift ends at 16:00
  });
});

describe('gridTimes', () => {
  it('steps on the interval and stops so the block fits before closing', () => {
    // 10:30–18:30, 120-min block on a 30-min grid → last start 16:30.
    const times = gridTimes({ open: '10:30', close: '18:30' }, 120, 30);
    expect(times[0]).toBe('10:30');
    expect(times[1]).toBe('11:00');
    expect(times[times.length - 1]).toBe('16:30');
  });

  it('gives a later last start for a shorter block', () => {
    const times = gridTimes({ open: '10:30', close: '18:30' }, 60, 30);
    expect(times[times.length - 1]).toBe('17:30');
  });

  it('lets every block start at closing when the after-hours window covers it', () => {
    // 10:30–18:30 with 120 min after hours → 60/90/120-min blocks all start by 18:30.
    for (const block of [60, 90, 120]) {
      const times = gridTimes({ open: '10:30', close: '18:30' }, block, 30, 120);
      expect(times[times.length - 1]).toBe('18:30');
    }
  });

  it('never starts after closing, and ends within the after-hours window', () => {
    // 90 min after hours → a 120-min block must end by 20:00, so last start 18:00;
    // a 60-min block could end by 20:00 but still can't start after 18:30.
    expect(gridTimes({ open: '10:30', close: '18:30' }, 120, 30, 90).at(-1)).toBe('18:00');
    expect(gridTimes({ open: '10:30', close: '18:30' }, 60, 30, 90).at(-1)).toBe('18:30');
  });
});

describe('detectConflicts', () => {
  const existing = [
    { id: 'a1', staffId: 's1', roomId: 'r1', appointmentTime: '10:00', durationMinutes: 60 },
  ];

  it('flags a staff clash on overlap', () => {
    expect(
      detectConflicts(existing, { start: 630, end: 690, staffId: 's1', roomId: 'r2' })
    ).toEqual({ staffClash: true, roomClash: false });
  });

  it('flags a room clash on overlap', () => {
    expect(
      detectConflicts(existing, { start: 630, end: 690, staffId: 's2', roomId: 'r1' })
    ).toEqual({ staffClash: false, roomClash: true });
  });

  it('reports no clash when times do not overlap', () => {
    expect(
      detectConflicts(existing, { start: 660, end: 720, staffId: 's1', roomId: 'r1' })
    ).toEqual({ staffClash: false, roomClash: false }); // 11:00-12:00, appt ends 11:00
  });

  it('ignores the appointment being updated (ignoreId)', () => {
    expect(
      detectConflicts(existing, { start: 600, end: 660, staffId: 's1', roomId: 'r1', ignoreId: 'a1' })
    ).toEqual({ staffClash: false, roomClash: false });
  });

  it('flags a clash inside the cool-down buffer', () => {
    // existing appt 10:00-11:00; a new 11:00-12:00 booking sits in the 30-min
    // buffer, so it clashes when a buffer is applied but not without one.
    const target = { start: 660, end: 720, staffId: 's1', roomId: 'r1' };
    expect(detectConflicts(existing, target)).toEqual({ staffClash: false, roomClash: false });
    expect(detectConflicts(existing, { ...target, bufferMinutes: 30 })).toEqual({
      staffClash: true,
      roomClash: true,
    });
  });
});

describe('expandTimeOff', () => {
  const weekdaysOnly = (d: string) => !['saturday', 'sunday'].includes(weekdayOf(d));

  it('lists a partial day with its times and reason', () => {
    const blocks = expandTimeOff(
      [{ id: 's1', timeOff: [{ date: '2026-09-08', start: '13:00', end: '14:00', reason: 'Dentist' }] }],
      '2026-09-01',
      '2026-09-30',
      weekdaysOnly
    );
    expect(blocks).toEqual([
      { id: 's1:0:2026-09-08', date: '2026-09-08', start: '13:00', end: '14:00', staffId: 's1', reason: 'Dentist' },
    ]);
  });

  it('spreads a multi-day range over open days inside the window', () => {
    // Fri 11 → Tue 15 September, window starts on the 12th: Sat/Sun are closed.
    const blocks = expandTimeOff(
      [{ id: 's1', timeOff: [{ date: '2026-09-11', endDate: '2026-09-15', reason: 'Holiday' }] }],
      '2026-09-12',
      null,
      weekdaysOnly
    );
    expect(blocks.map((b) => b.date)).toEqual(['2026-09-14', '2026-09-15']);
    expect(blocks.every((b) => b.start === undefined && b.reason === 'Holiday')).toBe(true);
  });

  it('stops at the end of the window', () => {
    const blocks = expandTimeOff(
      [{ id: 's1', timeOff: [{ date: '2026-09-14', endDate: '2026-09-18' }] }],
      '2026-09-01',
      '2026-09-15',
      weekdaysOnly
    );
    expect(blocks.map((b) => b.date)).toEqual(['2026-09-14', '2026-09-15']);
  });

  it('sorts by date, whole days before timed blocks', () => {
    const blocks = expandTimeOff(
      [
        { id: 's1', timeOff: [{ date: '2026-09-09', start: '10:00', end: '11:00' }] },
        { id: 's2', timeOff: [{ date: '2026-09-09' }, { date: '2026-09-08', start: '16:00', end: '17:00' }] },
      ],
      '2026-09-01',
      null,
      weekdaysOnly
    );
    expect(blocks.map((b) => `${b.date} ${b.start ?? 'all day'}`)).toEqual([
      '2026-09-08 16:00',
      '2026-09-09 all day',
      '2026-09-09 10:00',
    ]);
  });
});
