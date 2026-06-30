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
