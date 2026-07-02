"use client";

import { useMemo, useState } from "react";
import HistoryMatchCard from "@/components/profile/HistoryMatchCard";
import type { HistoryMatchRow, UserMatchResultKey } from "@/types";
import { formatDateTime } from "@/lib/match-display";
import { calcWinRate } from "@/lib/utils";

type FilterKey =
  | "all"
  | "won"
  | "lost"
  | "unrated"
  | "active"
  | "debate"
  | "banter"
  | "bookmarked";

type SortKey =
  | "newest"
  | "oldest"
  | "wins_first"
  | "losses_first"
  | "rated_first"
  | "unrated_first";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "全部" },
  { key: "won", label: "勝利" },
  { key: "lost", label: "失敗" },
  { key: "unrated", label: "不計分/取消" },
  { key: "active", label: "進行中" },
  { key: "debate", label: "辯論房" },
  { key: "banter", label: "嘴砲房" },
  { key: "bookmarked", label: "已收藏" },
];

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "newest", label: "最新優先" },
  { key: "oldest", label: "最舊優先" },
  { key: "wins_first", label: "勝利優先" },
  { key: "losses_first", label: "失敗優先" },
  { key: "rated_first", label: "計分場優先" },
  { key: "unrated_first", label: "不計分優先" },
];

function winsRank(k: UserMatchResultKey): number {
  if (k === "win") return 0;
  if (k === "loss") return 1;
  if (k === "unrated") return 2;
  if (k === "cancelled") return 3;
  return 4;
}

function lossRank(k: UserMatchResultKey): number {
  if (k === "loss") return 0;
  if (k === "win") return 1;
  if (k === "unrated") return 2;
  if (k === "cancelled") return 3;
  return 4;
}

const PAGE_SIZE = 10;

export interface HistoryProfileStats {
  wins: number;
  losses: number;
  debateMmr: number;
  banterMmr: number;
  statsUnrated: number;
  statsActive: number;
  lastMatchAt: string | null;
}

interface Props {
  userId: string;
  profile: HistoryProfileStats;
  matches: HistoryMatchRow[];
}

