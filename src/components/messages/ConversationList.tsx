"use client";

import ConversationListItem from "./ConversationListItem";
import { useConversationsRealtime } from "@/hooks/useConversationsRealtime";

export default function ConversationList() {
  const { conversations, loading, error, refetch } = useConversationsRealtime();

  if (loading) {
    return (
      <div className="py-16 text-center">
        <p className="text-slate-400">載入中…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-900/50 bg-red-950/20 py-14 text-center">
        <p className="text-red-400">{error}</p>
        <button
          onClick={refetch}
          className="mt-4 rounded-lg bg-slate-800 px-4 py-2 text-sm text-slate-300 hover:bg-slate-700"
        >
          重試
        </button>
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-700 py-16 text-center">
        <p className="text-slate-400">還沒有任何私訊對話。</p>
        <p className="mt-2 text-sm text-slate-600">前往好友頁面，對好友發起私訊吧。</p>
      </div>
    );
  }

  // Safety dedup — prevents duplicate key errors if the same conversationId
  // appears more than once in the list (e.g. concurrent fetches)
  const safeConversations = conversations.filter(
    (c, i, arr) => arr.findIndex((x) => x.conversationId === c.conversationId) === i
  );

  return (
    <div className="space-y-2">
      {safeConversations.map((item) => (
        <ConversationListItem key={item.conversationId} item={item} />
      ))}
    </div>
  );
}
