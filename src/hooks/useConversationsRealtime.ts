"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export interface ConversationItem {
  conversationId: string;
  otherUser: {
    id: string;
    nickname: string | null;
    avatar_url: string | null;
  };
  otherUserStatus: string;
  last_message_preview: string | null;
  last_message_at: string | null;
  unread_count: number;
}

export function useConversationsRealtime() {
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/messages/conversations", { cache: "no-store" });
      if (!res.ok) throw new Error();
      const data = (await res.json()) as { conversations: ConversationItem[] };
      setConversations(data.conversations);
      setError(null);
    } catch {
      setError("載入失敗");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchConversations();
    const pollId = setInterval(fetchConversations, 15_000);

    const supabase = createClient();
    const channel = supabase
      .channel("conversations_list_rt")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "direct_conversations" },
        () => {
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      clearInterval(pollId);
      supabase.removeChannel(channel);
    };
  }, [fetchConversations]);

  return { conversations, loading, error, refetch: fetchConversations };
}
