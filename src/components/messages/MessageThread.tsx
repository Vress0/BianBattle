"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Avatar from "@/components/ui/Avatar";
import MessageBubble from "./MessageBubble";
import BattleInviteButton from "@/components/battle-invites/BattleInviteButton";
import MessageInput from "./MessageInput";
import { useConversationRealtime } from "@/hooks/useConversationRealtime";
import { dedupeMessages, mergeMessages } from "@/lib/messages";
import type { DirectMessage } from "@/lib/messages";

interface Props {
  conversationId: string;
  currentUserId: string;
  otherUser: {
    id: string;
    nickname: string | null;
    avatar_url: string | null;
  };
}

export default function MessageThread({ conversationId, currentUserId, otherUser }: Props) {
  const { messages, setMessages, loading } = useConversationRealtime(conversationId);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const didInitialScroll = useRef(false);

  const otherName = otherUser.nickname ?? otherUser.id.slice(0, 8);

  // Scroll to bottom once on initial load
  useEffect(() => {
    if (!loading && !didInitialScroll.current) {
      bottomRef.current?.scrollIntoView();
      didInitialScroll.current = true;
    }
  }, [loading]);

  // Mark as read on mount
  useEffect(() => {
    fetch(`/api/messages/conversations/${conversationId}/read`, { method: "POST" }).catch(() => {});
  }, [conversationId]);

  async function handleSend(body: string) {
    if (sending) return;
    setSending(true);
    setSendError(null);

    try {
      const res = await fetch(`/api/messages/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      const data = (await res.json()) as { message?: DirectMessage; error?: string };
      if (!res.ok || !data.message) {
        setSendError(data.error ?? "送出失敗，請稍後再試");
      } else {
        // Merge server message — no temp ids, no optimistic append.
        // mergeMessages deduplicates, so even if Realtime INSERT fires first
        // with the same id, it won't appear twice.
        setMessages((prev) => mergeMessages(prev, [data.message!]));
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      }
    } catch {
      setSendError("網路錯誤，請稍後再試");
    } finally {
      setSending(false);
    }
  }

  async function handleDelete(messageId: string) {
    const res = await fetch(`/api/messages/${messageId}/delete`, { method: "POST" });
    if (res.ok) {
      // Update in-place — no new entry, just mark existing as deleted
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId ? { ...m, body: null, deleted_at: new Date().toISOString() } : m
        )
      );
    }
  }

  // Safety dedup before render — even if upstream sends duplicates,
  // we never pass a duplicate key to React's reconciler
  const safeMessages = dedupeMessages(messages);

  return (
    <div className="flex flex-col" style={{ height: "calc(100dvh - 57px)" }}>
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-slate-800 bg-slate-950 px-4 py-3">
        <Link
          href="/messages"
          className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
          aria-label="返回私訊列表"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <Avatar src={otherUser.avatar_url} name={otherName} size="sm" />
        <span className="flex-1 font-semibold text-white">{otherName}</span>
        <BattleInviteButton
          targetUserId={otherUser.id}
          targetNickname={otherName}
          className="shrink-0 rounded-lg border border-slate-700 px-2.5 py-1 text-xs text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
        />
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-slate-500">載入中…</p>
          </div>
        ) : safeMessages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-slate-600">還沒有訊息，先打個招呼吧！</p>
          </div>
        ) : (
          safeMessages.map((m) => (
            <MessageBubble
              key={m.id}
              message={m}
              isOwn={m.sender_id === currentUserId}
              onDelete={handleDelete}
            />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <MessageInput onSend={handleSend} disabled={sending} error={sendError} />
    </div>
  );
}
