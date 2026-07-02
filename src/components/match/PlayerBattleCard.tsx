"use client";

import Avatar from "@/components/ui/Avatar";
import RecentResultsStrip from "@/components/ui/RecentResultsStrip";
import { getDebateRankFromMmr, getBanterRankFromMmr } from "@/lib/rank";
import type { UserMatchResultKey } from "@/lib/match-display";
import type { UserEffectiveStatus } from "@/lib/status-display";
import { getStatusIcon, getStatusLabel, getStatusBadgeClass } from "@/lib/status-display";

export interface PlayerBattleProfile {
  userId: string;
  nickname: string | null;
  avatar_url: string | null;
  bio: string | null;
  wins: number;
  losses: number;
  debate_mmr: number;
  banter_mmr: number;
}

interface Props {
  side: "pro" | "con";
  mode: "debate" | "banter";
  player?: PlayerBattleProfile | null;
  status?: UserEffectiveStatus;
  recentResults?: UserMatchResultKey[];
  isCurrentUser?: boolean;
  onViewProfile?: () => void;
}

const SIDE_CONFIG = {
  pro: { label: "正方", icon: "⚖️", borderClass: "border-indigo-900/60", labelClass: "text-indigo-400" },
  con: { label: "反方", icon: "🛡️", borderClass: "border-slate-700/60", labelClass: "text-slate-400" },
} as const;

export default function PlayerBattleCard({
  side,
  mode,
  player,
  status,
  recentResults,
  isCurrentUser,
  onViewProfile,
}: Props) {
  const config = SIDE_CONFIG[side];
  const name = player?.nickname ?? (player ? player.userId.slice(0, 8) : null);

  if (!player) {
    return (
      <div
        className={`flex min-h-[148px] flex-col items-center justify-center gap-2 rounded-xl border ${config.borderClass} bg-slate-900 p-4 text-center`}
      >
        <p className={`text-xs font-semibold uppercase tracking-widest ${config.labelClass}`}>
          {config.icon} {config.label}
        </p>
        <p className="text-sm text-slate-500">等待{config.label}加入</p>
      </div>
    );
  }

  const mmr = mode === "debate" ? player.debate_mmr : player.banter_mmr;
  const rank = mode === "debate" ? getDebateRankFromMmr(mmr) : getBanterRankFromMmr(mmr);
  const total = player.wins + player.losses;
  const winRate = total > 0 ? Math.round((player.wins / total) * 100) : null;

  return (
    <div
      className={`flex flex-col items-center gap-2.5 rounded-xl border ${config.borderClass} bg-slate-900 p-4`}
    >
      <p className={`text-xs font-semibold uppercase tracking-widest ${config.labelClass}`}>
        {config.icon} {config.label}
      </p>

      <Avatar src={player.avatar_url} name={name ?? "?"} size="lg" />

      <div className="text-center">
        <p className="font-semibold text-white">
          {name}
          {isCurrentUser && <span className="ml-1.5 text-xs text-indigo-400">（你）</span>}
        </p>
        {status && (
          <p className={`mt-0.5 text-xs ${getStatusBadgeClass(status)}`}>
            {getStatusIcon(status)} {getStatusLabel(status)}
          </p>
        )}
      </div>

      <p className={`text-sm font-semibold ${rank.textClass}`}>{rank.fullName}</p>

      <div className="text-center text-xs text-slate-400">
        <span className="font-mono font-bold text-white">{mmr}</span>
        <span className="mx-1 text-slate-600">MMR</span>
        <span className="text-green-400">{player.wins}勝</span>
        <span className="mx-0.5 text-slate-600">/</span>
        <span className="text-red-400">{player.losses}負</span>
        {winRate !== null && (
          <>
            <span className="mx-1 text-slate-600">·</span>
            <span className="text-slate-400">{winRate}%</span>
          </>
        )}
      </div>

      {recentResults && recentResults.length > 0 && (
        <RecentResultsStrip results={recentResults} maxItems={5} />
      )}

      {onViewProfile && (
        <button
          onClick={onViewProfile}
          className="mt-0.5 text-xs text-slate-500 transition-colors hover:text-indigo-400"
        >
          查看資料
        </button>
      )}
    </div>
  );
}
