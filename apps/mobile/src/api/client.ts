import type { Service, Appointment, AppointmentStatus } from '@mediterranea/shared/types';
import type { AppointmentFormData } from '@mediterranea/shared/validations';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

async function apiFetch<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}` };
}

// Public endpoints

export async function fetchServices(): Promise<Service[]> {
  const result = await apiFetch<{ data: Service[] }>('/api/services');
  return result.data;
}

export async function fetchAvailableSlots(
  date: string,
  duration: number
): Promise<string[]> {
  const result = await apiFetch<{ success: boolean; slots: string[] }>(
    `/api/appointments?slots=true&date=${date}&duration=${duration}`
  );
  return result.slots;
}

export async function createAppointment(
  data: AppointmentFormData
): Promise<string> {
  const result = await apiFetch<{ data: { id: string } }>('/api/appointments', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return result.data.id;
}

// Admin endpoints

export async function fetchAppointments(
  token: string,
  filters?: { status?: AppointmentStatus; startDate?: string; endDate?: string }
): Promise<Appointment[]> {
  const params = new URLSearchParams();
  if (filters?.status) params.set('status', filters.status);
  if (filters?.startDate) params.set('startDate', filters.startDate);
  if (filters?.endDate) params.set('endDate', filters.endDate);

  const query = params.toString() ? `?${params.toString()}` : '';
  const result = await apiFetch<{ data: Appointment[] }>(
    `/api/appointments${query}`,
    { headers: authHeaders(token) }
  );
  return result.data;
}

export async function updateAppointmentStatus(
  token: string,
  id: string,
  status: AppointmentStatus
): Promise<void> {
  await apiFetch(`/api/appointments/${id}`, {
    method: 'PATCH',
    headers: authHeaders(token),
    body: JSON.stringify({ status }),
  });
}

export async function deleteAppointment(
  token: string,
  id: string
): Promise<void> {
  await apiFetch(`/api/appointments/${id}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
}
