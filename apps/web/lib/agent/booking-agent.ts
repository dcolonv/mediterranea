/**
 * Booking agent — OpenAI Responses API with a function-calling loop.
 *
 * The model is the decision maker: it reads rooms / services / staff / the
 * calendar through tools and chooses when and how to book. Correctness lives in
 * the tools — create/update run a transactional conflict check server-side — so
 * the model can never produce a double-booking.
 */
import OpenAI from 'openai';
import { tools, executeTool } from '@/lib/agent/tools';

const MODEL = process.env.OPENAI_AGENT_MODEL || 'gpt-5.6';

export interface AgentMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AgentToolCall {
  name: string;
  arguments: string;
  /** Compact JSON of the tool's result (truncated), for the audit log. */
  result?: string;
}

/** A create/update/delete the agent proposed and is awaiting human confirmation on. */
export interface PendingAction {
  tool: string;
  arguments: string;
}

export interface AgentResult {
  reply: string;
  toolCalls: AgentToolCall[];
  /** Set when the agent proposed a write that needs confirmation before executing. */
  pendingAction?: PendingAction;
}

/** Tools that change data — gated behind human confirmation when proposeWrites is on. */
export const WRITE_TOOLS = new Set(['create_appointment', 'update_appointment', 'delete_appointment']);

function buildInstructions(today: string): string {
  return [
    'You are the scheduling assistant for Mediterránea Face Studio, used by studio staff in the backoffice.',
    `Today is ${today}. All dates are YYYY-MM-DD and all times are HH:MM in 24-hour format.`,
    '',
    'The studio has services (treatments), staff (practitioners with working hours and the services they are qualified for), and rooms (each with a type). A service may require a specific room type.',
    '',
    'How to book an appointment:',
    '1. Identify the service with list_services or get_service.',
    '2. Call find_availability with the serviceId and date (and a staffId if the client asked for a specific practitioner). It returns open start times, each with the staff and rooms free for that slot.',
    '3. Choose a returned time, and a staffId and roomId that find_availability listed as free for that time. For "any practitioner", pick the first free qualified staff member.',
    '4. Make sure you have the client name, email, and phone. If any is missing, ask for it before booking — do not invent contact details.',
    '5. Call create_appointment. It re-checks the calendar transactionally and will reject a conflict; if it does, call find_availability again and offer real alternatives.',
    '',
    'Other rules:',
    '- Never invent availability, staff, rooms, or services — only use what the tools return.',
    '- Respect staff qualifications and room types; the tools enforce both.',
    '- To cancel, prefer update_appointment with status "cancelled". Only use delete_appointment when a hard delete is explicitly requested.',
    '- To reschedule or reassign, use update_appointment.',
    '- Be concise. After acting, confirm what you did: service, date, time, practitioner, and room.',
    '- If a request is ambiguous or missing information, ask one short clarifying question instead of guessing.',
    '',
    'Confirmation: creating, updating, or deleting an appointment requires the user to confirm first. When you call one of those tools it returns "awaiting_confirmation" — do NOT call it again. Instead, clearly summarize the exact action (service, date, time, practitioner, room, and client) and ask the user to confirm.',
  ].join('\n');
}

export async function runBookingAgent(
  messages: AgentMessage[],
  opts: { today: string; maxToolTurns?: number; proposeWrites?: boolean }
): Promise<AgentResult> {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const maxTurns = opts.maxToolTurns ?? 8;
  const proposeWrites = opts.proposeWrites ?? true;

  const input: OpenAI.Responses.ResponseInput = messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));
  const toolCalls: AgentToolCall[] = [];
  let pendingAction: PendingAction | undefined;

  for (let turn = 0; turn <= maxTurns; turn++) {
    const response = await client.responses.create({
      model: MODEL,
      instructions: buildInstructions(opts.today),
      tools: tools as unknown as OpenAI.Responses.Tool[],
      input,
    });

    // Feed the model's output back as input for the next turn. The SDK's output
    // and input item unions differ only in a narrow status-enum, so cast at the
    // boundary — this is the documented "append the full output array" pattern.
    input.push(...(response.output as unknown as OpenAI.Responses.ResponseInputItem[]));

    const calls = response.output.filter(
      (item): item is OpenAI.Responses.ResponseFunctionToolCall => item.type === 'function_call'
    );

    if (calls.length === 0) {
      return { reply: response.output_text ?? '', toolCalls, pendingAction };
    }

    for (const call of calls) {
      let args: Record<string, unknown> = {};
      try {
        args = JSON.parse(call.arguments || '{}');
      } catch {
        args = {};
      }

      // Gate writes behind human confirmation: don't execute — capture the
      // proposal and return a synthetic result so the model asks the user.
      if (proposeWrites && WRITE_TOOLS.has(call.name)) {
        if (!pendingAction) pendingAction = { tool: call.name, arguments: call.arguments };
        const synthetic = {
          status: 'awaiting_confirmation',
          note: 'Not performed yet. Summarize the action and ask the user to confirm; do not call this tool again.',
        };
        const syntheticJson = JSON.stringify(synthetic);
        toolCalls.push({ name: call.name, arguments: call.arguments, result: syntheticJson });
        input.push({ type: 'function_call_output', call_id: call.call_id, output: syntheticJson });
        continue;
      }

      const result = await executeTool(call.name, args);
      const resultJson = JSON.stringify(result);
      toolCalls.push({
        name: call.name,
        arguments: call.arguments,
        result: resultJson.length > 600 ? `${resultJson.slice(0, 600)}…` : resultJson,
      });
      input.push({
        type: 'function_call_output',
        call_id: call.call_id,
        output: resultJson,
      });
    }
  }

  return {
    reply: 'I could not complete that within the allowed number of steps. Please try rephrasing the request.',
    toolCalls,
    pendingAction,
  };
}
