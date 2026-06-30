"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { DbMatch, DbMatchPlayer, DbMatchMessage } from "@/types";

interface MatchRoomProps {
  match: Pick<DbMatch, "id" | "title" | "mode" | "status" | "topic">;
  proPlayer: Pick<DbMatchPlayer, "user_id" | "nickname"> | null;
  conPlayer: Pick<DbMatchPlayer, "user_id" | "nickname"> | null;
  messages: Pick<DbMatchMessage, "id" | "user_id" | "side" | "content" | "round" | "created_at" | "nickname">[];
  currentUserId: string | null;
}

const STATUS_LABELS: Record<string, string> = {
  waiting: "等待對手",
  active: "對戰中",
  finished: "已結束",
  cancelled: "已取消",
};

function playerName(p: Pick<DbMatchPlayer, "user_id" | "nickname"> | null): string {
  if (!p) return "（空缺）";
  return p.nickname ?? p.user_id.slice(0, 8);
}

export default function MatchRoom({
  match,
  proPlayer,
  conPlayer,
  messages,
  currentUserId,
}: MatchRoomProps) {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  // Auto-refresh every 5 seconds while match is ongoing
  useEffect(() => {
    if (!isOngoing) return;
    const id = setInterval(() => router.refresh(), 5000);
    return () => clearInterval(id);
  }, [isOngoing, router]);

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
      setError(
        joinErr.code === "23505"
          ? "此位置已被佔用，請選擇另一方。"
          : "加入失敗，請稍後再試。"
      );
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
      router.refresh();
    }
    setActionLoading(false);
  }

  const modeLabel = match.mode === "debate" ? "辯論" : "嘴砲";
  const modeHref = match.mode === "debate" ? "/rooms/debate" : "/rooms/banter";

  return (
    <div>
      {/* Back link */}
      <Link
        href={modeHref}
        className="mb-4 inline-flex items-center gap-1 text-sm text-slate-400 hover:text-white"
      >
        ← 返回{modeLabel}房
      </Link>

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

      {/* Error banner */}
      {error && (
        <div className="mt-3 rounded-lg bg-red-900/30 px-4 py-2 text-sm text-red-400">
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-2 text-red-300 hover:text-white"
          >
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
            <p className="font-semibold text-white">{playerName(proPlayer)}</p>
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
                <Link
                  href="/auth/login"
                  className="block text-center text-xs text-indigo-400 hover:underline"
                >
                  登入後加入
                </Link>
              )}
            </div>
          )}
          {currentSide === "pro" && (
            <p className="mt-2 text-xs text-indigo-400">（你）</p>
          )}
        </div>

        {/* Messages + input */}
        <div className="flex flex-col gap-3 lg:col-span-2">
          <div className="h-80 overflow-y-auto rounded-xl border border-slate-800 bg-slate-900 p-4">
            {messages.length === 0 ? (
              <p className="text-center text-sm text-slate-500">
                {isActive
                  ? "對戰開始！雙方都可以發言了。"
                  : "等待雙方就位後即可開始對戰。"}
              </p>
            ) : (
              <div className="space-y-3">
                {messages.map((msg) => {
                  const isPro = msg.side === "pro";
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isPro ? "justify-start" : "justify-end"}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-xl px-3 py-2 ${
                          isPro
                            ? "bg-indigo-900/40"
                            : "bg-slate-700/60"
                        }`}
                      >
                        <p className="mb-1 text-xs font-medium text-slate-400">
                          {isPro ? "正方" : "反方"} ·{" "}
                          {msg.nickname ?? msg.user_id.slice(0, 8)}
                        </p>
                        <p className="text-sm text-white">{msg.content}</p>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Input */}
          {isActive && isParticipant ? (
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <input
                type="text"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="輸入你的論點…"
                maxLength={500}
                required
                className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
              <button
                type="submit"
                disabled={actionLoading || !content.trim()}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:opacity-50"
              >
                發送
              </button>
            </form>
          ) : isWaiting && isParticipant ? (
            <p className="text-center text-sm text-slate-500">
              等待對手加入後即可開始發言…
            </p>
          ) : isActive && !isParticipant ? (
            <p className="text-center text-sm text-slate-500">
              你是觀戰者，無法發言。
            </p>
          ) : null}
        </div>

        {/* Con side */}
        <div className="rounded-xl border border-slate-700/60 bg-slate-900 p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-400">
            🛡️ 反方
          </p>
          {conPlayer ? (
            <p className="font-semibold text-white">{playerName(conPlayer)}</p>
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
                <Link
                  href="/auth/login"
                  className="block text-center text-xs text-indigo-400 hover:underline"
                >
                  登入後加入
                </Link>
              )}
            </div>
          )}
          {currentSide === "con" && (
            <p className="mt-2 text-xs text-slate-400">（你）</p>
          )}
        </div>
      </div>

      {/* Reserved: AI judge section */}
      {/* Will be added in a future phase */}
    </div>
  );
}
