import Avatar from "@/components/ui/Avatar";
import RecentResultsStrip from "@/components/ui/RecentResultsStrip";
import FriendActionButton from "@/components/friends/FriendActionButton";
import { calcWinRate } from "@/lib/utils";
import { getDebateRankFromMmr, getBanterRankFromMmr } from "@/lib/rank";
import type { UserMatchResultKey } from "@/lib/match-display";
import {
  getStatusLabel,
  getStatusIcon,
  getStatusBadgeClass,
} from "@/lib/status-display";
import type { UserEffectiveStatus } from "@/lib/status-display";
import type { FriendshipState } from "@/lib/friends";

export interface UserInfoCardProps {
  id: string;
  nickname: string | null;
  avatarUrl: string | null;
  bio: string | null;
  wins: number;
  losses: number;
  debateMmr: number;
  banterMmr: number;
  side?: string;
  recentResults?: UserMatchResultKey[];
  status?: UserEffectiveStatus;
  currentMatchId?: string | null;
  currentMode?: string | null;
  // Friend system
  viewerId?: string | null;
  friendshipState?: FriendshipState;
  friendshipRequestId?: string | null;
}

function StatBox({
  value,
  label,
  valueClass,
}: {
  value: string;
  label: string;
  valueClass?: string;
}) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/40 py-2.5 text-center">
      <p className={`text-lg font-bold leading-none ${valueClass ?? "text-white"}`}>{value}</p>
      <p className="mt-1 text-xs text-slate-500">{label}</p>
    </div>
  );
}

export default function UserInfoCard({
  id,
  nickname,
  avatarUrl,
  bio,
  wins,
  losses,
  debateMmr,
  banterMmr,
  side,
  recentResults,
  status,
  currentMatchId,
  currentMode,
  viewerId,
  friendshipState,
  friendshipRequestId,
}: UserInfoCardProps) {
  const displayName = nickname ?? id.slice(0, 8);
  const total = wins + losses;
  const winRate = calcWinRate(wins, losses);
  const sideLabel = side === "pro" ? "正方" : side === "con" ? "反方" : null;
  const debateRank = getDebateRankFromMmr(debateMmr);
  const banterRank = getBanterRankFromMmr(banterMmr);

  return (
    <div className="rounded-2xl border border-slate-700/60 bg-slate-900 p-5">
      {/* Header: Avatar + Name + Bio */}
      <div className="flex items-start gap-4">
        <div className="shrink-0">
          <Avatar src={avatarUrl} name={displayName} size="lg" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-lg font-bold text-white">{displayName}</p>
            {sideLabel && (
              <span className="shrink-0 rounded-full border border-slate-600 px-2 py-0.5 text-xs text-slate-400">
                {sideLabel}
              </span>
            )}
          </div>
          <p className="font-mono text-xs text-slate-600">#{id.slice(0, 8)}</p>
          {status !== undefined && (
            <div className="mt-1.5">
              <span className={`inline-flex items-center gap-1 text-xs ${getStatusBadgeClass(status)}`}>
                {getStatusIcon(status)}
                {getStatusLabel(status)}
                {status === "in_match" && currentMode && (
                  <span className="text-slate-500">
                    · {currentMode === "debate" ? "辯論房" : "嘴砲房"}
                  </span>
                )}
                {status === "in_match" && currentMatchId && (
                  <a
                    href={`/matches/${currentMatchId}`}
                    className="ml-1 text-xs text-indigo-400 hover:underline"
                  >
                    觀戰
                  </a>
                )}
              </span>
            </div>
          )}
          <p className="mt-2 text-sm leading-relaxed">
            {bio ? (
              <span className="whitespace-pre-line text-slate-300 line-clamp-3">{bio}</span>
            ) : (
              <span className="italic text-slate-500">這位玩家還沒有填寫個人簡介。</span>
            )}
          </p>
        </div>
      </div>

      {/* Rank rows */}
      <div className="mt-4 space-y-2 rounded-xl border border-slate-800 bg-slate-950/40 px-4 py-3">
        {/* Debate rank */}
        <div className="flex items-center gap-2 text-sm">
          <span className="w-5 shrink-0 text-center text-base">⚖️</span>
          <span className="w-14 shrink-0 text-xs text-slate-500">辯論段位</span>
          <span className={`font-bold ${debateRank.textClass}`}>
            {debateRank.icon} {debateRank.title}
          </span>
          <span className="ml-auto font-mono text-xs text-slate-500">{debateMmr} MMR</span>
        </div>
        {/* Banter rank */}
        <div className="flex items-start gap-2 text-sm">
          <span className="w-5 shrink-0 pt-0.5 text-center text-base">🔥</span>
          <span className="w-14 shrink-0 pt-0.5 text-xs text-slate-500">嘴砲段位</span>
          <div className="flex-1">
            <span className={`font-bold ${banterRank.textClass}`}>
              {banterRank.icon} {banterRank.title}
            </span>
            <p className="text-xs text-slate-600">大招：{banterRank.ultimate}</p>
          </div>
          <span className="shrink-0 pt-0.5 font-mono text-xs text-slate-500">{banterMmr} MMR</span>
        </div>
      </div>

      {/* Stats */}
      <div className="mt-3 grid grid-cols-3 gap-2">
        <StatBox value={String(wins)} label="勝" valueClass="text-green-400" />
        <StatBox value={String(losses)} label="敗" valueClass="text-red-400" />
        <StatBox value={total > 0 ? `${winRate}%` : "—"} label="勝率" />
      </div>

      {/* Recent results strip */}
      {recentResults !== undefined && (
        <div className="mt-4 border-t border-slate-800 pt-3">
          <p className="mb-1.5 text-xs text-slate-500">最近戰績</p>
          <RecentResultsStrip results={recentResults} />
        </div>
      )}

      {/* Friend action — only shown when viewer and friendship state are provided */}
      {viewerId && friendshipState !== undefined && (
        <FriendActionButton
          viewerId={viewerId}
          targetUserId={id}
          targetNickname={displayName}
          initialState={friendshipState}
          requestId={friendshipRequestId}
        />
      )}
    </div>
  );
}
