"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { dedupeMessages, mergeMessages } from "@/lib/messages";
import type { DirectMessage } from "@/lib/messages";

// Re-export so existing imports from this hook still work
export type { DirectMessage };

export function useConversationRealtime(conversationId: string) {
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const channelSeq = useRef(0);

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/messages/conversations/${conversationId}/messages`,
        { cache: "no-store" }
      );
      if (!res.ok) return;
      const data = (await res.json()) as { messages: DirectMessage[] };
      // Merge (incoming overwrites prev for same id) — no full replacement,
      // so any message already in state with a more recent deleted_at is preserved.
      setMessages((prev) => mergeMessages(prev, data.messages));
    } catch { /* ignore */ }
  }, [conversationId]);

  useEffect(() => {
    let cancelled = false;

    // Initial load: fetch once, dedupe, then start polling + Realtime
    (async () => {
      try {
        const res = await fetch(
          `/api/messages/conversations/${conversationId}/messages`,
          { cache: "no-store" }
        );
        if (res.ok && !cancelled) {
          const data = (await res.json()) as { messages: DirectMessage[] };
          setMessages(dedupeMessages(data.messages));
        }
      } catch { /* ignore */ }
      if (!cancelled) setLoading(false);
    })();

    // Polling — merges incoming so ids already in state are deduplicated
    const pollId = setInterval(fetchMessages, 5_000);

    const supabase = createClient();
    channelSeq.current += 1;
    const channel = supabase
      .channel(`dm_conv_${conversationId}_${channelSeq.current}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "direct_messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          if (cancelled) return;
          const m = payload.new as DirectMessage;
          setMessages((prev) =>
            mergeMessages(prev, [
              { id: m.id, sender_id: m.sender_id, body: m.body ?? null, created_at: m.created_at, deleted_at: m.deleted_at ?? null },
            ])
          );
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "direct_messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          if (cancelled) return;
          const m = payload.new as DirectMessage;
          // If deleted_at is set, body becomes null
          setMessages((prev) =>
            mergeMessages(prev, [
              { id: m.id, sender_id: m.sender_id, body: m.deleted_at ? null : (m.body ?? null), created_at: m.created_at, deleted_at: m.deleted_at ?? null },
            ])
          );
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      clearInterval(pollId);
      supabase.removeChannel(channel);
    };
  }, [conversationId, fetchMessages]);

  return { messages, setMessages, loading };
}
