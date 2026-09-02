import { Timestamp } from 'firebase-admin/firestore';

/**
 * Convert Firestore Admin `Timestamp` instances in a document's data to a plain
 * `{ seconds, nanoseconds }` object so the doc can be passed from a Server
 * Component / Server Action to a Client Component (class instances can't cross
 * that boundary). The plain shape keeps `.seconds` readable by existing UIs.
 * Shallow — our docs only hold Timestamps at the top level (createdAt/updatedAt).
 */
export function serializeDoc<T>(data: T): T {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    out[key] =
      value instanceof Timestamp
        ? { seconds: value.seconds, nanoseconds: value.nanoseconds }
        : value;
  }
  return out as T;
}
