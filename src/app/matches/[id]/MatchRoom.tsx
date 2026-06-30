"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { DbMatch, DbMatchPlayer, DbMatchMessage, DbMatchTypingStatus } from "@/types";
import TypingIndicator from "@/components/match/TypingIndicator";
import SpeechInputButton from "@/components/match/SpeechInputButton";
import { GRACE_PERIOD_SECONDS } from "@/lib/match-rules";

// ─── Prop types ──────────────────────────────────────────────────────────────

interface MatchRoomProps {
  match: Pick<
    DbMatch,
    | "id" | "title" | "mode" | "status" | "topic"
    | "started_at" | "ended_at" | "ended_reason" | "winner_side" | "is_rated"
  >;
  proPlayer: Pick<DbMatchPlayer, "user_id" | "nickname" | "disconnected_at" | "forfeit_deadline_at"> | null;
  conPlayer: Pick<DbMatchPlayer, "user_id" | "nickname" | "disconnected_at" | "forfeit_deadline_at"> | null;
  messages: Pick<DbMatchMessage, "id" | "user_id" | "side" | "content" | "round" | "created_at" | "nickname">[];
  currentUserId: string | null;
}

// ─── Constants & helpers ──────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  waiting: "等待對手",
  active: "對戰中",
  finished: "已結束",
  cancelled: "已取消",
};

const SIDE_LABELS: Record<string, string> = { pro: "正方", con: "反方" };

const TYPING_THROTTLE_MS = 1000;
const TYPING_IDLE_MS = 2500;
const TYPING_STALE_MS = 5000;
const TYPING_POLL_MS = 2000;
const TIMEOUT_CHECK_MS = 10000;

function fmtTime(iso: string): string {
  const d = new Date(iso);
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
}

function playerName(p: Pick<DbMatchPlayer, "user_id" | "nickname"> | null): string {
  if (!p) return "（空缺）";
  return p.nickname ?? p.user_id.slice(0, 8);
}

