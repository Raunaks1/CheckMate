/** Manual payload guards for socket events (no validation dependency). */

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** String with 1..maxLen chars, else null. */
export function asBoundedString(value: unknown, maxLen: number): string | null {
  if (typeof value !== 'string') return null;
  if (value.length < 1 || value.length > maxLen) return null;
  return value;
}

/** Optional string capped at maxLen (null/undefined pass through as null). */
export function asOptionalString(value: unknown, maxLen: number): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string' || value.length > maxLen) return null;
  return value;
}

/**
 * Strict optional string: absent (null/undefined) is ok, present must be a
 * string within maxLen. Distinguishes "missing" from "malformed".
 */
export function parseOptionalString(
  value: unknown,
  maxLen: number
): { ok: true; value: string | null } | { ok: false } {
  if (value === null || value === undefined) return { ok: true, value: null };
  if (typeof value !== 'string' || value.length > maxLen) return { ok: false };
  return { ok: true, value };
}

export function asBoolean(value: unknown): boolean | null {
  return typeof value === 'boolean' ? value : null;
}
