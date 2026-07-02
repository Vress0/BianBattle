export interface DirectMessage {
  id: string;
  sender_id: string;
  body: string | null;
  created_at: string;
  deleted_at: string | null;
}

/**
 * Deduplicate a single messages array.
 * When the same id appears multiple times, the LAST occurrence wins
 * (most recently received data). Sorted by created_at ASC.
 */
export function dedupeMessages(messages: DirectMessage[]): DirectMessage[] {
  const map = new Map<string, DirectMessage>();
  for (const m of messages) {
    map.set(m.id, m);
  }
  return Array.from(map.values()).sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
}

/**
 * Merge prev + incoming into a single deduplicated, sorted array.
 * `incoming` takes precedence over `prev` for the same id — so Realtime
 * updates, polling refreshes, and send-API responses all correctly overwrite
 * local state (e.g. applying deleted_at from the server).
 */
export function mergeMessages(
  prev: DirectMessage[],
  incoming: DirectMessage[]
): DirectMessage[] {
  const map = new Map<string, DirectMessage>();
  for (const m of prev) map.set(m.id, m);
  for (const m of incoming) map.set(m.id, m); // incoming wins for same id
  return Array.from(map.values()).sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
}
