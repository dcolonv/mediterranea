'use server';

import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { Timestamp as AdminTimestamp, type Query } from 'firebase-admin/firestore';
import { db } from '@/lib/firebase/config';
import { getAdminDb } from '@/lib/firebase/admin';
import { serializeDoc } from '@/lib/firebase/serialize';
import { appointmentSchema, type AppointmentFormData } from '@mediterranea/shared/validations';
import { SERVICES_SEED, BUSINESS_HOURS, TIME_SLOTS } from '@mediterranea/shared/constants';
import { upsertCustomerForAppointment } from '@/actions/customers';
import type { Appointment, AppointmentStatus } from '@mediterranea/shared/types';

type DayOfWeek = keyof typeof BUSINESS_HOURS;

const DAY_NAMES: DayOfWeek[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

export async function getAvailableSlots(date: string, serviceDuration: number) {
  try {
    const dateObj = new Date(date + 'T00:00:00');
    const dayOfWeek = DAY_NAMES[dateObj.getDay()];
    const hours = BUSINESS_HOURS[dayOfWeek];

    if (!hours) {
      return { success: true, slots: [] };
    }

    const openMinutes = timeToMinutes(hours.open);
    const closeMinutes = timeToMinutes(hours.close);

    // Filter TIME_SLOTS to this day's business hours
    const daySlots = TIME_SLOTS.filter((slot) => {
      const slotMinutes = timeToMinutes(slot);
      return slotMinutes >= openMinutes && slotMinutes < closeMinutes;
    });

    // Fetch existing appointments for this date using admin SDK
    const appointmentsRef = getAdminDb().collection('appointments');
    const snapshot = await appointmentsRef
      .where('appointmentDate', '==', date)
      .where('status', 'in', ['pending', 'confirmed', 'checked-in'])
      .get();

    // Build blocked time ranges from existing appointments
    const blockedRanges: { start: number; end: number }[] = [];
    snapshot.docs.forEach((doc) => {
      const data = doc.data();
      const appointmentStart = timeToMinutes(data.appointmentTime);
      // Use stored durationMinutes, or look up from SERVICES_SEED, or default to 60
      let duration = data.durationMinutes;
      if (!duration) {
        const service = SERVICES_SEED.find((s) => s.slug === data.serviceId);
        duration = service?.durationMinutes || 60;
      }
      blockedRanges.push({
        start: appointmentStart,
        end: appointmentStart + duration,
      });
    });

    // Filter available slots
    const availableSlots = daySlots.filter((slot) => {
      const slotStart = timeToMinutes(slot);
      const slotEnd = slotStart + serviceDuration;

      // Check if service would extend past closing time
      if (slotEnd > closeMinutes) {
        return false;
      }

      // Check overlap with any blocked range
      for (const blocked of blockedRanges) {
        if (slotStart < blocked.end && slotEnd > blocked.start) {
          return false;
        }
      }

      return true;
    });

    return { success: true, slots: availableSlots };
  } catch (error) {
    console.error('Error fetching available slots:', error);
    return { success: false, slots: [], error: 'Failed to fetch available slots.' };
  }
}

export async function createAppointment(data: AppointmentFormData) {
  const result = appointmentSchema.safeParse(data);

  if (!result.success) {
    return { success: false, error: result.error.flatten().fieldErrors };
  }

  try {
    // Link (or create) the customer record and refresh their rollups.
    const customerId = await upsertCustomerForAppointment({
      name: result.data.clientName,
      email: result.data.clientEmail,
      phone: result.data.clientPhone,
      appointmentDate: result.data.appointmentDate,
    });

    const now = Timestamp.now();
    const appointmentData = {
      ...result.data,
      notes: result.data.notes || '',
      ...(customerId && { customerId }),
      status: 'pending' as AppointmentStatus,
      createdAt: now,
      updatedAt: now,
    };

    const docRef = await addDoc(collection(db, 'appointments'), appointmentData);

    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('Error creating appointment:', error);
    return { success: false, error: 'Failed to create appointment. Please try again.' };
  }
}

export async function getAppointments(filters?: {
  status?: AppointmentStatus;
  startDate?: string;
  endDate?: string;
}) {
  try {
    // Admin SDK bypasses security rules (admin authorization is enforced at the
    // API layer via verifyAdminToken).
    let q: Query = getAdminDb().collection('appointments').orderBy('appointmentDate', 'desc');

    if (filters?.status) {
      q = q.where('status', '==', filters.status);
    }
    if (filters?.startDate) {
      q = q.where('appointmentDate', '>=', filters.startDate);
    }
    if (filters?.endDate) {
      q = q.where('appointmentDate', '<=', filters.endDate);
    }

    const snapshot = await q.get();
    const appointments: Appointment[] = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...serializeDoc(doc.data()),
    })) as Appointment[];

    return { success: true, data: appointments };
  } catch (error) {
    console.error('Error fetching appointments:', error);
    return { success: false, error: 'Failed to fetch appointments.' };
  }
}

export async function updateAppointmentStatus(
  appointmentId: string,
  status: AppointmentStatus
) {
  try {
    await getAdminDb().collection('appointments').doc(appointmentId).update({
      status,
      updatedAt: AdminTimestamp.now(),
    });

    if (status === 'cancelled') {
      const { notifyAppointmentCancelled } = await import('@/lib/notifications/dispatch');
      await notifyAppointmentCancelled(appointmentId);
    }
    if (status === 'completed') {
      const { awardLoyaltyForCompletion } = await import('@/actions/loyalty');
      await awardLoyaltyForCompletion(appointmentId);
    }

    return { success: true };
  } catch (error) {
    console.error('Error updating appointment:', error);
    return { success: false, error: 'Failed to update appointment.' };
  }
}

export async function saveAppointmentNotes(appointmentId: string, notes: string) {
  try {
    await getAdminDb().collection('appointments').doc(appointmentId).update({
      notes,
      updatedAt: AdminTimestamp.now(),
    });
    return { success: true };
  } catch (error) {
    console.error('Error saving appointment notes:', error);
    return { success: false, error: 'Failed to save notes.' };
  }
}

export async function deleteAppointment(appointmentId: string) {
  try {
    await getAdminDb().collection('appointments').doc(appointmentId).delete();
    return { success: true };
  } catch (error) {
    console.error('Error deleting appointment:', error);
    return { success: false, error: 'Failed to delete appointment.' };
  }
}
