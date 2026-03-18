'use server';

import { collection, addDoc, Timestamp, query, getDocs, doc, updateDoc, deleteDoc, orderBy, where } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { getAdminDb } from '@/lib/firebase/admin';
import { appointmentSchema, type AppointmentFormData } from '@mediterranea/shared/validations';
import { SERVICES_SEED, BUSINESS_HOURS, TIME_SLOTS } from '@mediterranea/shared/constants';
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
      .where('status', 'in', ['pending', 'confirmed'])
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
    const now = Timestamp.now();
    const appointmentData = {
      ...result.data,
      notes: result.data.notes || '',
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
    let q = query(collection(db, 'appointments'), orderBy('appointmentDate', 'desc'));

    if (filters?.status) {
      q = query(q, where('status', '==', filters.status));
    }

    if (filters?.startDate) {
      q = query(q, where('appointmentDate', '>=', filters.startDate));
    }

    if (filters?.endDate) {
      q = query(q, where('appointmentDate', '<=', filters.endDate));
    }

    const snapshot = await getDocs(q);
    const appointments: Appointment[] = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
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
    const appointmentRef = doc(db, 'appointments', appointmentId);
    await updateDoc(appointmentRef, {
      status,
      updatedAt: Timestamp.now(),
    });

    return { success: true };
  } catch (error) {
    console.error('Error updating appointment:', error);
    return { success: false, error: 'Failed to update appointment.' };
  }
}

export async function deleteAppointment(appointmentId: string) {
  try {
    await deleteDoc(doc(db, 'appointments', appointmentId));
    return { success: true };
  } catch (error) {
    console.error('Error deleting appointment:', error);
    return { success: false, error: 'Failed to delete appointment.' };
  }
}
