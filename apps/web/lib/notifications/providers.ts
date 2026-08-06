/**
 * Provider-agnostic notification transport. Email via Resend, SMS via Twilio,
 * both over their REST APIs (no SDK dependency). When credentials are absent the
 * transport is dormant: it logs what it *would* send and reports `skipped`, so
 * the rest of the app behaves identically in dev and prod.
 */

import { normalizePhone } from '@mediterranea/shared/utils';

export type SendResult = { ok: boolean; skipped?: boolean; error?: string };

export function emailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.NOTIFICATIONS_EMAIL_FROM);
}

export function smsConfigured(): boolean {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_FROM_NUMBER
  );
}

export async function sendEmail(input: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<SendResult> {
  if (!emailConfigured()) {
    console.log(`[notifications] (email dormant) → ${input.to}: ${input.subject}`);
    return { ok: true, skipped: true };
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.NOTIFICATIONS_EMAIL_FROM,
        to: [input.to],
        subject: input.subject,
        html: input.html,
        text: input.text,
      }),
    });
    if (!res.ok) {
      const detail = await res.text();
      console.error('[notifications] email send failed:', res.status, detail);
      return { ok: false, error: `Email failed (${res.status})` };
    }
    return { ok: true };
  } catch (error) {
    console.error('[notifications] email send error:', error);
    return { ok: false, error: 'Email send error' };
  }
}

export async function sendSms(input: { to: string; body: string }): Promise<SendResult> {
  const to = normalizePhone(input.to);
  if (!to) {
    console.log(`[notifications] (sms skipped — unusable number) → ${input.to}`);
    return { ok: true, skipped: true };
  }
  if (!smsConfigured()) {
    console.log(`[notifications] (sms dormant) → ${to}: ${input.body}`);
    return { ok: true, skipped: true };
  }
  try {
    const sid = process.env.TWILIO_ACCOUNT_SID!;
    const auth = Buffer.from(`${sid}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64');
    const body = new URLSearchParams({
      To: to,
      From: process.env.TWILIO_FROM_NUMBER!,
      Body: input.body,
    });
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    });
    if (!res.ok) {
      const detail = await res.text();
      console.error('[notifications] sms send failed:', res.status, detail);
      return { ok: false, error: `SMS failed (${res.status})` };
    }
    return { ok: true };
  } catch (error) {
    console.error('[notifications] sms send error:', error);
    return { ok: false, error: 'SMS send error' };
  }
}
