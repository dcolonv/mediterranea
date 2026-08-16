import type { Service, Appointment, Customer, AppointmentStatus } from '@mediterranea/shared/types';
import type {
  AppointmentFormData,
  CustomerFormData,
  ServiceFormData,
} from '@mediterranea/shared/validations';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    const message = typeof error.error === 'string' ? error.error : `HTTP ${response.status}`;
    throw new Error(message);
  }

  return response.json();
}

function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}` };
}

// ── Auth ────────────────────────────────────────────────────────────────────

/**
 * Checks admin status against the API.
 * `reachable` distinguishes a real server response from a network/HTTP failure,
 * so the UI can tell "not an admin" apart from "couldn't reach the server".
 */
export async function verifyAdmin(token: string): Promise<{ reachable: boolean; isAdmin: boolean }> {
  try {
    const result = await apiFetch<{ isAdmin: boolean }>('/api/auth/verify-admin', {
      headers: authHeaders(token),
    });
    return { reachable: true, isAdmin: result.isAdmin };
  } catch {
    return { reachable: false, isAdmin: false };
  }
}

// ── Services ──────────────────────────────────────────────────────────────────

export async function fetchServices(): Promise<Service[]> {
  const result = await apiFetch<{ data: Service[] }>('/api/services');
  return result.data;
}

export async function fetchAllServices(token: string): Promise<Service[]> {
  const result = await apiFetch<{ data: Service[] }>('/api/services?all=true', {
    headers: authHeaders(token),
  });
  return result.data;
}

export async function createService(token: string, data: ServiceFormData): Promise<string> {
  const result = await apiFetch<{ data: { id: string } }>('/api/services', {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(data),
  });
  return result.data.id;
}

export async function updateService(
  token: string,
  id: string,
  data: ServiceFormData
): Promise<void> {
  await apiFetch(`/api/services/${id}`, {
    method: 'PATCH',
    headers: authHeaders(token),
    body: JSON.stringify(data),
  });
}

export async function deleteService(token: string, id: string): Promise<void> {
  await apiFetch(`/api/services/${id}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
}

// ── Appointments ──────────────────────────────────────────────────────────────