function endedBannerText(
  status: string,
  endedReason: string | null,
  winnerSide: string | null
): string | null {
  if (status !== "finished" && status !== "cancelled") return null;
  const winner = winnerSide === "pro" ? "正方" : winnerSide === "con" ? "反方" : null;
  const loser = winnerSide === "pro" ? "反方" : winnerSide === "con" ? "正方" : null;
  switch (endedReason) {
    case "grace_surrender":
      return "比賽已取消：開局 15 秒內認輸，不計入戰績。";
    case "grace_leave":
      return "比賽已取消：開局 15 秒內有玩家離開，不計入戰績。";
    case "surrender":
      return winner && loser ? `比賽已結束：${winner}獲勝（${loser}認輸）` : "比賽已結束";
    case "timeout":
      return winner && loser ? `比賽已結束：${winner}獲勝（${loser}超時棄賽）` : "比賽已結束";
    default:
      return "比賽已結束";
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function MatchRoom({
  match,
  proPlayer,
  conPlayer,
  messages,
  currentUserId,
}: MatchRoomProps) {
  const router = useRouter();

  // Message input
  const [content, setContent] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Typing
  const [typingStatuses, setTypingStatuses] = useState<DbMatchTypingStatus[]>([]);
  const typingThrottleRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingIdleRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingSentRef = useRef<number>(0);

  // Grace period countdown — null until useEffect measures it (avoids server/client mismatch)
  const [graceLeft, setGraceLeft] = useState<number | null>(null);

  // Opponent forfeit countdown (seconds left until deadline, or null)
  const [forfeitLeft, setForfeitLeft] = useState<number | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ─── Derived state ──────────────────────────────────────────────────────────

  const currentSide =
    proPlayer?.user_id === currentUserId
      ? "pro"
      : conPlayer?.user_id === currentUserId
        ? "con"
        : null;
  const isParticipant = currentSide !== null;
  const isWaiting = match.status === "waiting";
  const isActive = match.status === "active";
  const isOngoing = isWaiting || isActive;
  const isEnded = match.status === "finished" || match.status === "cancelled";
  const inGracePeriod = isActive && graceLeft !== null && graceLeft > 0;

  const opponentPlayer = currentSide === "pro" ? conPlayer : currentSide === "con" ? proPlayer : null;
  const opponentDisconnected =
    match.status === "active" &&
    match.ended_at === null &&
    match.ended_reason === null &&
    opponentPlayer?.disconnected_at != null;

  const modeLabel = match.mode === "debate" ? "辯論" : "嘴砲";
  const modeHref = match.mode === "debate" ? "/rooms/debate" : "/rooms/banter";

  // ─── Speech helpers ─────────────────────────────────────────────────────────

  // Appends only the NEW final speech fragment using functional update — never
  // reads stale `content` closure, so earlier typed text is never overwritten.
  const appendTranscript = useCallback((text: string) => {
    const cleanedNext = text.trim();
    if (!cleanedNext) return;
    setContent((prev) => {
      const cleanedPrev = prev.trim();
      return cleanedPrev ? `${cleanedPrev} ${cleanedNext}` : cleanedNext;
    });
  }, []);

  // ─── Typing helpers ─────────────────────────────────────────────────────────

  const setTypingInDb = useCallback(
    async (isTyping: boolean) => {
      if (!currentUserId || !currentSide) return;
      const supabase = createClient();
      await supabase.from("match_typing_status").upsert(
        {
          match_id: match.id,
          user_id: currentUserId,
          side: currentSide,
          is_typing: isTyping,
          last_typed_at: new Date().toISOString(),
        },
        { onConflict: "match_id,user_id" }
      );
    },
    [match.id, currentUserId, currentSide]
  );

  // ─── Effects ────────────────────────────────────────────────────────────────

  // Poll opponent typing status
  useEffect(() => {
    if (!isOngoing) return;
    async function fetchTyping() {
      const supabase = createClient();
      const { data } = await supabase
        .from("match_typing_status")
        .select("match_id, user_id, side, is_typing, last_typed_at")
        .eq("match_id", match.id)
        .eq("is_typing", true);
      if (data) {
        const cutoff = new Date(Date.now() - TYPING_STALE_MS).toISOString();
        setTypingStatuses(data.filter((s: DbMatchTypingStatus) => s.last_typed_at > cutoff));
      }
    }
    fetchTyping();
    const pollId = setInterval(fetchTyping, TYPING_POLL_MS);
    return () => clearInterval(pollId);
  }, [isOngoing, match.id]);

  // Clear typing on unmount
  useEffect(() => {
    return () => {
      if (currentUserId && currentSide) {
        const supabase = createClient();
        supabase
          .from("match_typing_status")
          .upsert(
            {
              match_id: match.id,
              user_id: currentUserId,
              side: currentSide,
              is_typing: false,
              last_typed_at: new Date().toISOString(),
            },
            { onConflict: "match_id,user_id" }
          )
          .then(() => {});
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  // Auto-refresh every 5 s while ongoing
  useEffect(() => {
    if (!isOngoing) return;
    const id = setInterval(() => router.refresh(), 5000);
    return () => clearInterval(id);
  }, [isOngoing, router]);

  // Grace period countdown
  useEffect(() => {
    if (match.status !== "active" || !match.started_at) return;
    const startedMs = new Date(match.started_at).getTime();
    const id = setInterval(() => {
      const elapsed = (Date.now() - startedMs) / 1000;
      setGraceLeft(Math.max(0, Math.ceil(GRACE_PERIOD_SECONDS - elapsed)));
    }, 300);
    return () => clearInterval(id);
  }, [match.status, match.started_at]);

  // Opponent forfeit countdown
  useEffect(() => {
    const deadline = opponentPlayer?.forfeit_deadline_at;
    if (!deadline || !isActive || match.ended_at !== null || match.ended_reason !== null) return;
    const deadlineMs = new Date(deadline).getTime();
    const id = setInterval(() => {
      setForfeitLeft(Math.max(0, Math.ceil((deadlineMs - Date.now()) / 1000)));
    }, 500);
    return () => clearInterval(id);
  }, [opponentPlayer?.forfeit_deadline_at, isActive, match.ended_at, match.ended_reason]);

  // Poll check-timeout when active
  useEffect(() => {
    if (!isActive) return;
    const id = setInterval(async () => {
      const res = await fetch(`/api/matches/${match.id}/check-timeout`, { method: "POST" });
      if (res.ok) {
        const data = (await res.json()) as { changed?: boolean };
        if (data.changed) router.refresh();
      }
    }, TIMEOUT_CHECK_MS);
    return () => clearInterval(id);
  }, [isActive, match.id, router]);

  // ─── Handlers ───────────────────────────────────────────────────────────────

  function handleContentChange(value: string) {
    setContent(value);
    if (!currentUserId || !currentSide) return;
    if (typingIdleRef.current) clearTimeout(typingIdleRef.current);
    const now = Date.now();
    const timeSinceLast = now - lastTypingSentRef.current;
    if (timeSinceLast > TYPING_THROTTLE_MS) {
      lastTypingSentRef.current = now;
      setTypingInDb(true);
    } else {
      if (typingThrottleRef.current) clearTimeout(typingThrottleRef.current);
      typingThrottleRef.current = setTimeout(() => {
        lastTypingSentRef.current = Date.now();
        setTypingInDb(true);
      }, TYPING_THROTTLE_MS - timeSinceLast);
    }
    typingIdleRef.current = setTimeout(() => setTypingInDb(false), TYPING_IDLE_MS);
  }

  async function handleJoin(side: "pro" | "con") {
    if (!currentUserId) return;
    setActionLoading(true);
    setError(null);
    const supabase = createClient();
    const { error: joinErr } = await supabase.from("match_players").insert({
      match_id: match.id,
      user_id: currentUserId,
      side,
    });
    if (joinErr) {
      setError(joinErr.code === "23505" ? "此位置已被佔用，請選擇另一方。" : "加入失敗，請稍後再試。");
    } else {
      router.refresh();
    }
    setActionLoading(false);
  }

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim() || !isParticipant || !currentUserId) return;
    setActionLoading(true);
    setError(null);
    if (typingThrottleRef.current) clearTimeout(typingThrottleRef.current);
    if (typingIdleRef.current) clearTimeout(typingIdleRef.current);
    setTypingInDb(false);
    const supabase = createClient();
    const { error: msgErr } = await supabase.from("match_messages").insert({
      match_id: match.id,
      user_id: currentUserId,
      side: currentSide,
      content: content.trim(),
      round: 1,
    });
    if (msgErr) {
      setError("發送失敗，請稍後再試。");
    } else {
      setContent("");
      setInterimTranscript("");
      router.refresh();
    }
    setActionLoading(false);
  }

  async function handleSurrender() {
    if (!confirm("確定要認輸嗎？")) return;
    setActionLoading(true);
    setError(null);
    const res = await fetch(`/api/matches/${match.id}/surrender`, { method: "POST" });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    if (res.ok) {
      router.refresh();
    } else {
      setError(data.error ?? "認輸失敗，請稍後再試。");
    }
    setActionLoading(false);
  }

  async function handleLeave() {
    setError(null);
    setLeaving(true);
    try {
      const res = await fetch(`/api/matches/${match.id}/leave`, { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        redirectTo?: string;
        error?: string;
      };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "離開房間失敗，請稍後再試");
        return;
      }
      router.push(data.redirectTo ?? modeHref);
    } catch {
      setError("離開房間失敗，請稍後再試");
    } finally {
      setLeaving(false);
    }
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  const bannerText = endedBannerText(match.status, match.ended_reason, match.winner_side);
  const canSend = isActive && isParticipant;

  return (
    <div>
      {/* Top nav row */}
      <div className="mb-4 flex items-center justify-between">
        {isParticipant ? (
          <button
            onClick={handleLeave}
            disabled={leaving || actionLoading}
            className="inline-flex items-center gap-1 text-sm text-slate-400 transition-colors hover:text-white disabled:opacity-50"
          >
            {leaving ? "離開中…" : `← 離開${modeLabel}房`}
          </button>
        ) : (
          <Link
            href={modeHref}
            className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-white"
          >
            ← 返回{modeLabel}房
          </Link>
        )}

        {/* Surrender button */}
        {isActive && isParticipant && (
          <button
            onClick={handleSurrender}
            disabled={actionLoading}
            className="rounded-lg border border-red-800/60 px-3 py-1 text-xs text-red-400 transition-colors hover:bg-red-900/30 disabled:opacity-50"
          >
            認輸
          </button>
        )}
      </div>

      {/* Header card */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-white">{match.title}</h1>
            {match.topic && (
              <p className="mt-1 text-sm text-slate-400">辯題：{match.topic}</p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="rounded-full border border-slate-700 px-2.5 py-0.5 text-xs text-slate-400">
              {modeLabel} · 1v1
            </span>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                isActive
                  ? "bg-green-900/50 text-green-400"
                  : isWaiting
                    ? "bg-yellow-900/50 text-yellow-400"
                    : "bg-slate-800 text-slate-400"
              }`}
            >
              {STATUS_LABELS[match.status] ?? match.status}
            </span>
          </div>
        </div>
      </div>

      {/* Grace period banner */}
      {inGracePeriod && isParticipant && (
        <div className="mt-3 rounded-lg border border-yellow-700/50 bg-yellow-950/40 px-4 py-2.5">
          <p className="text-sm font-medium text-yellow-400">
            🛡️ 開局保護期：剩餘 {graceLeft ?? "…"} 秒，期間離開不計入戰績
          </p>
        </div>
      )}

      {/* Post-grace notice — only show once graceLeft is known, to avoid flash before first tick */}
      {isActive && graceLeft !== null && !inGracePeriod && isParticipant && (
        <div className="mt-3 rounded-lg border border-slate-700/50 bg-slate-900/60 px-4 py-2">
          <p className="text-xs text-slate-500">
            正式對戰中，退出後 90 秒未回來將判定棄賽。
          </p>
        </div>
      )}

      {/* Ended banner */}
      {bannerText && (
        <div
          className={`mt-3 rounded-lg px-4 py-3 text-sm font-medium ${
            match.is_rated
              ? "border border-indigo-800/50 bg-indigo-950/40 text-indigo-300"
              : "border border-slate-700/50 bg-slate-900/60 text-slate-400"
          }`}
        >
          {bannerText}
        </div>
      )}

      {/* Opponent disconnected notice */}
      {opponentDisconnected && isParticipant && (
        <div className="mt-3 rounded-lg border border-orange-800/50 bg-orange-950/30 px-4 py-2.5">
          <p className="text-sm text-orange-400">
            ⚠️ 對手已離開對戰房
            {opponentPlayer?.forfeit_deadline_at && forfeitLeft !== null
              ? forfeitLeft > 0
                ? `，${forfeitLeft} 秒後若未回來將判定棄賽。`
                : "，等待棄賽判定中…"
              : "，等待對手回來（90 秒內未回來將判定棄賽）。"}
          </p>
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className="mt-3 rounded-lg bg-red-900/30 px-4 py-2 text-sm text-red-400">
          {error}
          <button onClick={() => setError(null)} className="ml-2 text-red-300 hover:text-white">
            ✕
          </button>
        </div>
      )}

      {/* Main 3-column layout */}
      <div className="mt-4 grid gap-4 lg:grid-cols-4">
        {/* Pro side */}
        <div className="rounded-xl border border-indigo-900/60 bg-slate-900 p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-indigo-400">
            ⚖️ 正方
          </p>
          {proPlayer ? (
            <>
              <p className="font-semibold text-white">{playerName(proPlayer)}</p>
              {proPlayer.disconnected_at && !isEnded && (
                <p className="mt-1 text-xs text-orange-400">已離線</p>
              )}
            </>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-slate-500">（空缺）</p>
              {isWaiting && !isParticipant && currentUserId && (
                <button
                  onClick={() => handleJoin("pro")}
                  disabled={actionLoading}
                  className="w-full rounded-lg bg-indigo-700 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-indigo-600 disabled:opacity-50"
                >
                  加入正方
                </button>
              )}
              {isWaiting && !currentUserId && (
                <Link href="/auth/login" className="block text-center text-xs text-indigo-400 hover:underline">
                  登入後加入
                </Link>
              )}
            </div>
          )}
          {currentSide === "pro" && <p className="mt-2 text-xs text-indigo-400">（你）</p>}
        </div>

        {/* Messages + input */}
        <div className="flex flex-col gap-2 lg:col-span-2">
          {/* Messages list */}
          <div className="h-80 overflow-y-auto rounded-xl border border-slate-800 bg-slate-900 p-4">
            {messages.length === 0 ? (
              <p className="text-center text-sm text-slate-500">
                {isActive ? "對戰開始！雙方都可以發言了。" : "等待雙方就位後即可開始對戰。"}
              </p>
            ) : (
              <div className="space-y-3">
                {messages.map((msg) => {
                  const isOwn = !!currentUserId && msg.user_id === currentUserId;
                  const alignRight = isParticipant ? isOwn : msg.side === "con";
                  const sideLabel = SIDE_LABELS[msg.side] ?? "未知";
                  const senderName = isOwn ? "你" : (msg.nickname ?? msg.user_id.slice(0, 8));

                  return (
                    <div
                      key={msg.id}
                      className={`flex ${alignRight ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl px-3 py-2 ${
                          isOwn ? "bg-indigo-700/70" : "border border-slate-700 bg-slate-800"
                        }`}
                      >
                        <p className={`mb-1 text-xs text-slate-400 ${alignRight ? "text-right" : "text-left"}`}>
                          {senderName} · {sideLabel} · {fmtTime(msg.created_at)}
                        </p>
                        <p className="break-words text-sm text-white">{msg.content}</p>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Typing indicator */}
          <TypingIndicator
            typingStatuses={typingStatuses}
            currentUserId={currentUserId}
            proNickname={proPlayer?.nickname ?? null}
            conNickname={conPlayer?.nickname ?? null}
            proUserId={proPlayer?.user_id ?? null}
            conUserId={conPlayer?.user_id ?? null}
          />

          {/* Input area */}
          {canSend ? (
            <form onSubmit={handleSendMessage} className="flex flex-col gap-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={content}
                  onChange={(e) => handleContentChange(e.target.value)}
                  placeholder="輸入你的論點…"
                  maxLength={500}
                  required
                  className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
                <SpeechInputButton
                  onAppendTranscript={appendTranscript}
                  onInterimTranscriptChange={setInterimTranscript}
                  disabled={actionLoading}
                />
                <button
                  type="submit"
                  disabled={actionLoading || !content.trim()}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:opacity-50"
                >
                  發送
                </button>
              </div>
              {interimTranscript && (
                <p className="text-xs text-slate-500">辨識中：{interimTranscript}</p>
              )}
            </form>
          ) : isWaiting && isParticipant ? (
            <p className="text-center text-sm text-slate-500">等待對手加入後即可開始發言…</p>
          ) : isActive && !isParticipant ? (
            <p className="text-center text-sm text-slate-500">你是觀戰者，無法發言。</p>
          ) : !isParticipant && !currentUserId ? (
            <p className="text-center text-sm text-slate-500">
              <Link href="/auth/login" className="text-indigo-400 hover:underline">登入</Link>
              {" "}後加入正方或反方即可發言。
            </p>
          ) : null}
        </div>

        {/* Con side */}
        <div className="rounded-xl border border-slate-700/60 bg-slate-900 p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-400">
            🛡️ 反方
          </p>
          {conPlayer ? (
            <>
              <p className="font-semibold text-white">{playerName(conPlayer)}</p>
              {conPlayer.disconnected_at && !isEnded && (
                <p className="mt-1 text-xs text-orange-400">已離線</p>
              )}
            </>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-slate-500">（空缺）</p>
              {isWaiting && !isParticipant && currentUserId && (
                <button
                  onClick={() => handleJoin("con")}
                  disabled={actionLoading}
                  className="w-full rounded-lg bg-slate-700 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-slate-600 disabled:opacity-50"
                >
                  加入反方
                </button>
              )}
              {isWaiting && !currentUserId && (
                <Link href="/auth/login" className="block text-center text-xs text-indigo-400 hover:underline">
                  登入後加入
                </Link>
              )}
            </div>
          )}
          {currentSide === "con" && <p className="mt-2 text-xs text-slate-400">（你）</p>}
        </div>
      </div>
    </div>
  );
}
