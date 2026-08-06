/**
 * Notification content. One function per event, each returning email + SMS
 * bodies. Kept free of provider concerns so templates are easy to review.
 */
import { CONTACT_INFO } from '@mediterranea/shared/constants';

const STUDIO = 'Mediterránea Face Studio';

export interface NotificationContext {
  clientName: string;
  serviceName: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  staffName?: string | null;
  policyText?: string;
}

export interface RenderedMessage {
  subject: string;
  html: string;
  text: string;
  sms: string;
}

function prettyDate(date: string): string {
  // e.g. "Friday, 8 August 2026" — server-locale, timezone-agnostic (date-only).
  const d = new Date(`${date}T00:00:00`);
  return d.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function shell(title: string, bodyHtml: string): string {
  return `<div style="font-family:Georgia,serif;max-width:520px;margin:0 auto;color:#2b2b2b">
  <h1 style="font-size:22px;letter-spacing:1px">${STUDIO}</h1>
  <h2 style="font-size:18px;color:#9a7b3f">${title}</h2>
  ${bodyHtml}
  <hr style="border:none;border-top:1px solid #e5e0d8;margin:24px 0"/>
  <p style="font-size:12px;color:#8a8378">${CONTACT_INFO.address}, ${CONTACT_INFO.city}<br/>
  ${CONTACT_INFO.phone} · ${CONTACT_INFO.email}</p>
</div>`;
}

function line(ctx: NotificationContext): string {
  const withStaff = ctx.staffName ? ` with ${ctx.staffName}` : '';
  return `${ctx.serviceName}${withStaff} on ${prettyDate(ctx.date)} at ${ctx.time}`;
}

export function bookingConfirmed(ctx: NotificationContext): RenderedMessage {
  const summary = line(ctx);
  return {
    subject: `Your appointment at ${STUDIO} is confirmed`,
    html: shell(
      'Appointment confirmed',
      `<p>Hi ${ctx.clientName},</p>
       <p>Your appointment is booked:</p>
       <p style="font-size:16px"><strong>${summary}</strong></p>
       ${ctx.policyText ? `<p style="font-size:12px;color:#8a8378">${ctx.policyText}</p>` : ''}
       <p>We look forward to seeing you.</p>`
    ),
    text: `Hi ${ctx.clientName}, your appointment at ${STUDIO} is confirmed: ${summary}.${
      ctx.policyText ? ` ${ctx.policyText}` : ''
    }`,
    sms: `${STUDIO}: your appointment is confirmed — ${summary}.`,
  };
}

export function appointmentCancelled(ctx: NotificationContext): RenderedMessage {
  const summary = line(ctx);
  return {
    subject: `Your appointment at ${STUDIO} was cancelled`,
    html: shell(
      'Appointment cancelled',
      `<p>Hi ${ctx.clientName},</p>
       <p>Your appointment has been cancelled:</p>
       <p style="font-size:16px"><strong>${summary}</strong></p>
       <p>To rebook, visit our website or call us.</p>`
    ),
    text: `Hi ${ctx.clientName}, your appointment at ${STUDIO} (${summary}) has been cancelled. To rebook, call ${CONTACT_INFO.phone}.`,
    sms: `${STUDIO}: your appointment on ${prettyDate(ctx.date)} at ${ctx.time} was cancelled. Call ${CONTACT_INFO.phone} to rebook.`,
  };
}

export function appointmentReminder(ctx: NotificationContext): RenderedMessage {
  const summary = line(ctx);
  return {
    subject: `Reminder: your appointment at ${STUDIO} tomorrow`,
    html: shell(
      'Appointment reminder',
      `<p>Hi ${ctx.clientName},</p>
       <p>This is a friendly reminder of your appointment tomorrow:</p>
       <p style="font-size:16px"><strong>${summary}</strong></p>
       ${ctx.policyText ? `<p style="font-size:12px;color:#8a8378">${ctx.policyText}</p>` : ''}`
    ),
    text: `Reminder from ${STUDIO}: ${summary}.${ctx.policyText ? ` ${ctx.policyText}` : ''}`,
    sms: `${STUDIO} reminder: ${summary}.`,
  };
}
