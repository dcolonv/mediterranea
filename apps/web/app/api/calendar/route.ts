import { NextRequest, NextResponse } from 'next/server';
import { buildIcs } from '@/lib/calendar/ics';

/**
 * Serves a booked appointment as a calendar file.
 *
 * Served rather than generated in the browser because iOS hands a
 * `text/calendar` response straight to the Calendar app, where a downloaded
 * blob only lands in Files. Everything needed is in the query string and none
 * of it identifies the client.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const date = params.get('date') ?? '';
  const time = params.get('time') ?? '';
  const duration = Number(params.get('duration'));
  // Trimmed, and stripped of the line breaks that would let a crafted link
  // inject extra iCalendar properties.
  const service = (params.get('service') ?? '').replace(/[\r\n]/g, ' ').trim().slice(0, 120);

  const valid =
    /^\d{4}-\d{2}-\d{2}$/.test(date) &&
    /^([01]\d|2[0-3]):[0-5]\d$/.test(time) &&
    Number.isInteger(duration) &&
    duration > 0 &&
    duration <= 600 &&
    service.length > 0;

  if (!valid) {
    return NextResponse.json({ error: 'Invalid appointment details' }, { status: 400 });
  }

  const ics = buildIcs({ service, date, time, durationMinutes: duration });

  return new NextResponse(ics, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      // `inline` keeps iOS/macOS opening it in Calendar instead of saving it.
      'Content-Disposition': 'inline; filename="mediterranea-appointment.ics"',
      'Cache-Control': 'no-store',
    },
  });
}
