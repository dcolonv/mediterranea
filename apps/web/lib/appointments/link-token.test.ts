import { describe, it, expect, beforeAll } from 'vitest';
import {
  createAppointmentToken,
  readAppointmentToken,
  linkExpiryFor,
  appointmentManageUrl,
} from './link-token';

const SECRET = 'test-secret-that-is-long-enough-to-pass-0123456789';
const HOUR = 3600;
const future = () => Math.floor(Date.now() / 1000) + HOUR;

beforeAll(() => {
  process.env.APPOINTMENT_LINK_SECRET = SECRET;
});

describe('createAppointmentToken / readAppointmentToken', () => {
  it('round-trips an appointment id', () => {
    const token = createAppointmentToken({ appointmentId: 'appt-123', expiresAt: future() });
    expect(readAppointmentToken(token)).toBe('appt-123');
  });

  it('rejects a token signed with a different secret', () => {
    const token = createAppointmentToken({ appointmentId: 'appt-123', expiresAt: future() });
    process.env.APPOINTMENT_LINK_SECRET = 'a-completely-different-secret-0123456789012';
    expect(readAppointmentToken(token)).toBeNull();
    process.env.APPOINTMENT_LINK_SECRET = SECRET;
  });

  it('rejects a tampered appointment id', () => {
    const token = createAppointmentToken({ appointmentId: 'appt-123', expiresAt: future() });
    const [, exp, sig] = token.split('.');
    const forged = `${Buffer.from('appt-999').toString('base64url')}.${exp}.${sig}`;
    expect(readAppointmentToken(forged)).toBeNull();
  });

  it('rejects an extended expiry', () => {
    const token = createAppointmentToken({ appointmentId: 'appt-123', expiresAt: future() });
    const [id, , sig] = token.split('.');
    expect(readAppointmentToken(`${id}.${future() + 86400}.${sig}`)).toBeNull();
  });

  it('rejects an expired token', () => {
    const token = createAppointmentToken({
      appointmentId: 'appt-123',
      expiresAt: Math.floor(Date.now() / 1000) - 1,
    });
    expect(readAppointmentToken(token)).toBeNull();
  });

  it('returns null for malformed input rather than throwing', () => {
    for (const bad of ['', 'nonsense', 'a.b', 'a.b.c.d', undefined, null]) {
      expect(readAppointmentToken(bad as string)).toBeNull();
    }
  });

  it('rejects rather than throws when the secret is unset', () => {
    // /manage/enter is public: a misconfigured deploy must not 500 on it.
    const token = createAppointmentToken({ appointmentId: 'appt-123', expiresAt: future() });
    process.env.APPOINTMENT_LINK_SECRET = '';
    expect(() => readAppointmentToken(token)).not.toThrow();
    expect(readAppointmentToken(token)).toBeNull();
    process.env.APPOINTMENT_LINK_SECRET = SECRET;
  });

  it('refuses to sign with a missing or weak secret', () => {
    process.env.APPOINTMENT_LINK_SECRET = '';
    expect(() => createAppointmentToken({ appointmentId: 'x', expiresAt: future() })).toThrow();
    process.env.APPOINTMENT_LINK_SECRET = 'too-short';
    expect(() => createAppointmentToken({ appointmentId: 'x', expiresAt: future() })).toThrow();
    process.env.APPOINTMENT_LINK_SECRET = SECRET;
  });
});

describe('linkExpiryFor', () => {
  it('keeps the link alive past the appointment, then lets it lapse', () => {
    const exp = linkExpiryFor('2099-06-01', '11:30') * 1000;
    expect(exp).toBeGreaterThan(Date.parse('2099-06-01T11:30:00Z'));
    expect(exp).toBeLessThan(Date.parse('2099-06-02T00:00:00Z'));
  });

  it('falls back to a bounded window for an unparseable date', () => {
    const exp = linkExpiryFor('not-a-date', '11:30') * 1000;
    expect(exp).toBeGreaterThan(Date.now());
  });
});

describe('appointmentManageUrl', () => {
  it('points at the entry handler and tolerates a trailing slash', () => {
    const url = appointmentManageUrl('tok en/+', 'https://example.com/');
    expect(url.startsWith('https://example.com/manage/enter?t=')).toBe(true);
    // The token must survive the round trip through the query string.
    expect(new URL(url).searchParams.get('t')).toBe('tok en/+');
  });
});
