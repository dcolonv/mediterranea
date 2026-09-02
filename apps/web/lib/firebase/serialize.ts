/**
 * Make Firestore data safe to pass from Server Components / Server Actions to
 * Client Components. Next.js rejects class instances (like Firestore
 * `Timestamp`) across that boundary — only plain objects are allowed.
 *
 * We detect Timestamps by duck-typing (a `toMillis`/`toDate` method or the
 * internal `_seconds` field) rather than `instanceof`, which can fail when more
 * than one copy of the firebase modules is resolved. Each Timestamp becomes a
 * plain `{ seconds, nanoseconds }` object, keeping `.seconds` readable by the UI.
 * Recurses through plain objects and arrays; leaves other built-ins (Date) alone.
 */
export function serializeDoc<T>(data: T): T {
  return serialize(data) as T;
}

function isTimestampLike(v: unknown): v is {
  seconds?: number;
  _seconds?: number;
  nanoseconds?: number;
  _nanoseconds?: number;
} {
  if (typeof v !== 'object' || v === null) return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.toMillis === 'function' ||
    typeof o.toDate === 'function' ||
    typeof o._seconds === 'number' ||
    (typeof o.seconds === 'number' && typeof o.nanoseconds === 'number')
  );
}

function serialize(value: unknown): unknown {
  if (value === null || typeof value !== 'object') return value;

  if (isTimestampLike(value)) {
    const t = value as {
      seconds?: number;
      _seconds?: number;
      nanoseconds?: number;
      _nanoseconds?: number;
    };
    return {
      seconds: t.seconds ?? t._seconds ?? 0,
      nanoseconds: t.nanoseconds ?? t._nanoseconds ?? 0,
    };
  }

  if (Array.isArray(value)) return value.map(serialize);

  // Only recurse into plain objects; leave other class instances (e.g. Date) as-is.
  const proto = Object.getPrototypeOf(value);
  if (proto === Object.prototype || proto === null) {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      out[key] = serialize(val);
    }
    return out;
  }

  return value;
}
