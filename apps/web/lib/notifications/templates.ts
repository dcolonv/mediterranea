/**
 * Notification content. One function per event, each returning email + SMS
 * bodies. Kept free of provider concerns so templates are easy to review.
 */
import { CONTACT_INFO } from '@mediterranea/shared/constants';

const STUDIO = 'Mediterránea Face Studio';

/** Language a message is rendered in — the one the client booked in. */
export type NotificationLocale = 'en' | 'es';

export interface NotificationContext {
  clientName: string;
  serviceName: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  staffName?: string | null;
  policyText?: string;
  locale?: NotificationLocale;
}

export interface RenderedMessage {
  subject: string;
  html: string;
  text: string;
  sms: string;
}

function prettyDate(date: string, locale: NotificationLocale = 'en'): string {
  // e.g. "Friday, 8 August 2026" / "viernes, 8 de agosto de 2026" — date-only.
  const d = new Date(`${date}T00:00:00`);
  return d.toLocaleDateString(locale === 'es' ? 'es-ES' : 'en-GB', {
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
  const es = ctx.locale === 'es';
  const withStaff = ctx.staffName ? (es ? ` con ${ctx.staffName}` : ` with ${ctx.staffName}`) : '';
  const when = prettyDate(ctx.date, ctx.locale);
  return es
    ? `${ctx.serviceName}${withStaff} el ${when} a las ${ctx.time}`
    : `${ctx.serviceName}${withStaff} on ${when} at ${ctx.time}`;
}

export function bookingConfirmed(ctx: NotificationContext): RenderedMessage {
  const summary = line(ctx);
  const policy = ctx.policyText
    ? `<p style="font-size:12px;color:#8a8378">${ctx.policyText}</p>`
    : '';

  if (ctx.locale === 'es') {
    return {
      subject: `Tu cita en ${STUDIO} está confirmada`,
      html: shell(
        'Cita confirmada',
        `<p>Hola ${ctx.clientName}:</p>
         <p>Tu cita está reservada:</p>
         <p style="font-size:16px"><strong>${summary}</strong></p>
         ${policy}
         <p>Te esperamos.</p>`
      ),
      text: `Hola ${ctx.clientName}, tu cita en ${STUDIO} está confirmada: ${summary}.${
        ctx.policyText ? ` ${ctx.policyText}` : ''
      }`,
      sms: `${STUDIO}: tu cita está confirmada — ${summary}.`,
    };
  }

  return {
    subject: `Your appointment at ${STUDIO} is confirmed`,
    html: shell(
      'Appointment confirmed',
      `<p>Hi ${ctx.clientName},</p>
       <p>Your appointment is booked:</p>
       <p style="font-size:16px"><strong>${summary}</strong></p>
       ${policy}
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
  const when = prettyDate(ctx.date, ctx.locale);

  if (ctx.locale === 'es') {
    return {
      subject: `Tu cita en ${STUDIO} ha sido cancelada`,
      html: shell(
        'Cita cancelada',
        `<p>Hola ${ctx.clientName}:</p>
         <p>Tu cita ha sido cancelada:</p>
         <p style="font-size:16px"><strong>${summary}</strong></p>
         <p>Para reservar de nuevo, visita nuestra web o llámanos.</p>`
      ),
      text: `Hola ${ctx.clientName}, tu cita en ${STUDIO} (${summary}) ha sido cancelada. Para reservar de nuevo, llama al ${CONTACT_INFO.phone}.`,
      sms: `${STUDIO}: tu cita del ${when} a las ${ctx.time} ha sido cancelada. Llama al ${CONTACT_INFO.phone} para reservar de nuevo.`,
    };
  }

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
    sms: `${STUDIO}: your appointment on ${when} at ${ctx.time} was cancelled. Call ${CONTACT_INFO.phone} to rebook.`,
  };
}

export function giftCardIssued(input: {
  recipientName: string;
  code: string;
  amount: string; // pre-formatted, e.g. "€50.00"
  message?: string;
}): RenderedMessage {
  return {
    subject: `Your ${STUDIO} gift card`,
    html: shell(
      'A gift for you',
      `<p>Hi ${input.recipientName},</p>
       <p>You’ve received a <strong>${input.amount}</strong> gift card for ${STUDIO}.</p>
       <p style="font-size:20px;letter-spacing:2px"><strong>${input.code}</strong></p>
       ${input.message ? `<p style="font-style:italic;color:#8a8378">“${input.message}”</p>` : ''}
       <p>Present this code when you book or visit. Enjoy your treatment.</p>`
    ),
    text: `Hi ${input.recipientName}, you've received a ${input.amount} gift card for ${STUDIO}. Code: ${input.code}.${
      input.message ? ` Message: ${input.message}` : ''
    }`,
    sms: `${STUDIO}: you've received a ${input.amount} gift card. Code: ${input.code}.`,
  };
}

export function waitlistSlotOpened(ctx: NotificationContext): RenderedMessage {
  if (ctx.locale === 'es') {
    const cuando = `${prettyDate(ctx.date, 'es')} a las ${ctx.time}`;
    return {
      subject: `Se ha liberado una cita en ${STUDIO}`,
      html: shell(
        'Se ha liberado una cita',
        `<p>Hola ${ctx.clientName}:</p>
         <p>Buenas noticias: se ha liberado una cita para <strong>${ctx.serviceName}</strong> el
         <strong>${cuando}</strong>.</p>
         <p>Las citas vuelan. Para reservarla, responde a este correo o llámanos cuanto antes.</p>`
      ),
      text: `Hola ${ctx.clientName}, se ha liberado una cita para ${ctx.serviceName} el ${cuando} en ${STUDIO}. Llama al ${CONTACT_INFO.phone} para reservarla.`,
      sms: `${STUDIO}: se ha liberado una cita para ${ctx.serviceName} el ${cuando}. Llama al ${CONTACT_INFO.phone} — ¡vuelan!`,
    };
  }

  const when = `${prettyDate(ctx.date)} at ${ctx.time}`;
  return {
    subject: `A spot just opened at ${STUDIO}`,
    html: shell(
      'A spot just opened',
      `<p>Hi ${ctx.clientName},</p>
       <p>Good news — a spot for <strong>${ctx.serviceName}</strong> has just opened up on
       <strong>${when}</strong>.</p>
       <p>Spots go quickly. To claim it, reply to this email or call us as soon as you can.</p>`
    ),
    text: `Hi ${ctx.clientName}, a spot for ${ctx.serviceName} just opened on ${when} at ${STUDIO}. Call ${CONTACT_INFO.phone} to claim it.`,
    sms: `${STUDIO}: a spot for ${ctx.serviceName} opened ${when}. Call ${CONTACT_INFO.phone} to book — spots go fast!`,
  };
}

export function appointmentReminder(ctx: NotificationContext): RenderedMessage {
  const summary = line(ctx);
  const policy = ctx.policyText
    ? `<p style="font-size:12px;color:#8a8378">${ctx.policyText}</p>`
    : '';

  if (ctx.locale === 'es') {
    return {
      subject: `Recordatorio: tu cita mañana en ${STUDIO}`,
      html: shell(
        'Recordatorio de cita',
        `<p>Hola ${ctx.clientName}:</p>
         <p>Te recordamos tu cita de mañana:</p>
         <p style="font-size:16px"><strong>${summary}</strong></p>
         ${policy}`
      ),
      text: `Recordatorio de ${STUDIO}: ${summary}.${ctx.policyText ? ` ${ctx.policyText}` : ''}`,
      sms: `Recordatorio de ${STUDIO}: ${summary}.`,
    };
  }

  return {
    subject: `Reminder: your appointment at ${STUDIO} tomorrow`,
    html: shell(
      'Appointment reminder',
      `<p>Hi ${ctx.clientName},</p>
       <p>This is a friendly reminder of your appointment tomorrow:</p>
       <p style="font-size:16px"><strong>${summary}</strong></p>
       ${policy}`
    ),
    text: `Reminder from ${STUDIO}: ${summary}.${ctx.policyText ? ` ${ctx.policyText}` : ''}`,
    sms: `${STUDIO} reminder: ${summary}.`,
  };
}
