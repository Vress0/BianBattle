"use client";
import { useState } from "react";
import Avatar from "@/components/ui/Avatar";

interface Props {
  inviteId: string;
  inviterNickname: string | null;
  inviterAvatarUrl: string | null;
  mode: string;
  topic: string;
  myRole: string;
  expiresAt: string;
  onAccepted: (matchId: string) => void;
  onRejected: () => void;
}

function timeRemaining(expiresAt: string): string {
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return "已過期";
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}:${String(seconds).padStart(2, "0")} 後過期`;
}

export default function BattleInviteCard({
  inviteId,
  inviterNickname,
  inviterAvatarUrl,
  mode,
  topic,
  myRole,
  expiresAt,
  onAccepted,
  onRejected,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const isExpired = new Date(expiresAt) < new Date();
  const inviterName = inviterNickname ?? "未知玩家";

  async function handleAction(action: "accept" | "reject") {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/battle-invites/${inviteId}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = (await res.json()) as { ok?: boolean; matchId?: string; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "操作失敗，請稍後再試");
      } else if (action === "accept" && data.matchId) {
        setDone(true);
        onAccepted(data.matchId);
      } else {
        setDone(true);
        onRejected();
      }
    } catch {
      setError("網路錯誤，請稍後再試");
    } finally {
      setLoading(false);
    }
  }

  if (done) return null;

  return (
    <div className="rounded-xl border border-violet-900/50 bg-violet-950/20 p-4">
      <div className="flex items-start gap-3">
        <Avatar src={inviterAvatarUrl} name={inviterName} size="md" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-white">{inviterName}</p>
          <p className="mt-0.5 text-xs text-slate-400">
            邀請你進行 {mode === "debate" ? "⚖️ 辯論" : "🔥 嘴砲"}
          </p>
          <p className="mt-1 text-sm text-slate-200">辯題：{topic}</p>
          <p className="mt-0.5 text-xs text-slate-400">
            你的立場：<span className="font-medium text-violet-300">{myRole}</span>
          </p>
          {!isExpired && (
            <p className="mt-0.5 text-xs text-slate-600">{timeRemaining(expiresAt)}</p>
          )}
          {isExpired && (
            <p className="mt-0.5 text-xs text-red-400">邀請已過期</p>
          )}
        </div>
      </div>

      {error && (
        <p className="mt-2 rounded bg-red-900/30 px-2 py-1 text-xs text-red-400">{error}</p>
      )}

      {!isExpired && (
        <div className="mt-3 flex gap-2">
          <button
            onClick={() => handleAction("accept")}
            disabled={loading}
            className="flex-1 rounded-lg bg-violet-600 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-violet-500 disabled:opacity-50"
          >
            {loading ? "處理中…" : "接受約戰"}
          </button>
          <button
            onClick={() => handleAction("reject")}
            disabled={loading}
            className="rounded-lg border border-slate-600 px-3 py-1.5 text-xs text-slate-300 transition-colors hover:bg-slate-700 disabled:opacity-50"
          >
            拒絕
          </button>
        </div>
      )}
    </div>
  );
}
