import { Timestamp } from 'firebase-admin/firestore';
import { getAdminDb } from '@/lib/firebase/admin';
import type { AgentMessage } from '@/lib/agent/booking-agent';

/**
 * Conversation memory for the ATOM Echo.
 *
 * The device generates a random session id at boot and sends it with every
 * request, so a conversation lasts until the device restarts — or until the
 * user says a reset command.
 *
 * Stored in Firestore rather than server memory: Vercel's serverless functions
 * don't share memory between invocations, so an in-memory map would silently
 * forget between presses in production.
 */

const COLLECTION = 'atomConversations';

/**
 * Turns kept, counting user and assistant separately. Bounds the tokens sent to
 * the agent on every press; the oldest turns drop off first.
 */
export const MAX_HISTORY = 20;

/**
 * Storage cleanup only — not a conversation timeout. It's refreshed on every
 * turn, so an active session never expires; this reclaims the history of
 * sessions abandoned when the device rebooted. Enforced by a Firestore TTL
 * policy on `expiresAt`, if one is enabled.
 */
const RETENTION_DAYS = 7;

/** 16 lowercase hex characters, as the firmware generates them. */
export function isValidSessionId(id: string | null | undefined): id is string {
  return typeof id === 'string' && /^[0-9a-f]{16}$/.test(id);
}

// ── Reset command ────────────────────────────────────────────────────────────

/** Lowercased, accents and punctuation stripped — transcripts vary all three. */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Phrases that end the conversation, in both studio languages. */
const RESET_PHRASES = [
  'nueva conversacion',
  'empezar de nuevo',
  'empecemos de nuevo',
  'reiniciar conversacion',
  'borrar conversacion',
  'olvida todo',
  'new conversation',
  'start over',
  'reset conversation',
  'clear conversation',
  'forget everything',
].map(normalize);

/**
 * Longest utterance still treated as a command. "Start over, please" resets;
 * "I'd like to start over my facial plan next week" is a question that happens
 * to contain the phrase, and must reach the agent.
 */
const MAX_COMMAND_WORDS = 6;

export function isResetCommand(transcript: string): boolean {
  const text = normalize(transcript);
  if (!text) return false;
  if (text.split(' ').length > MAX_COMMAND_WORDS) return false;
  return RESET_PHRASES.some((phrase) => text.includes(phrase));
}

// ── History ──────────────────────────────────────────────────────────────────

/** Keep the most recent turns, never starting on an assistant reply. */
export function trimHistory(messages: AgentMessage[], max = MAX_HISTORY): AgentMessage[] {
  if (messages.length <= max) return messages;
  const recent = messages.slice(-max);
  // A history that opens mid-exchange with the agent's reply reads oddly to the
  // model; drop the orphan so it starts on a question.
  return recent[0]?.role === 'assistant' ? recent.slice(1) : recent;
}

interface StoredConversation {
  messages: AgentMessage[];
  updatedAt: Timestamp;
  expiresAt: Timestamp;
}

function expiry(): Timestamp {
  return Timestamp.fromMillis(Date.now() + RETENTION_DAYS * 86_400_000);
}

export async function loadConversation(sessionId: string): Promise<AgentMessage[]> {
  const snap = await getAdminDb().collection(COLLECTION).doc(sessionId).get();
  if (!snap.exists) return [];
  const data = snap.data() as Partial<StoredConversation>;
  return Array.isArray(data.messages) ? data.messages : [];
}

export async function saveConversation(sessionId: string, messages: AgentMessage[]): Promise<void> {
  const now = Timestamp.now();
  await getAdminDb()
    .collection(COLLECTION)
    .doc(sessionId)
    .set({ messages: trimHistory(messages), updatedAt: now, expiresAt: expiry() });
}

export async function clearConversation(sessionId: string): Promise<void> {
  await getAdminDb().collection(COLLECTION).doc(sessionId).delete();
}
