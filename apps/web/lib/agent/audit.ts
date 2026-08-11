/**
 * Audit trail for the booking assistant. Every run is recorded (who, when, the
 * request, and each tool the model called with its args + result), so agent
 * actions are traceable. Best-effort — never throws into the request path.
 */
import { Timestamp } from 'firebase-admin/firestore';
import { getAdminDb } from '@/lib/firebase/admin';
import type { AgentToolCall } from '@/lib/agent/booking-agent';

const COLLECTION = 'agentAudit';

/** Tools that change data — flagged on the audit record for quick filtering. */
const WRITE_TOOLS = new Set(['create_appointment', 'update_appointment', 'delete_appointment']);

export async function logAgentRun(input: {
  actor: string; // admin email or 'unknown'
  message: string;
  toolCalls: AgentToolCall[];
  replyPreview: string;
}): Promise<void> {
  try {
    await getAdminDb()
      .collection(COLLECTION)
      .add({
        actor: input.actor,
        message: input.message.slice(0, 500),
        tools: input.toolCalls.map((t) => ({
          name: t.name,
          arguments: (t.arguments ?? '').slice(0, 600),
          result: t.result ?? '',
          write: WRITE_TOOLS.has(t.name),
        })),
        mutated: input.toolCalls.some((t) => WRITE_TOOLS.has(t.name)),
        replyPreview: input.replyPreview.slice(0, 300),
        createdAt: Timestamp.now(),
      });
  } catch (error) {
    console.error('[agent-audit] failed to log run:', error);
  }
}
