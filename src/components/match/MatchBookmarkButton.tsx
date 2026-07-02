"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface Props {
  matchId: string;
  userId: string;
  isBookmarked: boolean;
  onToggle?: (newState: boolean) => void;
  compact?: boolean;
}

export default function MatchBookmarkButton({
  matchId,
  userId,
  isBookmarked,
  onToggle,
  compact = false,
}: Props) {
  const [localBookmarked, setLocalBookmarked] = useState(isBookmarked);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleToggle() {
    if (loading) return;
    const next = !localBookmarked;
    setLocalBookmarked(next);
    setLoading(true);
    setError(null);

    const supabase = createClient();
    let err: { message: string } | null = null;

    if (next) {
      const res = await supabase
        .from("match_bookmarks")
        .insert({ match_id: matchId, user_id: userId });
      err = res.error;
    } else {
      const res = await supabase
        .from("match_bookmarks")
        .delete()
        .eq("match_id", matchId)
        .eq("user_id", userId);
      err = res.error;
    }

    if (err) {
      setLocalBookmarked(!next);
      setError("收藏操作失敗，請稍後再試");
    } else {
      onToggle?.(next);
    }

    setLoading(false);
  }

  return (
    <div>
      <button
        onClick={handleToggle}
        disabled={loading}
        title={localBookmarked ? "取消收藏" : "收藏"}
        className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs transition-colors disabled:opacity-50 ${
          localBookmarked
            ? "text-yellow-400 hover:text-yellow-300"
            : "text-slate-500 hover:text-slate-300"
        }`}
      >
        <span>{localBookmarked ? "★" : "☆"}</span>
        {!compact && <span>{localBookmarked ? "已收藏" : "收藏"}</span>}
      </button>
      {error && <p className="mt-0.5 text-xs text-red-400">{error}</p>}
    </div>
  );
}
