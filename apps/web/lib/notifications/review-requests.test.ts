import { describe, it, expect } from 'vitest';
import { reviewRequestMode, testCopy } from './review-requests';
import { reviewRequest } from './templates';
import type { Appointment } from '@mediterranea/shared/types';

const URL = 'https://g.page/r/example/review';

const appt = {
  id: 'a1',
  serviceName: 'Peeling',
  clientName: 'Ana García',
  clientEmail: 'ana@example.com',
  clientPhone: '+34600000000',
  appointmentDate: '2026-10-21',
  appointmentTime: '11:00',
  status: 'completed',
} as Appointment;

const ctx = { clientName: 'Ana García', serviceName: 'Peeling', date: '2026-10-21', time: '11:00' };

describe('reviewRequestMode', () => {
  it('is off unless switched on', () => {
    expect(reviewRequestMode({})).toBe('off');
    expect(reviewRequestMode({ REVIEW_REQUESTS: '' })).toBe('off');
    expect(reviewRequestMode({ REVIEW_REQUESTS: 'yes' })).toBe('off');
  });

  it('reads test and on, however they are written', () => {
    expect(reviewRequestMode({ REVIEW_REQUESTS: 'test' })).toBe('test');
    expect(reviewRequestMode({ REVIEW_REQUESTS: ' ON ' })).toBe('on');
  });
});

describe('reviewRequest', () => {
  it('links the review page in every part, in the client’s language', () => {
    const es = reviewRequest({ ...ctx, locale: 'es' }, URL);
    expect(es.subject).toContain('visita');
    for (const part of [es.html, es.text, es.sms]) expect(part).toContain(URL);

    const en = reviewRequest({ ...ctx, locale: 'en' }, URL);
    expect(en.subject).toContain('visit');
    for (const part of [en.html, en.text, en.sms]) expect(part).toContain(URL);
  });
});

describe('testCopy', () => {
  it('says who the message was for and what the SMS would say', () => {
    const msg = reviewRequest({ ...ctx, locale: 'es' }, URL);
    const copy = testCopy(appt, msg);
    expect(copy.subject).toBe(`[TEST] ${msg.subject}`);
    expect(copy.text).toContain('Ana García · ana@example.com · +34600000000');
    expect(copy.text).toContain(msg.sms);
    expect(copy.html).toContain(msg.html);
  });

  it('notes when there is no SMS to send', () => {
    const copy = testCopy({ ...appt, clientPhone: '' }, reviewRequest(ctx, URL));
    expect(copy.text).toContain('No phone number');
  });
});
