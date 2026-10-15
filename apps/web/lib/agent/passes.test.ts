import { describe, it, expect } from 'vitest';
import { passUsage, sessionNumber, sessionPrice, type PassAppt } from './passes';

const appt = (id: string, status: PassAppt['status'], date: string, time = '10:30'): PassAppt => ({
  id,
  status,
  appointmentDate: date,
  appointmentTime: time,
});

describe('passUsage', () => {
  it('counts completed and no-show as used, upcoming as booked', () => {
    const appts = [
      appt('a', 'completed', '2026-10-01'),
      appt('b', 'no-show', '2026-10-08'),
      appt('c', 'confirmed', '2026-10-15'),
    ];
    expect(passUsage(5, appts)).toEqual({ sessions: 5, used: 2, booked: 1, remaining: 2 });
  });

  it('gives a cancelled or rejected session back', () => {
    const appts = [appt('a', 'completed', '2026-10-01'), appt('b', 'cancelled', '2026-10-08'), appt('c', 'rejected', '2026-10-09')];
    expect(passUsage(5, appts).remaining).toBe(4);
  });

  it('never goes below zero', () => {
    const appts = Array.from({ length: 6 }, (_, i) => appt(String(i), 'completed', `2026-10-0${i + 1}`));
    expect(passUsage(5, appts).remaining).toBe(0);
  });
});

describe('sessionNumber', () => {
  const appts = [
    appt('late', 'confirmed', '2026-10-20'),
    appt('first', 'completed', '2026-10-01'),
    appt('dropped', 'cancelled', '2026-10-05'),
    appt('second', 'confirmed', '2026-10-10', '18:30'),
  ];

  it('numbers sessions in date order, skipping cancelled ones', () => {
    expect(sessionNumber(appts, 'first')).toBe(1);
    expect(sessionNumber(appts, 'second')).toBe(2);
    expect(sessionNumber(appts, 'late')).toBe(3);
  });

  it('returns null for a session that no longer counts', () => {
    expect(sessionNumber(appts, 'dropped')).toBeNull();
  });
});

describe('sessionPrice', () => {
  it('splits the pass price evenly, to the cent', () => {
    expect(sessionPrice(250, 5)).toBe(50);
    expect(sessionPrice(100, 3)).toBe(33.33);
  });
});