export async function createAppointment(data: AppointmentFormData): Promise<string> {
  const result = await apiFetch<{ data: { id: string } }>('/api/appointments', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return result.data.id;
}

export async function fetchAppointments(
  token: string,
  filters?: { status?: AppointmentStatus; startDate?: string; endDate?: string }
): Promise<Appointment[]> {
  const params = new URLSearchParams();
  if (filters?.status) params.set('status', filters.status);
  if (filters?.startDate) params.set('startDate', filters.startDate);
  if (filters?.endDate) params.set('endDate', filters.endDate);

  const query = params.toString() ? `?${params.toString()}` : '';
  const result = await apiFetch<{ data: Appointment[] }>(`/api/appointments${query}`, {
    headers: authHeaders(token),
  });
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

export async function saveAppointmentNotes(
  token: string,
  id: string,
  notes: string
): Promise<void> {
  await apiFetch(`/api/appointments/${id}`, {
    method: 'PATCH',
    headers: authHeaders(token),
    body: JSON.stringify({ notes }),
  });
}

export async function deleteAppointment(token: string, id: string): Promise<void> {
  await apiFetch(`/api/appointments/${id}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
}

// ── Scheduling (walk-in booking) ────────────────────────────────────────────────

export interface SchedulingRefs {
  services: { id: string; name: string; durationMinutes: number; price: number; category: string }[];
  staff: { id: string; name: string; role: string }[];
}

export async function fetchSchedulingRefs(token: string): Promise<SchedulingRefs> {
  return apiFetch<SchedulingRefs>('/api/scheduling?refs=true', {
    headers: authHeaders(token),
  });
}

export async function fetchAvailability(
  token: string,
  serviceId: string,
  date: string,
  staffId?: string
): Promise<{ durationMinutes: number; times: string[] }> {
  const params = new URLSearchParams({ serviceId, date });
  if (staffId) params.set('staffId', staffId);
  return apiFetch(`/api/scheduling?${params.toString()}`, {
    headers: authHeaders(token),
  });
}

export async function createWalkIn(
  token: string,
  input: {
    serviceId: string;
    date: string;
    time: string;
    staffId?: string;
    clientName: string;
    clientEmail: string;
    clientPhone: string;
    notes?: string;
  }
): Promise<string> {
  const result = await apiFetch<{ data: { id: string } }>('/api/scheduling', {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(input),
  });
  return result.data.id;
}

// ── Customers ─────────────────────────────────────────────────────────────────

export async function fetchCustomers(token: string, search?: string): Promise<Customer[]> {
  const query = search?.trim() ? `?search=${encodeURIComponent(search.trim())}` : '';
  const result = await apiFetch<{ data: Customer[] }>(`/api/customers${query}`, {
    headers: authHeaders(token),
  });
  return result.data;
}

export async function fetchCustomer(
  token: string,
  id: string
): Promise<{ customer: Customer; appointments: Appointment[] }> {
  const result = await apiFetch<{ data: Customer; appointments: Appointment[] }>(
    `/api/customers/${id}?appointments=true`,
    { headers: authHeaders(token) }
  );
  return { customer: result.data, appointments: result.appointments ?? [] };
}

export async function createCustomer(token: string, data: CustomerFormData): Promise<string> {
  const result = await apiFetch<{ data: { id: string } }>('/api/customers', {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(data),
  });
  return result.data.id;
}

export async function updateCustomer(
  token: string,
  id: string,
  data: CustomerFormData
): Promise<void> {
  await apiFetch(`/api/customers/${id}`, {
    method: 'PATCH',
    headers: authHeaders(token),
    body: JSON.stringify(data),
  });
}

export async function deleteCustomer(token: string, id: string): Promise<void> {
  await apiFetch(`/api/customers/${id}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
}

// ── Client photos (before / after) ──────────────────────────────────────────────

export interface ClientPhotoDTO {
  id: string;
  customerId: string;
  type: 'before' | 'after';
  caption: string;
  url: string;
  createdAt: string | null;
}

export async function fetchClientPhotos(token: string, customerId: string): Promise<ClientPhotoDTO[]> {
  const result = await apiFetch<{ photos: ClientPhotoDTO[] }>(
    `/api/photos?customerId=${encodeURIComponent(customerId)}`,
    { headers: authHeaders(token) }
  );
  return result.photos;
}

export async function uploadClientPhoto(
  token: string,
  input: {
    customerId: string;
    type: 'before' | 'after';
    caption?: string;
    base64: string;
    contentType?: string;
  }
): Promise<string> {
  const result = await apiFetch<{ data: { id: string } }>('/api/photos', {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(input),
  });
  return result.data.id;
}

export async function deleteClientPhoto(token: string, id: string): Promise<void> {
  await apiFetch(`/api/photos?id=${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
}

// ── Treatment recipes ────────────────────────────────────────────────────────────

export interface RecipeDTO {
  serviceId: string;
  steps: { text: string; minutes?: number }[];
  products: string[];
  deviceSettings: string;
  contraindications: string;
  aftercare: string;
}

export async function fetchRecipe(token: string, serviceId: string): Promise<RecipeDTO> {
  const result = await apiFetch<{ recipe: RecipeDTO }>(
    `/api/recipes?serviceId=${encodeURIComponent(serviceId)}`,
    { headers: authHeaders(token) }
  );
  return result.recipe;
}

// ── Booking assistant (agent) ─────────────────────────────────────────────────────

export interface AgentChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AgentPendingAction {
  tool: string;
  arguments: string;
}

export interface AgentResponse {
  reply: string;
  toolCalls: { name: string; arguments: string }[];
  pendingAction?: AgentPendingAction;
}

export async function sendAgentMessage(
  token: string,
  message: string,
  history: AgentChatMessage[]
): Promise<AgentResponse> {
  return apiFetch<AgentResponse>('/api/agent', {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ message, history }),
  });
}

export async function confirmAgentAction(
  token: string,
  action: AgentPendingAction
): Promise<{ success: boolean; mutated?: boolean }> {
  return apiFetch('/api/agent/confirm', {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(action),
  });
}

// ── Push notifications ──────────────────────────────────────────────────────────

export async function registerPushToken(token: string, expoToken: string): Promise<void> {
  await apiFetch('/api/push/register', {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ token: expoToken }),
  });
}

// ── Admin utilities ───────────────────────────────────────────────────────────

export async function runCustomerMigration(token: string): Promise<{
  customersCreated: number;
  customersUpdated: number;
  appointmentsLinked: number;
  emailsProcessed: number;
}> {
  return apiFetch('/api/admin/migrate-customers', {
    method: 'POST',
    headers: authHeaders(token),
  });
}
