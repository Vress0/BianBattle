"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PRESET_TOPICS } from "@/lib/battle-invites";
import { useBattleInviteRealtime } from "@/hooks/useBattleInviteRealtime";

type Mode = "debate" | "banter";
type SidePick = "pro" | "con" | "random";
type ViewState = "form" | "pending" | "rejected" | "cancelled" | "expired";

interface SentInvite {
  inviteId: string;
  mode: Mode;
  topic: string;
  inviterSide: "pro" | "con";
  receiverSide: "pro" | "con";
  expiresAt: string;
}

interface Props {
  targetUserId: string;
  targetNickname: string;
  onClose: () => void;
}

export default function BattleInviteModal({ targetUserId, targetNickname, onClose }: Props) {
  const router = useRouter();

  // Form state
  const [mode, setMode] = useState<Mode>("debate");
  const [topic, setTopic] = useState("");
  const [sidePick, setSidePick] = useState<SidePick>("random");
  const [sending, setSending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Invite lifecycle state
  const [viewState, setViewState] = useState<ViewState>("form");
  const [sentInvite, setSentInvite] = useState<SentInvite | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [timeLeft, setTimeLeft] = useState("");

  // Countdown timer while pending
  useEffect(() => {
    if (viewState !== "pending" || !sentInvite) return;
    function tick() {
      const ms = new Date(sentInvite!.expiresAt).getTime() - Date.now();
      if (ms <= 0) { setTimeLeft("已過期"); return; }
      const m = Math.floor(ms / 60000);
      const s = Math.floor((ms % 60000) / 1000);
      setTimeLeft(`${m}:${String(s).padStart(2, "0")}`);
    }
    tick();
    const id = setInterval(tick, 1_000);
    return () => clearInterval(id);
  }, [viewState, sentInvite]);

  // Callbacks for realtime hook — stable refs via useCallback
  const handleAccepted = useCallback(
    (matchId: string) => router.push(`/matches/${matchId}`),
    [router]
  );
  const handleRejected = useCallback(() => setViewState("rejected"), []);
  const handleCancelled = useCallback(() => setViewState("cancelled"), []);
  const handleExpired = useCallback(() => setViewState("expired"), []);

  // Poll + Realtime while pending; inviteId=null disables the hook
  useBattleInviteRealtime(
    viewState === "pending" ? (sentInvite?.inviteId ?? null) : null,
    {
      onAccepted: handleAccepted,
      onRejected: handleRejected,
      onCancelled: handleCancelled,
      onExpired: handleExpired,
    }
  );

  function pickRandom() {
    setTopic(PRESET_TOPICS[Math.floor(Math.random() * PRESET_TOPICS.length)]);
  }

  async function handleSend() {
    const trimmed = topic.trim();
    if (!trimmed) { setFormError("請輸入辯題"); return; }
    if (trimmed.length > 120) { setFormError("辯題最多 120 字"); return; }

    const inviterSide: "pro" | "con" =
      sidePick === "random" ? (Math.random() < 0.5 ? "pro" : "con") : sidePick;

    setSending(true);
    setFormError(null);
    try {
      const res = await fetch("/api/battle-invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receiverId: targetUserId, mode, topic: trimmed, inviterSide }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        inviteId?: string;
        expiresAt?: string;
        error?: string;
      };
      if (!res.ok || !data.ok || !data.inviteId) {
        setFormError(data.error ?? "發送失敗，請稍後再試");
      } else {
        setSentInvite({
          inviteId: data.inviteId,
          mode,
          topic: trimmed,
          inviterSide,
          receiverSide: inviterSide === "pro" ? "con" : "pro",
          expiresAt:
            data.expiresAt ?? new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        });
        setViewState("pending");
      }
    } catch {
      setFormError("網路錯誤，請稍後再試");
    } finally {
      setSending(false);
    }
  }

  async function handleCancelInvite() {
    if (!sentInvite) return;
    setCancelling(true);
    try {
      await fetch(`/api/battle-invites/${sentInvite.inviteId}/cancel`, {
        method: "POST",
      });
    } catch { /* ignore */ }
    setViewState("cancelled");
    setCancelling(false);
  }

  const modeLabel = sentInvite?.mode === "debate" ? "⚖️ 辯論房" : "🔥 嘴砲房";
  const myRole = sentInvite?.inviterSide === "pro" ? "正方" : "反方";
  const theirRole = sentInvite?.receiverSide === "pro" ? "正方" : "反方";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Form state ── */}
        {viewState === "form" && (
          <>
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">邀請 {targetNickname} 對戰</h2>
              <button onClick={onClose} className="rounded p-1 text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            {/* Mode */}
            <div className="mb-4">
              <p className="mb-2 text-sm font-medium text-slate-400">模式</p>
              <div className="grid grid-cols-2 gap-2">
                {(["debate", "banter"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className={`rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
                      mode === m
                        ? m === "debate"
                          ? "border-indigo-600 bg-indigo-900/40 text-indigo-300"
                          : "border-amber-600 bg-amber-900/40 text-amber-300"
                        : "border-slate-700 text-slate-400 hover:border-slate-600 hover:text-white"
                    }`}
                  >
                    {m === "debate" ? "⚖️ 辯論房" : "🔥 嘴砲房"}
                  </button>
                ))}
              </div>
            </div>

            {/* Topic */}
            <div className="mb-4">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-medium text-slate-400">辯題</p>
                <button
                  onClick={pickRandom}
                  type="button"
                  className="text-xs text-indigo-400 hover:text-indigo-300"
                >
                  隨機題目
                </button>
              </div>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="輸入辯題（最多 120 字）"
                maxLength={120}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
              <p className="mt-1 text-right text-xs text-slate-600">{topic.length}/120</p>
            </div>

            {/* Side */}
            <div className="mb-5">
              <p className="mb-2 text-sm font-medium text-slate-400">你的立場</p>
              <div className="grid grid-cols-3 gap-2">
                {(["random", "pro", "con"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setSidePick(s)}
                    className={`rounded-lg border py-2 text-sm transition-colors ${
                      sidePick === s
                        ? "border-indigo-600 bg-indigo-900/40 text-indigo-300"
                        : "border-slate-700 text-slate-400 hover:border-slate-600 hover:text-white"
                    }`}
                  >
                    {s === "random" ? "隨機" : s === "pro" ? "正方" : "反方"}
                  </button>
                ))}
              </div>
            </div>

            {formError && (
              <p className="mb-3 rounded-lg bg-red-900/30 px-3 py-2 text-sm text-red-400">
                {formError}
              </p>
            )}

            <button
              onClick={handleSend}
              disabled={sending || !topic.trim()}
              className="w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:opacity-50"
            >
              {sending ? "送出中…" : "送出邀請"}
            </button>
          </>
        )}

        {/* ── Pending state ── */}
        {viewState === "pending" && sentInvite && (
          <>
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">等待對方回應</h2>
              <button
                onClick={onClose}
                title="關閉視窗（邀請仍有效）"
                className="rounded p-1 text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Invite summary */}
            <div className="mb-5 space-y-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">對手</span>
                <span className="font-medium text-white">{targetNickname}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">模式</span>
                <span className="text-white">{modeLabel}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="shrink-0 text-slate-400">辯題</span>
                <span className="text-right text-white">{sentInvite.topic}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">你的立場</span>
                <span className="font-medium text-indigo-300">{myRole}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">對方立場</span>
                <span className="text-slate-300">{theirRole}</span>
              </div>
              {timeLeft && (
                <div className="flex justify-between border-t border-slate-700 pt-2">
                  <span className="text-slate-400">剩餘時間</span>
                  <span
                    className={`font-mono ${
                      timeLeft === "已過期" ? "text-red-400" : "text-slate-300"
                    }`}
                  >
                    {timeLeft}
                  </span>
                </div>
              )}
            </div>

            {/* Spinner */}
            <div className="mb-5 flex items-center justify-center gap-2.5 text-slate-400">
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              <span className="text-sm">等待 {targetNickname} 回應中…</span>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleCancelInvite}
                disabled={cancelling}
                className="flex-1 rounded-lg border border-red-800/60 py-2 text-sm text-red-400 transition-colors hover:bg-red-900/30 disabled:opacity-50"
              >
                {cancelling ? "取消中…" : "取消邀請"}
              </button>
              <button
                onClick={onClose}
                className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-300 transition-colors hover:bg-slate-700"
              >
                關閉視窗
              </button>
            </div>
            <p className="mt-2 text-center text-xs text-slate-600">
              關閉視窗後邀請仍然有效，可在通知中心查看結果
            </p>
          </>
        )}

        {/* ── Rejected ── */}
        {viewState === "rejected" && (
          <div className="py-6 text-center">
            <p className="text-3xl">😔</p>
            <p className="mt-3 text-lg font-semibold text-white">對方已拒絕邀請</p>
            <p className="mt-1 text-sm text-slate-400">
              {targetNickname} 拒絕了這次的對戰邀請。
            </p>
            <button
              onClick={onClose}
              className="mt-6 rounded-lg bg-slate-800 px-6 py-2 text-sm text-slate-300 hover:bg-slate-700"
            >
              關閉
            </button>
          </div>
        )}

        {/* ── Cancelled ── */}
        {viewState === "cancelled" && (
          <div className="py-6 text-center">
            <p className="text-3xl">✕</p>
            <p className="mt-3 text-lg font-semibold text-white">邀請已取消</p>
            <button
              onClick={onClose}
              className="mt-6 rounded-lg bg-slate-800 px-6 py-2 text-sm text-slate-300 hover:bg-slate-700"
            >
              關閉
            </button>
          </div>
        )}

        {/* ── Expired ── */}
        {viewState === "expired" && (
          <div className="py-6 text-center">
            <p className="text-3xl">⏰</p>
            <p className="mt-3 text-lg font-semibold text-white">邀請已過期</p>
            <p className="mt-1 text-sm text-slate-400">可以重新發送邀請。</p>
            <div className="mt-6 flex gap-2">
              <button
                onClick={() => {
                  setSentInvite(null);
                  setViewState("form");
                  setTopic("");
                }}
                className="flex-1 rounded-lg bg-indigo-600 py-2 text-sm font-medium text-white hover:bg-indigo-500"
              >
                重新邀請
              </button>
              <button
                onClick={onClose}
                className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-300 hover:bg-slate-700"
              >
                關閉
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
