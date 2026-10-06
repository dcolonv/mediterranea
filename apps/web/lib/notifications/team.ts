/**
 * Email the studio team — everyone on the Team page — when an appointment is
 * created, changed or deleted, except whoever made the change (they already
 * know). Best-effort: logs and never throws, so a mail hiccup can't break a
 * booking.
 */
import { getAdminDb } from '@/lib/firebase/admin';
import { getBackofficeAdminEmail } from '@/lib/auth/backoffice';
import { siteUrl } from '@/lib/site-url';
import * as data from '@/lib/agent/data';
import { sendEmail } from './providers';
import { teamEmail, type TeamEvent } from './team-templates';

/** Who made a new booking, by where it came from (walk-ins name the staff member instead). */
const CREATED_BY: Partial<Record<NonNullable<data.CreateAppointmentInput['source']>, string>> = {
  online: 'the client, booking online',
  agent: 'the booking assistant',
};

/** The signed-in backoffice user, when this request has one. */
async function currentAdmin(): Promise<string | null> {
  try {
    return await getBackofficeAdminEmail();
  } catch {
    return null; // outside a request, e.g. a script
  }
}

/**
 * @param by Who made the change, when the request can't tell (e.g. "the
 *   client"). Otherwise the signed-in staff member's email is used.
 */
export async function notifyTeam(event: TeamEvent, by?: string): Promise<void> {
  try {
    const actor = await currentAdmin();
    const admins = await getAdminDb().collection('admins').get();
    const recipients = admins.docs
      .map((d) => d.id.toLowerCase())
      .filter((email) => email.includes('@') && email !== actor);
    if (recipients.length === 0) return;

    const [staff, rooms] = await Promise.all([data.listStaff(false), data.listRooms(false)]);
    const names = {
      staff: Object.fromEntries(staff.map((s) => [s.id, s.name])),
      rooms: Object.fromEntries(rooms.map((r) => [r.id, r.name])),
    };
    const source = event.kind === 'created' ? event.appt.source : undefined;
    const msg = teamEmail(event, {
      names,
      by: by ?? (source && CREATED_BY[source]) ?? actor ?? 'the backoffice',
      calendarUrl: `${siteUrl()}/backoffice/calendar`,
    });
    if (!msg) return;

    await Promise.allSettled(recipients.map((to) => sendEmail({ to, ...msg })));
  } catch (error) {
    console.error('[notifications] notifyTeam failed:', error);
  }
}
