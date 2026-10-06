/**
 * Emails to the studio team when an appointment is created, changed or
 * deleted. Pure: callers resolve names and recipients, so this stays testable.
 * Always English — it's the backoffice's language.
 */
import { APPOINTMENT_STATUSES } from '@mediterranea/shared/constants';
import type { Appointment } from '@mediterranea/shared/types';

export type TeamEvent =
  | { kind: 'created'; appt: Appointment }
  | { kind: 'updated'; before: Appointment; after: Appointment }
  | { kind: 'deleted'; appt: Appointment };

/** Practitioner and room names by id, for readable emails. */
export interface TeamNames {
  staff: Record<string, string>;
  rooms: Record<string, string>;
}

export interface TeamEmail {
  subject: string;
  html: string;
  text: string;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** "Tue 7 Oct" — short enough for a subject line. */
function shortDate(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

const statusLabel = (a: Appointment) => APPOINTMENT_STATUSES[a.status]?.label ?? a.status;
const when = (a: Appointment) => `${shortDate(a.appointmentDate)} ${a.appointmentTime}`;

/** What changed between two versions of an appointment, as "Field: old → new" pairs. */
export function describeChanges(
  before: Appointment,
  after: Appointment,
  names: TeamNames
): { field: string; from: string; to: string }[] {
  const changes: { field: string; from: string; to: string }[] = [];
  const add = (field: string, from: string, to: string) => {
    if (from !== to) changes.push({ field, from, to });
  };
  add('When', when(before), when(after));
  add('Treatment', before.serviceName, after.serviceName);
  add('Practitioner', names.staff[before.staffId ?? ''] ?? '—', names.staff[after.staffId ?? ''] ?? '—');
  add('Room', names.rooms[before.roomId ?? ''] ?? '—', names.rooms[after.roomId ?? ''] ?? '—');
  add('Status', statusLabel(before), statusLabel(after));
  return changes;
}

/**
 * Render the team email, or null when an update changed nothing worth telling
 * the team about (e.g. a save that rewrote the same values).
 */
export function teamEmail(
  event: TeamEvent,
  ctx: { names: TeamNames; by: string; calendarUrl: string }
): TeamEmail | null {
  const appt = event.kind === 'updated' ? event.after : event.appt;
  const changes = event.kind === 'updated' ? describeChanges(event.before, event.after, ctx.names) : [];
  if (event.kind === 'updated' && changes.length === 0) return null;

  const cancelled =
    event.kind === 'updated' &&
    event.before.status !== event.after.status &&
    (event.after.status === 'cancelled' || event.after.status === 'rejected');
  const headline =
    event.kind === 'created'
      ? 'New appointment'
      : event.kind === 'deleted'
        ? 'Appointment deleted'
        : cancelled
          ? `Appointment ${statusLabel(event.after).toLowerCase()}`
          : 'Appointment changed';
  const subject = `${headline}: ${appt.clientName} · ${appt.serviceName}, ${when(appt)}`;

  const details: [string, string][] = [
    ['Client', appt.clientName],
    ['Treatment', appt.serviceName],
    ['When', `${when(appt)} (${appt.durationMinutes} min)`],
    ['Practitioner', ctx.names.staff[appt.staffId ?? ''] ?? '—'],
    ['Room', ctx.names.rooms[appt.roomId ?? ''] ?? '—'],
    ['Status', statusLabel(appt)],
    ...(appt.clientEmail ? [['Email', appt.clientEmail] as [string, string]] : []),
    ...(appt.clientPhone ? [['Phone', appt.clientPhone] as [string, string]] : []),
    ...(appt.notes ? [['Notes', appt.notes] as [string, string]] : []),
  ];

  const row = (k: string, v: string) =>
    `<tr><td style="padding:3px 16px 3px 0;color:#8a8378;vertical-align:top">${escapeHtml(k)}</td>` +
    `<td style="padding:3px 0">${escapeHtml(v)}</td></tr>`;
  const changesHtml = changes.length
    ? `<p style="margin:16px 0 6px"><strong>What changed</strong></p><table style="font-size:14px;border-collapse:collapse">${changes
        .map((c) => row(c.field, `${c.from} → ${c.to}`))
        .join('')}</table>`
    : '';

  const html = `<div style="font-family:Georgia,serif;max-width:520px;margin:0 auto;color:#2b2b2b">
  <h2 style="font-size:18px;color:#9a7b3f">${escapeHtml(headline)}</h2>
  <p style="font-size:13px;color:#8a8378">By ${escapeHtml(ctx.by)}</p>
  ${changesHtml}
  <p style="margin:16px 0 6px"><strong>${event.kind === 'updated' ? 'Now' : 'Appointment'}</strong></p>
  <table style="font-size:14px;border-collapse:collapse">${details.map(([k, v]) => row(k, v)).join('')}</table>
  <p style="margin-top:24px"><a href="${ctx.calendarUrl}" style="color:#9a7b3f">Open the calendar</a></p>
</div>`;

  const text = [
    headline,
    `By ${ctx.by}`,
    ...(changes.length ? ['', 'What changed:', ...changes.map((c) => `  ${c.field}: ${c.from} → ${c.to}`)] : []),
    '',
    ...details.map(([k, v]) => `${k}: ${v}`),
    '',
    `Calendar: ${ctx.calendarUrl}`,
  ].join('\n');

  return { subject, html, text };
}
