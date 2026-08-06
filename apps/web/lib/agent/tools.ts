/**
 * OpenAI function tools for the booking agent.
 *
 * `tools` is the flat Responses-API tool spec array; `executeTool` dispatches a
 * tool call to the deterministic data layer and returns a compact,
 * JSON-serializable result (Firestore Timestamps stripped to keep tokens low).
 */
import * as data from '@/lib/agent/data';
import type { Service, Staff, Room, Appointment } from '@mediterranea/shared/types';

export interface ToolSpec {
  type: 'function';
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  strict: boolean;
}

const STATUS_ENUM = ['pending', 'confirmed', 'checked-in', 'completed', 'cancelled', 'no-show'];

export const tools: ToolSpec[] = [
  {
    type: 'function',
    name: 'list_rooms',
    description: 'List treatment rooms and their types. Use to find a room that matches a service’s required room type.',
    parameters: { type: 'object', properties: {}, additionalProperties: false },
    strict: false,
  },
  {
    type: 'function',
    name: 'list_services',
    description: 'List treatments the studio offers (name, category, duration, price, required room type).',
    parameters: {
      type: 'object',
      properties: {
        includeInactive: { type: 'boolean', description: 'Include inactive services (default false).' },
      },
      additionalProperties: false,
    },
    strict: false,
  },
  {
    type: 'function',
    name: 'get_service',
    description: 'Get a single service by its id or slug.',
    parameters: {
      type: 'object',
      properties: { idOrSlug: { type: 'string' } },
      required: ['idOrSlug'],
      additionalProperties: false,
    },
    strict: true,
  },
  {
    type: 'function',
    name: 'list_staff',
    description: 'List practitioners with their roles, working hours, and the service ids each is qualified to perform.',
    parameters: { type: 'object', properties: {}, additionalProperties: false },
    strict: false,
  },
  {
    type: 'function',
    name: 'get_staff_services',
    description: 'List the services a given staff member is qualified to perform.',
    parameters: {
      type: 'object',
      properties: { staffId: { type: 'string' } },
      required: ['staffId'],
      additionalProperties: false,
    },
    strict: true,
  },
  {
    type: 'function',
    name: 'get_service_staff',
    description: 'List active staff qualified to perform a given service.',
    parameters: {
      type: 'object',
      properties: { serviceId: { type: 'string' } },
      required: ['serviceId'],
      additionalProperties: false,
    },
    strict: true,
  },
  {
    type: 'function',
    name: 'list_appointments',
    description: 'Query the calendar. Filter by a single date, a date range, staff, room, and/or status. Dates are YYYY-MM-DD, times HH:MM (24h).',
    parameters: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'Exact day, YYYY-MM-DD.' },
        startDate: { type: 'string', description: 'Range start (inclusive), YYYY-MM-DD.' },
        endDate: { type: 'string', description: 'Range end (inclusive), YYYY-MM-DD.' },
        staffId: { type: 'string' },
        roomId: { type: 'string' },
        status: { type: 'string', enum: STATUS_ENUM },
      },
      additionalProperties: false,
    },
    strict: false,
  },
  {
    type: 'function',
    name: 'get_appointment',
    description: 'Fetch a single appointment by id.',
    parameters: {
      type: 'object',
      properties: { appointmentId: { type: 'string' } },
      required: ['appointmentId'],
      additionalProperties: false,
    },
    strict: true,
  },
  {
    type: 'function',
    name: 'find_availability',
    description:
      'Compute bookable start times for a service on a date. Returns each open slot with the staff and rooms free for it. Optionally restrict to one staff member. ALWAYS call this before create_appointment and pick a returned time + a staffId and roomId listed as free for it.',
    parameters: {
      type: 'object',
      properties: {
        serviceId: { type: 'string' },
        date: { type: 'string', description: 'YYYY-MM-DD.' },
        staffId: { type: 'string', description: 'Restrict to this practitioner. Omit for any qualified staff.' },
      },
      required: ['serviceId', 'date'],
      additionalProperties: false,
    },
    strict: false,
  },
  {
    type: 'function',
    name: 'create_appointment',
    description:
      'Book an appointment. The time/staff/room must come from a free slot returned by find_availability. A transactional conflict check runs server-side and will reject a double-booking.',
    parameters: {
      type: 'object',
      properties: {
        serviceId: { type: 'string' },
        date: { type: 'string', description: 'YYYY-MM-DD.' },
        time: { type: 'string', description: 'HH:MM (24h) start time.' },
        staffId: { type: 'string' },
        roomId: { type: 'string' },
        clientName: { type: 'string' },
        clientEmail: { type: 'string' },
        clientPhone: { type: 'string' },
        notes: { type: 'string' },
      },
      required: ['serviceId', 'date', 'time', 'staffId', 'roomId', 'clientName', 'clientEmail', 'clientPhone'],
      additionalProperties: false,
    },
    strict: false,
  },
  {
    type: 'function',
    name: 'update_appointment',
    description:
      'Reschedule (date/time), reassign (staff/room), change status, or edit notes of an existing appointment. Scheduling changes re-run the conflict check.',
    parameters: {
      type: 'object',
      properties: {
        appointmentId: { type: 'string' },
        date: { type: 'string', description: 'YYYY-MM-DD.' },
        time: { type: 'string', description: 'HH:MM (24h).' },
        staffId: { type: 'string' },
        roomId: { type: 'string' },
        status: { type: 'string', enum: STATUS_ENUM },
        notes: { type: 'string' },
      },
      required: ['appointmentId'],
      additionalProperties: false,
    },
    strict: false,
  },
  {
    type: 'function',
    name: 'delete_appointment',
    description: 'Permanently delete an appointment by id. Prefer setting status to "cancelled" via update_appointment unless a hard delete is explicitly requested.',
    parameters: {
      type: 'object',
      properties: { appointmentId: { type: 'string' } },
      required: ['appointmentId'],
      additionalProperties: false,
    },
    strict: true,
  },
];

