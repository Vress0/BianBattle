"use client";

import { useState } from "react";
import type { LeaderboardEntry } from "@/types";
import {
  RANK_LABELS,
  RANK_ICONS,
  RANK_TEXT_COLORS,
} from "@/lib/constants";

interface LeaderboardTabsProps {
  debateEntries: LeaderboardEntry[];
  banterEntries: LeaderboardEntry[];
  currentPlayerId: string;
}

export default function LeaderboardTabs({
  debateEntries,
  banterEntries,
  currentPlayerId,
}: LeaderboardTabsProps) {
  const [activeTab, setActiveTab] = useState<"debate" | "banter">("debate");

  const entries = activeTab === "debate" ? debateEntries : banterEntries;

  return (
    <div>
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab("debate")}
          className={`rounded-xl px-5 py-2 text-sm font-semibold transition-colors ${
            activeTab === "debate"
              ? "bg-indigo-600 text-white"
              : "bg-slate-800 text-slate-400 hover:bg-slate-700"
          }`}
        >
          辯論排行榜
        </button>
        <button
          onClick={() => setActiveTab("banter")}
          className={`rounded-xl px-5 py-2 text-sm font-semibold transition-colors ${
            activeTab === "banter"
              ? "bg-amber-500 text-slate-950"
              : "bg-slate-800 text-slate-400 hover:bg-slate-700"
          }`}
        >
          嘴砲排行榜
        </button>
      </div>

      <div className="mt-5 overflow-hidden rounded-2xl border border-slate-800">
        <div className="grid grid-cols-[3rem_1fr_7rem_5rem_5rem] border-b border-slate-800 bg-slate-900/80 px-4 py-3 text-xs font-semibold text-slate-500">
          <span>名次</span>
          <span>玩家</span>
          <span className="text-right">MMR</span>
          <span className="text-right">勝率</span>
          <span className="text-right">勝場</span>
        </div>

        {entries.map((entry) => {
          const isSelf = entry.player.id === currentPlayerId;
          const rankKey = activeTab === "debate" ? entry.player.debateRank : entry.player.banterRank;

          return (
            <div
              key={entry.player.id}
              className={`grid grid-cols-[3rem_1fr_7rem_5rem_5rem] items-center px-4 py-4 transition-colors ${
                isSelf
                  ? "bg-indigo-950/40 hover:bg-indigo-950/60"
                  : "hover:bg-slate-900/60"
              } border-b border-slate-800/50 last:border-0`}
            >
              <span
                className={`font-bold ${
                  entry.rank === 1
                    ? "text-yellow-400"
                    : entry.rank === 2
                      ? "text-slate-300"
                      : entry.rank === 3
                        ? "text-orange-400"
                        : "text-slate-500"
                }`}
              >
                {entry.rank <= 3 ? ["🥇", "🥈", "🥉"][entry.rank - 1] : `#${entry.rank}`}
              </span>

              <div className="flex min-w-0 items-center gap-2">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-800 text-sm font-bold text-white">
                  {entry.player.name.charAt(0)}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="truncate font-medium text-white">
                      {entry.player.name}
                    </span>
                    {isSelf && (
                      <span className="rounded-full bg-indigo-900/50 px-1.5 py-0.5 text-xs text-indigo-400">
                        你
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <span>{RANK_ICONS[rankKey]}</span>
                    <span className={`text-xs ${RANK_TEXT_COLORS[rankKey]}`}>
                      {RANK_LABELS[rankKey]}
                    </span>
                  </div>
                </div>
              </div>

              <span className="text-right font-mono font-semibold text-white">
                {entry.mmr.toLocaleString()}
              </span>
              <span className="text-right font-medium text-slate-300">
                {entry.winRate}%
              </span>
              <span className="text-right text-slate-400">{entry.wins}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
