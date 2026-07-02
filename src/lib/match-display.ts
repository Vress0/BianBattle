export const SIDE_LABELS: Record<string, string> = {
  pro: "正方",
  con: "反方",
};

export function getSideLabel(side: string): string {
  return SIDE_LABELS[side] ?? side;
}

export type UserMatchResultKey = "win" | "loss" | "unrated" | "cancelled" | "active";

export function getUserMatchResult(
  status: string,
  winnerSide: string | null,
  isRated: boolean,
  userSide: string | null
): UserMatchResultKey {
  if (status === "cancelled") return "cancelled";
  if (status === "waiting" || status === "active") return "active";
  if (!isRated || !winnerSide) return "unrated";
  if (winnerSide === userSide) return "win";
  return "loss";
}

export const MODE_LABELS: Record<string, string> = {
  debate: "辯論房",
  banter: "嘴砲房",
};

export const STATUS_LABELS: Record<string, string> = {
  waiting: "等待中",
  active: "對戰中",
  finished: "已結束",
  cancelled: "已取消",
};

export const ENDED_REASON_LABELS: Record<string, string> = {
  surrender: "認輸",
  timeout: "超時棄賽",
  grace_surrender: "開局 15 秒內認輸不計戰績",
  grace_leave: "開局 15 秒內離開不計戰績",
  cancelled: "比賽取消",
};

export function modeLabel(mode: string): string {
  return MODE_LABELS[mode] ?? mode;
}

export function modeHref(mode: string): string {
  return mode === "banter" ? "/rooms/banter" : "/rooms/debate";
}

export function statusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status;
}

export function endedReasonLabel(reason: string | null): string {
  if (!reason) return "未知原因";
  return ENDED_REASON_LABELS[reason] ?? "未知原因";
}

export function winnerSideLabel(winnerSide: string | null): string {
  if (winnerSide === "pro") return "正方獲勝";
  if (winnerSide === "con") return "反方獲勝";
  return "本場不計戰績";
}

export function formatDuration(
  startedAt: string | null,
  endedAt: string | null
): string | null {
  if (!startedAt || !endedAt) return null;
  const ms = new Date(endedAt).getTime() - new Date(startedAt).getTime();
  if (!Number.isFinite(ms) || ms < 0) return null;
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes > 0 ? `${minutes} 分 ${seconds} 秒` : `${seconds} 秒`;
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

// Shift any ISO timestamp to UTC+8 (Asia/Taipei) without using Intl/toLocale* APIs
// so the output is identical on both server and client (no hydration mismatch).
function toTaipei(iso: string): Date | null {
  const ms = new Date(iso).getTime();
  if (!Number.isFinite(ms)) return null;
  return new Date(ms + 8 * 60 * 60 * 1000);
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const t = toTaipei(iso);
  if (!t) return "—";
  return `${t.getUTCFullYear()}/${pad2(t.getUTCMonth() + 1)}/${pad2(t.getUTCDate())} ${pad2(t.getUTCHours())}:${pad2(t.getUTCMinutes())}`;
}

export function formatShortTime(iso: string | null | undefined): string {
  if (!iso) return "--:--";
  const t = toTaipei(iso);
  if (!t) return "--:--";
  return `${pad2(t.getUTCHours())}:${pad2(t.getUTCMinutes())}`;
}

// ─── Result symbol helpers ────────────────────────────────────────────────────

export function getResultSymbol(result: UserMatchResultKey): string {
  if (result === "win") return "○";
  if (result === "loss") return "✕";
  if (result === "active") return "…";
  return "－";
}

export function getResultSymbolClass(result: UserMatchResultKey): string {
  if (result === "win") return "text-green-400";
  if (result === "loss") return "text-red-400";
  if (result === "active") return "text-blue-400";
  return "text-slate-500";
}

export function getResultBgClass(result: UserMatchResultKey): string {
  if (result === "win") return "bg-green-900/40";
  if (result === "loss") return "bg-red-900/40";
  if (result === "active") return "bg-blue-900/40";
  return "bg-slate-800";
}

export function getResultAriaLabel(result: UserMatchResultKey): string {
  if (result === "win") return "勝利";
  if (result === "loss") return "失敗";
  if (result === "active") return "進行中";
  if (result === "cancelled") return "取消";
  return "不計分";
}

export interface RecentResultSummary {
  wins: number;
  losses: number;
  unrated: number;
  active: number;
  total: number;
}

export function getRecentResultSummary(records: UserMatchResultKey[]): RecentResultSummary {
  let wins = 0;
  let losses = 0;
  let unrated = 0;
  let active = 0;
  for (const r of records) {
    if (r === "win") wins++;
    else if (r === "loss") losses++;
    else if (r === "unrated" || r === "cancelled") unrated++;
    else if (r === "active") active++;
  }
  return { wins, losses, unrated, active, total: records.length };
}