// ── Compact serializers (drop Timestamps / verbose fields) ───────────────────────

function service(s: Service) {
  return {
    id: s.id,
    name: s.name,
    slug: s.slug,
    category: s.category,
    durationMinutes: s.durationMinutes,
    price: s.price,
    isActive: s.isActive,
    roomType: s.roomType ?? null,
  };
}

function staff(s: Staff) {
  return {
    id: s.id,
    name: s.name,
    role: s.role,
    active: s.active,
    serviceIds: s.serviceIds,
    workingHours: s.workingHours,
    timeOff: s.timeOff ?? [],
  };
}

function room(r: Room) {
  return { id: r.id, name: r.name, type: r.type, isActive: r.isActive };
}

function appointment(a: Appointment) {
  return {
    id: a.id,
    serviceId: a.serviceId,
    serviceName: a.serviceName,
    clientName: a.clientName,
    clientEmail: a.clientEmail,
    clientPhone: a.clientPhone,
    staffId: a.staffId ?? null,
    roomId: a.roomId ?? null,
    date: a.appointmentDate,
    time: a.appointmentTime,
    durationMinutes: a.durationMinutes,
    status: a.status,
    notes: a.notes ?? '',
  };
}

type Args = Record<string, unknown>;

export async function executeTool(name: string, args: Args): Promise<unknown> {
  switch (name) {
    case 'list_rooms':
      return (await data.listRooms(true)).map(room);

    case 'list_services':
      return (await data.listServices(Boolean(args.includeInactive))).map(service);

    case 'get_service': {
      const s = await data.getService(String(args.idOrSlug));
      return s ? service(s) : { error: 'Service not found.' };
    }

    case 'list_staff':
      return (await data.listStaff(true)).map(staff);

    case 'get_staff_services':
      return (await data.getStaffServices(String(args.staffId))).map(service);

    case 'get_service_staff':
      return (await data.getServiceStaff(String(args.serviceId))).map(staff);

    case 'list_appointments':
      return (
        await data.listAppointments({
          date: args.date as string | undefined,
          startDate: args.startDate as string | undefined,
          endDate: args.endDate as string | undefined,
          staffId: args.staffId as string | undefined,
          roomId: args.roomId as string | undefined,
          status: args.status as never,
        })
      ).map(appointment);

    case 'get_appointment': {
      const a = await data.getAppointment(String(args.appointmentId));
      return a ? appointment(a) : { error: 'Appointment not found.' };
    }

    case 'find_availability':
      return data.findAvailability({
        serviceId: String(args.serviceId),
        date: String(args.date),
        staffId: args.staffId as string | undefined,
      });

    case 'create_appointment':
      return data.createAppointment({
        serviceId: String(args.serviceId),
        date: String(args.date),
        time: String(args.time),
        staffId: String(args.staffId),
        roomId: String(args.roomId),
        clientName: String(args.clientName),
        clientEmail: String(args.clientEmail),
        clientPhone: String(args.clientPhone),
        notes: args.notes as string | undefined,
      });

    case 'update_appointment':
      return data.updateAppointment(String(args.appointmentId), {
        date: args.date as string | undefined,
        time: args.time as string | undefined,
        staffId: args.staffId as string | undefined,
        roomId: args.roomId as string | undefined,
        status: args.status as never,
        notes: args.notes as string | undefined,
      });

    case 'delete_appointment':
      return data.deleteAppointment(String(args.appointmentId));

    default:
      return { error: `Unknown tool: ${name}` };
  }
}