export default function HistoryPageClient({ userId, profile, matches }: Props) {
  const [filter, setFilter] = useState<FilterKey>("all");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("newest");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(
    () => new Set(matches.filter((m) => m.isBookmarked).map((m) => m.id))
  );
  const [notes, setNotes] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    for (const m of matches) {
      if (m.noteContent != null) map[m.id] = m.noteContent;
    }
    return map;
  });

  const filtered = useMemo(() => {
    let result = matches;

    switch (filter) {
      case "won":
        result = result.filter((m) => m.resultKey === "win");
        break;
      case "lost":
        result = result.filter((m) => m.resultKey === "loss");
        break;
      case "unrated":
        result = result.filter(
          (m) => m.resultKey === "unrated" || m.resultKey === "cancelled"
        );
        break;
      case "active":
        result = result.filter((m) => m.resultKey === "active");
        break;
      case "debate":
        result = result.filter((m) => m.mode === "debate");
        break;
      case "banter":
        result = result.filter((m) => m.mode === "banter");
        break;
      case "bookmarked":
        result = result.filter((m) => bookmarkedIds.has(m.id));
        break;
    }

    const q = search.trim().toLowerCase();
    if (q) {
      result = result.filter(
        (m) =>
          (m.topic ?? "").toLowerCase().includes(q) ||
          m.opponentName.toLowerCase().includes(q) ||
          m.title.toLowerCase().includes(q)
      );
    }

    return [...result].sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case "oldest":
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case "wins_first":
          return winsRank(a.resultKey) - winsRank(b.resultKey);
        case "losses_first":
          return lossRank(a.resultKey) - lossRank(b.resultKey);
        case "rated_first":
          return (b.is_rated ? 1 : 0) - (a.is_rated ? 1 : 0);
        case "unrated_first":
          return (a.is_rated ? 1 : 0) - (b.is_rated ? 1 : 0);
        default:
          return 0;
      }
    });
  }, [matches, filter, search, sortBy, bookmarkedIds]);

  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  function handleFilterChange(f: FilterKey) {
    setFilter(f);
    setVisibleCount(PAGE_SIZE);
  }

  function handleSearchChange(q: string) {
    setSearch(q);
    setVisibleCount(PAGE_SIZE);
  }

  function handleSortChange(s: SortKey) {
    setSortBy(s);
    setVisibleCount(PAGE_SIZE);
  }

  function handleBookmarkToggle(matchId: string, newState: boolean) {
    setBookmarkedIds((prev) => {
      const next = new Set(prev);
      if (newState) next.add(matchId);
      else next.delete(matchId);
      return next;
    });
  }

  function handleNoteChange(matchId: string, newNote: string) {
    setNotes((prev) => ({ ...prev, [matchId]: newNote }));
  }

  const total = profile.wins + profile.losses;
  const winRate = calcWinRate(profile.wins, profile.losses);

  return (
    <div>
      {/* Stats cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="計分總場次" value={String(total)} />
        <StatCard label="勝場" value={String(profile.wins)} valueClass="text-green-400" />
        <StatCard label="敗場" value={String(profile.losses)} valueClass="text-red-400" />
        <StatCard label="勝率" value={total > 0 ? `${winRate}%` : "—"} />
        <StatCard
          label="不計分場次"
          value={String(profile.statsUnrated)}
          valueClass="text-slate-500"
        />
        <StatCard
          label="進行中場次"
          value={String(profile.statsActive)}
          valueClass="text-yellow-400"
        />
        <StatCard label="辯論 MMR" value={String(profile.debateMmr)} />
        <StatCard label="嘴砲 MMR" value={String(profile.banterMmr)} />
      </div>

      {profile.lastMatchAt && (
        <p className="mt-2 text-xs text-slate-500">
          最近對戰：{formatDateTime(profile.lastMatchAt)}
        </p>
      )}

      {/* Filter tabs */}
      <div className="mt-6 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => handleFilterChange(f.key)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              filter === f.key
                ? "bg-indigo-600 text-white"
                : "bg-slate-800 text-slate-400 hover:bg-slate-700"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Search + Sort */}
      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <input
          type="text"
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="搜尋辯題、對手名稱…"
          className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
        />
        <select
          value={sortBy}
          onChange={(e) => handleSortChange(e.target.value as SortKey)}
          className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500"
        >
          {SORT_OPTIONS.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      {/* List */}
      <div className="mt-4 space-y-3">
        {visible.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-700 py-14 text-center">
            <p className="text-slate-500">
              {search.trim() || filter !== "all"
                ? "沒有符合條件的對局"
                : "還沒有任何對戰紀錄"}
            </p>
          </div>
        ) : (
          visible.map((match) => (
            <HistoryMatchCard
              key={match.id}
              match={match}
              userId={userId}
              isBookmarked={bookmarkedIds.has(match.id)}
              noteContent={notes[match.id] ?? match.noteContent}
              onBookmarkToggle={handleBookmarkToggle}
              onNoteChange={handleNoteChange}
            />
          ))
        )}
      </div>

      {/* Show more */}
      {hasMore && (
        <div className="mt-4 text-center">
          <button
            onClick={() => setVisibleCount((v) => v + PAGE_SIZE)}
            className="rounded-lg border border-slate-700 px-5 py-2 text-sm text-slate-300 transition-colors hover:bg-slate-800"
          >
            顯示更多（還有 {filtered.length - visibleCount} 筆）
          </button>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-3 text-center">
      <p className={`text-xl font-bold ${valueClass ?? "text-white"}`}>{value}</p>
      <p className="mt-0.5 text-xs text-slate-500">{label}</p>
    </div>
  );
}
