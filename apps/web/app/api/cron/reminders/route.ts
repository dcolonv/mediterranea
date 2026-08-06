import { NextRequest, NextResponse } from 'next/server';
import * as data from '@/lib/agent/data';
import { notifyAppointmentReminder } from '@/lib/notifications/dispatch';

export const runtime = 'nodejs';
export const maxDuration = 60;

/** Tomorrow's date (YYYY-MM-DD) in the studio timezone. */
function tomorrowInMalaga(): string {
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Madrid',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
  const d = new Date(`${today}T00:00:00`);
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

/**
 * Send day-before reminders. Intended to be invoked once daily by a scheduler
 * (Vercel Cron / Cloud Scheduler). Protected by CRON_SECRET — supply it via the
 * `Authorization: Bearer <secret>` header or `?secret=` query param.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'Reminders are not configured (missing CRON_SECRET).' }, { status: 503 });
  }
  const provided =
    request.headers.get('Authorization')?.replace('Bearer ', '') ??
    request.nextUrl.searchParams.get('secret');
  if (provided !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const date = tomorrowInMalaga();
    const appts = (await data.listAppointments({ date })).filter(
      (a) => a.status === 'pending' || a.status === 'confirmed'
    );

    await Promise.allSettled(appts.map((a) => notifyAppointmentReminder(a)));

    return NextResponse.json({ success: true, date, reminded: appts.length });
  } catch (error) {
    console.error('[cron] reminders failed:', error);
    return NextResponse.json({ error: 'Failed to send reminders.' }, { status: 500 });
  }
}
