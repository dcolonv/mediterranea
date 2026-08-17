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
  detectConflicts,
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
