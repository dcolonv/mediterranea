'use server';

import {
  runBookingAgent,
  WRITE_TOOLS,
  type AgentMessage,
  type PendingAction,
} from '@/lib/agent/booking-agent';
import { executeTool } from '@/lib/agent/tools';
import { logAgentRun } from '@/lib/agent/audit';
import { getBackofficeAdminEmail } from '@/lib/auth/backoffice';
import { allowAction } from '@/lib/rate-limit';

/** Assistant usage cap: requests per admin per window. */
const AGENT_LIMIT = 30;
const AGENT_WINDOW_SECONDS = 5 * 60;

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
  /** A proposed write the user must confirm before it executes. */
  pendingAction?: PendingAction;
  /** One-line description of the pending action for the confirm prompt. */
  pendingSummary?: string;
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

  const actor = (await getBackofficeAdminEmail()) ?? 'backoffice';

  // Usage cap per admin.
  if (!(await allowAction(`agent:${actor}`, AGENT_LIMIT, AGENT_WINDOW_SECONDS))) {
    return {
      success: false,
      error: 'You’re sending messages too quickly. Please wait a moment and try again.',
    };
  }

  const history = (input.history ?? []).filter(
    (m) => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string'
  );

  const messages: AgentMessage[] = [...history, { role: 'user', content: input.message }];

  try {
    const result = await runBookingAgent(messages, { today: todayInMalaga() });
    // Record the run (best-effort).
    logAgentRun({
      actor,
      message: input.message,
      toolCalls: result.toolCalls,
      replyPreview: result.reply,
    }).catch(() => {});
    return {
      success: true,
      reply: result.reply,
      actions: result.toolCalls
        .filter((c) => !WRITE_TOOLS.has(c.name)) // proposed writes aren't "done" yet
        .map((c) => summarizeToolCall(c.name, c.arguments)),
      mutated: false, // writes only happen after confirmation
      ...(result.pendingAction && {
        pendingAction: result.pendingAction,
        pendingSummary: summarizeToolCall(
          result.pendingAction.tool,
          result.pendingAction.arguments
        ),
      }),
    };
  } catch (e) {
    console.error('Agent run failed:', e);
    return { success: false, error: 'The booking assistant hit an error. Please try again.' };
  }
}

/** Execute a previously-proposed agent write after the user confirms it. */
export async function confirmAgentAction(action: PendingAction): Promise<{
  success: boolean;
  message?: string;
  mutated?: boolean;
  error?: string;
}> {
  if (!action?.tool || !WRITE_TOOLS.has(action.tool)) {
    return { success: false, error: 'Nothing to confirm.' };
  }

  const actor = (await getBackofficeAdminEmail()) ?? 'backoffice';
  if (!(await allowAction(`agent-confirm:${actor}`, 30, 5 * 60))) {
    return { success: false, error: 'Too many actions. Please wait a moment.' };
  }

  let args: Record<string, unknown> = {};
  try {
    args = JSON.parse(action.arguments || '{}');
  } catch {
    return { success: false, error: 'Could not read the proposed action.' };
  }

  try {
    // executeTool performs the real write here (with the transactional guard).
    const result = (await executeTool(action.tool, args)) as { success?: boolean; error?: string };
    logAgentRun({
      actor,
      message: `[confirmed] ${action.tool}`,
      toolCalls: [{ name: action.tool, arguments: action.arguments, result: JSON.stringify(result) }],
      replyPreview: result.success ? 'confirmed + executed' : `failed: ${result.error ?? ''}`,
    }).catch(() => {});

    if (result.success === false) {
      return { success: false, error: result.error ?? 'The action could not be completed.' };
    }
    return { success: true, mutated: true, message: 'Done.' };
  } catch (e) {
    console.error('confirmAgentAction failed:', e);
    return { success: false, error: 'The action could not be completed.' };
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
