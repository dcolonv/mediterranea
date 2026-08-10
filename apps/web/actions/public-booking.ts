'use server';

/**
 * Public, guest-facing booking actions. No admin auth — these back the online
 * booking flow. Correctness is enforced by the deterministic data layer: the
 * availability engine and the transactional conflict guard on create. Rooms and
 * staff are resolved server-side, so the client never picks internal resources.
 */
import { headers } from 'next/headers';
import * as data from '@/lib/agent/data';
import { allowAction } from '@/lib/rate-limit';
import type { WorkingHours } from '@mediterranea/shared/types';

/** Coarse client IP from proxy headers, for rate-limit keying. */
async function clientIp(): Promise<string> {
  const h = await headers();
  return (
    h.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    h.get('x-real-ip') ||
    'unknown'
  );
}

export interface PublicService {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  durationMinutes: number;
  price: number;
}

export interface PublicStaff {
  id: string;
  name: string;
  role: string;
}

function toPublicService(s: {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  durationMinutes: number;
  price: number;
}): PublicService {
  return {
    id: s.id,
    name: s.name,
    slug: s.slug,
    description: s.description,
    category: s.category,
    durationMinutes: s.durationMinutes,
    price: s.price,
  };
}

/** Active, bookable treatments (plain objects — no Firestore Timestamps). */
export async function getBookingServices(): Promise<PublicService[]> {
  const services = await data.listServices(false);
  return services.map(toPublicService);
}

export async function getBookingService(slug: string): Promise<PublicService | null> {
  const s = await data.getService(slug);
  return s ? toPublicService(s) : null;
}

/** Active practitioners qualified for a service (for the "choose practitioner" step). */
export async function getBookingStaff(serviceId: string): Promise<PublicStaff[]> {
  const staff = await data.getServiceStaff(serviceId);
  return staff.map((s) => ({ id: s.id, name: s.name, role: s.role }));
}

/** Bookable start times for a service on a date. Optionally restrict to one practitioner. */
export async function getBookingAvailability(
  serviceId: string,
  date: string,
  staffId?: string
): Promise<{ success: true; durationMinutes: number; times: string[] } | { success: false; error: string }> {
  if (!(await allowAction(`avail:ip:${await clientIp()}`, 60, 10 * 60))) {
    return { success: false, error: 'Too many requests. Please slow down.' };
  }
  const res = await data.findAvailability({ serviceId, date, staffId });
  if ('error' in res) return { success: false, error: res.error };
  return { success: true, durationMinutes: res.durationMinutes, times: res.slots.map((s) => s.time) };
}

/** The cancellation policy + business hours, for display on public pages. */
export async function getPublicPolicy(): Promise<{
  policyText: string;
  cutoffHours: number;
  businessHours: WorkingHours;
}> {
  const settings = await data.getStudioSettings();
  return {
    policyText: settings.cancellation.policyText,
    cutoffHours: settings.cancellation.cutoffHours,
    businessHours: settings.businessHours ?? {},
  };
}

export interface OnlineBookingInput {
  serviceId: string;
  date: string;
  time: string;
  staffId?: string; // optional preferred practitioner; server resolves if absent
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  notes?: string;
}

export async function createOnlineBooking(input: OnlineBookingInput) {
  if (!input.clientName?.trim() || !input.clientEmail?.trim() || !input.clientPhone?.trim()) {
    return { success: false as const, error: 'Please provide your name, email, and phone.' };
  }

  // Abuse guardrails: limit by IP (bursts) and by email (per-address volume).
  const ip = await clientIp();
  const email = input.clientEmail.trim().toLowerCase();
  const [ipOk, emailOk] = await Promise.all([
    allowAction(`book:ip:${ip}`, 6, 10 * 60), // 6 bookings / 10 min / IP
    allowAction(`book:email:${email}`, 4, 60 * 60), // 4 bookings / hour / email
  ]);
  if (!ipOk || !emailOk) {
    return {
      success: false as const,
      error: 'Too many booking attempts. Please try again later or call us.',
    };
  }

  // Re-check availability for this exact slot and resolve staff + room server-side.
  const avail = await data.findAvailability({
    serviceId: input.serviceId,
    date: input.date,
    staffId: input.staffId,
  });
  if ('error' in avail) return { success: false as const, error: avail.error };

  const slot = avail.slots.find((s) => s.time === input.time);
  if (!slot) {
    return { success: false as const, error: 'That time is no longer available. Please choose another.' };
  }

  const staffId =
    input.staffId && slot.staffIds.includes(input.staffId) ? input.staffId : slot.staffIds[0];
  const roomId = slot.roomIds[0];
  if (!staffId || !roomId) {
    return { success: false as const, error: 'That time is no longer available. Please choose another.' };
  }

  const res = await data.createAppointment({
    serviceId: input.serviceId,
    date: input.date,
    time: input.time,
    staffId,
    roomId,
    clientName: input.clientName.trim(),
    clientEmail: input.clientEmail.trim(),
    clientPhone: input.clientPhone.trim(),
    notes: input.notes?.trim() || undefined,
    source: 'online',
  });

  return res;
}
