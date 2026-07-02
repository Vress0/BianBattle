"use client";

import { useEffect, useState } from "react";
import UserSearchResultCard from "./UserSearchResultCard";
import type { UserSearchResult } from "./UserSearchResultCard";

interface Props {
  viewerId: string | null;
}

export default function UserSearchClient({ viewerId }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setResults([]);
      setSearched(false);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(trimmed)}`, {
          cache: "no-store",
        });
        if (res.ok) {
          const data = (await res.json()) as { results: UserSearchResult[] };
          setResults(data.results);
        }
      } catch { /* ignore */ } finally {
        setSearching(false);
        setSearched(true);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div>
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="輸入玩家暱稱（至少 2 個字）"
          className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 pr-10 text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
          maxLength={50}
          autoFocus
        />
        {searching && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-600 border-t-indigo-400" />
          </div>
        )}
      </div>

      {query.trim().length > 0 && query.trim().length < 2 && (
        <p className="mt-2 text-xs text-slate-500">請輸入至少 2 個字</p>
      )}

      {searched && !searching && (
        <div className="mt-4">
          {results.length === 0 ? (
            <p className="py-8 text-center text-slate-500">找不到符合「{query.trim()}」的玩家。</p>
          ) : (
            <div className="space-y-3">
              {results.map((r) => (
                <UserSearchResultCard key={r.id} result={r} viewerId={viewerId} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
