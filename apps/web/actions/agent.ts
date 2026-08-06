'use server';

import { runBookingAgent, type AgentMessage } from '@/lib/agent/booking-agent';

/** Names of tools that mutate the calendar — the UI refreshes when any run. */
const WRITE_TOOLS = new Set(['create_appointment', 'update_appointment', 'delete_appointment']);

function todayInMalaga(): string {
  // The studio operates in Europe/Madrid; anchor "today" there.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Madrid',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

export interface AgentTurnResult {
  success: boolean;
  reply?: string;
  /** Human-readable summary of the tools the agent ran this turn. */
  actions?: string[];
  /** True when the agent created/updated/deleted an appointment. */
  mutated?: boolean;
  error?: string;
}

export async function sendAgentMessage(input: {
  message: string;
  history?: AgentMessage[];
}): Promise<AgentTurnResult> {
  if (!input.message?.trim()) {
    return { success: false, error: 'A message is required.' };
  }

  if (!process.env.OPENAI_API_KEY) {
    return {
      success: false,
      error: 'The booking assistant is not configured (missing OPENAI_API_KEY).',
    };
  }

  const history = (input.history ?? []).filter(
    (m) => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string'
  );

  const messages: AgentMessage[] = [...history, { role: 'user', content: input.message }];

  try {
    const result = await runBookingAgent(messages, { today: todayInMalaga() });
    return {
      success: true,
      reply: result.reply,
      actions: result.toolCalls.map((c) => summarizeToolCall(c.name, c.arguments)),
      mutated: result.toolCalls.some((c) => WRITE_TOOLS.has(c.name)),
    };
  } catch (e) {
    console.error('Agent run failed:', e);
    return { success: false, error: 'The booking assistant hit an error. Please try again.' };
  }
}

function summarizeToolCall(name: string, argsJson: string): string {
  let args: Record<string, unknown> = {};
  try {
    args = JSON.parse(argsJson || '{}');
  } catch {
    /* ignore */
  }
  switch (name) {
    case 'find_availability':
      return `Checked availability${args.date ? ` for ${args.date}` : ''}`;
    case 'create_appointment':
      return `Booked ${args.clientName ?? 'an appointment'}${args.date ? ` on ${args.date}` : ''}${args.time ? ` at ${args.time}` : ''}`;
    case 'update_appointment':
      return `Updated an appointment${args.status ? ` → ${args.status}` : ''}`;
    case 'delete_appointment':
      return 'Deleted an appointment';
    case 'list_appointments':
      return 'Looked up the calendar';
    case 'list_services':
    case 'get_service':
      return 'Looked up services';
    case 'list_staff':
    case 'get_service_staff':
    case 'get_staff_services':
      return 'Looked up practitioners';
    case 'list_rooms':
      return 'Looked up rooms';
    default:
      return name.replace(/_/g, ' ');
  }
}
