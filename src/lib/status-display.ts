export type UserEffectiveStatus = "online" | "in_match" | "idle" | "offline";

export interface UserStatusRow {
  status: string;
  current_match_id: string | null;
  current_mode: string | null;
  last_seen_at: string;
}

const OFFLINE_THRESHOLD_SECONDS = 90;

export function getEffectiveUserStatus(
  row: UserStatusRow | null | undefined
): UserEffectiveStatus {
  if (!row) return "offline";
  const elapsedSeconds = (Date.now() - new Date(row.last_seen_at).getTime()) / 1000;
  if (elapsedSeconds > OFFLINE_THRESHOLD_SECONDS) return "offline";
  if (row.status === "in_match") return "in_match";
  if (row.status === "idle") return "idle";
  return "online";
}

export function getStatusLabel(status: UserEffectiveStatus): string {
  switch (status) {
    case "online":   return "在線";
    case "in_match": return "對局中";
    case "idle":     return "閒置";
    case "offline":  return "離線";
  }
}

export function getStatusIcon(status: UserEffectiveStatus): string {
  switch (status) {
    case "online":   return "🟢";
    case "in_match": return "⚔️";
    case "idle":     return "🟡";
    case "offline":  return "⚫";
  }
}

export function getStatusBadgeClass(status: UserEffectiveStatus): string {
  switch (status) {
    case "online":   return "text-green-400";
    case "in_match": return "text-amber-400";
    case "idle":     return "text-yellow-400";
    case "offline":  return "text-slate-500";
  }
}
