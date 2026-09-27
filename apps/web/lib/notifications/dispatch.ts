/**
 * Event dispatch: load the appointment, render the right template, and fan out
 * to email + SMS. Every function is best-effort — failures are logged and never
 * thrown, so a notification hiccup can't break a booking or a status change.
 */
import * as data from '@/lib/agent/data';
import { sendEmail, sendSms } from './providers';
import { sendStaffPush } from './push';
import {
  bookingConfirmed,
  appointmentCancelled,
  appointmentRescheduled,
  appointmentReminder,
  type NotificationContext,
  type RenderedMessage,
} from './templates';
import {
  createAppointmentToken,
  linkExpiryFor,
  appointmentManageUrl,
} from '@/lib/appointments/link-token';
import { siteUrl } from '@/lib/site-url';
import type { Appointment } from '@mediterranea/shared/types';

/**
 * A fresh signed link for this appointment, so a rescheduled booking's next
 * email carries a token valid for its new time. Returns undefined when the
 * secret is unset — the email then sends without buttons rather than failing.
 */
function manageUrlFor(appt: Appointment): string | undefined {
  try {
    const token = createAppointmentToken({
      appointmentId: appt.id,
      expiresAt: linkExpiryFor(appt.appointmentDate, appt.appointmentTime),
    });
    return appointmentManageUrl(token, siteUrl());
  } catch {
    console.warn('[notifications] APPOINTMENT_LINK_SECRET unset; emails omit manage links.');
    return undefined;
  }
}

async function buildContext(appt: Appointment): Promise<NotificationContext> {
  const [staff, settings] = await Promise.all([
    appt.staffId ? data.getStaff(appt.staffId) : Promise.resolve(null),
    data.getStudioSettings(),
  ]);
  // Write to the client in the language they booked in (older records default to English).
  const locale = appt.locale === 'es' ? 'es' : 'en';
  const { policyText, policyTextEs } = settings.cancellation;
  return {
    clientName: appt.clientName,
    serviceName: appt.serviceName,
    date: appt.appointmentDate,
    time: appt.appointmentTime,
    manageUrl: manageUrlFor(appt),
    staffName: staff?.name ?? null,
    policyText: locale === 'es' ? policyTextEs || policyText : policyText,
    locale,
  };
}

async function deliver(appt: Appointment, msg: RenderedMessage): Promise<void> {
  const jobs: Promise<unknown>[] = [];
  if (appt.clientEmail) {
    jobs.push(
      sendEmail({ to: appt.clientEmail, subject: msg.subject, html: msg.html, text: msg.text })
    );
  }
  if (appt.clientPhone) {
    jobs.push(sendSms({ to: appt.clientPhone, body: msg.sms }));
  }
  await Promise.allSettled(jobs);
}

export async function notifyBookingCreated(appointmentId: string): Promise<void> {
  try {
    const appt = await data.getAppointment(appointmentId);
    if (!appt) return;
    const settings = await data.getStudioSettings();
    const clientJob =
      settings.notifications?.confirmationEnabled === false
        ? Promise.resolve()
        : deliver(appt, bookingConfirmed(await buildContext(appt)));
    await Promise.allSettled([
      clientJob,
      sendStaffPush(
        'New booking',
        `${appt.clientName} — ${appt.serviceName}, ${appt.appointmentDate} at ${appt.appointmentTime}`,
        { appointmentId: appt.id }
      ),
    ]);
  } catch (error) {
    console.error('[notifications] notifyBookingCreated failed:', error);
  }
}

export async function notifyAppointmentCancelled(appointmentId: string): Promise<void> {
  try {
    const appt = await data.getAppointment(appointmentId);
    if (!appt) return;
    const settings = await data.getStudioSettings();
    // Offer the freed slot to matching waitlist entries (best-effort).
    const { offerFreedSlot } = await import('@/actions/waitlist');
    const clientJob =
      settings.notifications?.cancellationEnabled === false
        ? Promise.resolve()
        : deliver(appt, appointmentCancelled(await buildContext(appt)));
    await Promise.allSettled([
      clientJob,
      sendStaffPush(
        'Cancellation',
        `${appt.clientName} — ${appt.serviceName}, ${appt.appointmentDate} at ${appt.appointmentTime}`,
        { appointmentId: appt.id }
      ),
      offerFreedSlot(appt),
    ]);
  } catch (error) {
    console.error('[notifications] notifyAppointmentCancelled failed:', error);
  }
}

/** The client moved their own appointment; confirm the new time. */
export async function notifyAppointmentRescheduled(appointmentId: string): Promise<void> {
  try {
    const appt = await data.getAppointment(appointmentId);
    if (!appt) return;
    await Promise.allSettled([
      deliver(appt, appointmentRescheduled(await buildContext(appt))),
      sendStaffPush(
        'Appointment moved',
        `${appt.clientName} — ${appt.serviceName}, now ${appt.appointmentDate} at ${appt.appointmentTime}`,
        { appointmentId: appt.id }
      ),
    ]);
  } catch (error) {
    console.error('[notifications] notifyAppointmentRescheduled failed:', error);
  }
}

/** Reminder for an already-loaded appointment (used by the scheduled job). */
export async function notifyAppointmentReminder(appt: Appointment): Promise<void> {
  try {
    const settings = await data.getStudioSettings();
    if (settings.notifications?.reminderEnabled === false) return;
    await deliver(appt, appointmentReminder(await buildContext(appt)));
  } catch (error) {
    console.error('[notifications] notifyAppointmentReminder failed:', error);
  }
}
