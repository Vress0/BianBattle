"use client";

import { useMemo, useState } from "react";
import { calcWinRate } from "@/lib/utils";
import Avatar from "@/components/ui/Avatar";
import { getDebateRankFromMmr, getBanterRankFromMmr } from "@/lib/rank";
import { getStatusIcon, getStatusBadgeClass } from "@/lib/status-display";
import type { UserEffectiveStatus } from "@/lib/status-display";
import { useUserStatusRealtime } from "@/hooks/useUserStatusRealtime";
import type { StatusMap } from "@/hooks/useUserStatusRealtime";

export interface LeaderboardProfile {
  id: string;
  nickname: string | null;
  avatar_url: string | null;
  wins: number;
  losses: number;
  debate_mmr: number;
  banter_mmr: number;
  effectiveStatus?: UserEffectiveStatus;
}

type TabKey = "wins" | "winRate" | "debateMmr" | "banterMmr";

const TABS: { key: TabKey; label: string }[] = [
  { key: "wins", label: "勝場榜" },
  { key: "winRate", label: "勝率榜" },
  { key: "debateMmr", label: "辯論 MMR" },
  { key: "banterMmr", label: "嘴砲 MMR" },
];

const MIN_GAMES_FOR_WIN_RATE = 3;

function sortEntries(entries: LeaderboardProfile[], tab: TabKey): LeaderboardProfile[] {
  return [...entries].sort((a, b) => {
    switch (tab) {
      case "wins":
        return b.wins - a.wins;
      case "winRate":
        return calcWinRate(b.wins, b.losses) - calcWinRate(a.wins, a.losses);
      case "debateMmr":
        return b.debate_mmr - a.debate_mmr;
      case "banterMmr":
        return b.banter_mmr - a.banter_mmr;
      default:
        return 0;
    }
  });
}

export default function LeaderboardTabs({ entries }: { entries: LeaderboardProfile[] }) {
  const [tab, setTab] = useState<TabKey>("wins");

  const userIds = useMemo(() => entries.map((e) => e.id), [entries]);
  const initialMap = useMemo<StatusMap>(
    () =>
      Object.fromEntries(
        entries.map((e) => [e.id, (e.effectiveStatus ?? "offline") as UserEffectiveStatus])
      ),
    [entries]
  );
  const statusMap = useUserStatusRealtime(userIds, initialMap);

  const pool =
    tab === "winRate"
      ? entries.filter((e) => e.wins + e.losses >= MIN_GAMES_FOR_WIN_RATE)
      : entries;
  const sorted = sortEntries(pool, tab);

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
              tab === t.key
                ? "bg-indigo-600 text-white"
                : "bg-slate-800 text-slate-400 hover:bg-slate-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "winRate" && (
        <p className="mt-3 text-xs text-slate-500">
          僅計入已完成至少 {MIN_GAMES_FOR_WIN_RATE} 場對戰的玩家。
        </p>
      )}

      <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-800">
        <div className="grid min-w-[640px] grid-cols-[3rem_1fr_4rem_4rem_4rem_6rem_6rem] gap-2 border-b border-slate-800 bg-slate-900/80 px-4 py-3 text-xs font-semibold text-slate-500">
          <span>名次</span>
          <span>玩家</span>
          <span className="text-right">勝</span>
          <span className="text-right">敗</span>
          <span className="text-right">勝率</span>
          <span className="text-right">辯論 MMR</span>
          <span className="text-right">嘴砲 MMR</span>
        </div>

        {sorted.length === 0 ? (
          <div className="py-14 text-center">
            <p className="text-slate-500">目前還沒有排行榜資料</p>
          </div>
        ) : (
          sorted.map((entry, i) => {
            const rank = i + 1;
            const name = entry.nickname ?? entry.id.slice(0, 8);
            const winRate = calcWinRate(entry.wins, entry.losses);
            const debateRank = tab === "debateMmr" ? getDebateRankFromMmr(entry.debate_mmr) : null;
            const banterRank = tab === "banterMmr" ? getBanterRankFromMmr(entry.banter_mmr) : null;
            const liveStatus = statusMap[entry.id];
            return (
              <div
                key={entry.id}
                className="grid min-w-[640px] grid-cols-[3rem_1fr_4rem_4rem_4rem_6rem_6rem] items-center gap-2 border-b border-slate-800/50 px-4 py-3 last:border-0 hover:bg-slate-900/60"
              >
                <span
                  className={`font-bold ${
                    rank === 1
                      ? "text-yellow-400"
                      : rank === 2
                        ? "text-slate-300"
                        : rank === 3
                          ? "text-orange-400"
                          : "text-slate-500"
                  }`}
                >
                  {rank <= 3 ? ["🥇", "🥈", "🥉"][rank - 1] : `#${rank}`}
                </span>
                <div className="flex min-w-0 flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <Avatar src={entry.avatar_url} name={name} size="sm" />
                    <span className="truncate font-medium text-white">{name}</span>
                    {liveStatus && liveStatus !== "offline" && (
                      <span
                        className={`shrink-0 text-xs ${getStatusBadgeClass(liveStatus)}`}
                        title={liveStatus === "in_match" ? "對局中" : liveStatus === "idle" ? "閒置" : "在線"}
                      >
                        {getStatusIcon(liveStatus)}
                      </span>
                    )}
                  </div>
                  {debateRank && (
                    <span className={`ml-8 text-xs ${debateRank.textClass}`}>{debateRank.fullName}</span>
                  )}
                  {banterRank && (
                    <span className={`ml-8 text-xs ${banterRank.textClass}`}>{banterRank.fullName}</span>
                  )}
                </div>
                <span className="text-right text-green-400">{entry.wins}</span>
                <span className="text-right text-red-400">{entry.losses}</span>
                <span className="text-right text-slate-300">{winRate}%</span>
                <span className="text-right font-mono text-slate-300">{entry.debate_mmr}</span>
                <span className="text-right font-mono text-slate-300">{entry.banter_mmr}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
