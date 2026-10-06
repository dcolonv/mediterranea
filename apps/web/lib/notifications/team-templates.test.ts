import { describe, it, expect } from 'vitest';
import { describeChanges, teamEmail } from './team-templates';
import type { Appointment } from '@mediterranea/shared/types';

const appt = {
  id: 'a1',
  serviceId: 'hydration',
  serviceName: 'Hydration',
  clientName: 'Ana García',
  clientEmail: 'ana@example.com',
  clientPhone: '',
  staffId: 's1',
  roomId: 'r1',
  appointmentDate: '2026-10-07',
  appointmentTime: '18:30',
  durationMinutes: 60,
  notes: '',
  status: 'confirmed',
} as Appointment;

const names = { staff: { s1: 'Mariana', s2: 'Lucía' }, rooms: { r1: 'Studio Facial' } };
const ctx = { names, by: 'the client, booking online', calendarUrl: 'https://example.com/backoffice/calendar' };

describe('describeChanges', () => {
  it('lists only the fields that changed, readably', () => {
    const after = { ...appt, appointmentTime: '17:00', staffId: 's2' };
    expect(describeChanges(appt, after, names)).toEqual([
      { field: 'When', from: 'Wed 7 Oct 18:30', to: 'Wed 7 Oct 17:00' },
      { field: 'Practitioner', from: 'Mariana', to: 'Lucía' },
    ]);
  });
});

describe('teamEmail', () => {
  it('announces a new appointment with its details', () => {
    const msg = teamEmail({ kind: 'created', appt }, ctx)!;
    expect(msg.subject).toBe('New appointment: Ana García · Hydration, Wed 7 Oct 18:30');
    expect(msg.text).toContain('By the client, booking online');
    expect(msg.text).toContain('Practitioner: Mariana');
    expect(msg.text).toContain('Email: ana@example.com');
    expect(msg.text).not.toContain('Phone:'); // empty contact fields are left out
  });

  it('shows what changed on an update', () => {
    const msg = teamEmail(
      { kind: 'updated', before: appt, after: { ...appt, serviceName: 'Peeling' } },
      { ...ctx, by: 'd@example.com' }
    )!;
    expect(msg.subject).toBe('Appointment changed: Ana García · Peeling, Wed 7 Oct 18:30');
    expect(msg.text).toContain('Treatment: Hydration → Peeling');
  });

  it('calls out a cancellation in the headline', () => {
    const msg = teamEmail(
      { kind: 'updated', before: appt, after: { ...appt, status: 'cancelled' } },
      { ...ctx, by: 'the client' }
    )!;
    expect(msg.subject.startsWith('Appointment cancelled:')).toBe(true);
    expect(msg.text).toContain('Status: Confirmed → Cancelled');
  });

  it('sends nothing when an update changed nothing visible', () => {
    expect(teamEmail({ kind: 'updated', before: appt, after: { ...appt } }, ctx)).toBeNull();
  });

  it('announces a deletion', () => {
    const msg = teamEmail({ kind: 'deleted', appt }, { ...ctx, by: 'd@example.com' })!;
    expect(msg.subject).toBe('Appointment deleted: Ana García · Hydration, Wed 7 Oct 18:30');
  });

  it('escapes client-typed text in the HTML', () => {
    const msg = teamEmail({ kind: 'created', appt: { ...appt, clientName: '<b>Ana</b>' } }, ctx)!;
    expect(msg.html).not.toContain('<b>Ana</b>');
    expect(msg.html).toContain('&lt;b&gt;Ana&lt;/b&gt;');
  });
});
