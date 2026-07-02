import Avatar from "@/components/ui/Avatar";
import FriendActionButton from "@/components/friends/FriendActionButton";
import { getDebateRankFromMmr, getBanterRankFromMmr } from "@/lib/rank";
import { calcWinRate } from "@/lib/utils";
import type { FriendshipState } from "@/lib/friends";

export interface UserSearchResult {
  id: string;
  nickname: string | null;
  avatar_url: string | null;
  bio: string | null;
  wins: number;
  losses: number;
  debate_mmr: number;
  banter_mmr: number;
  effectiveStatus: string;
  friendshipState: FriendshipState | null;
  requestId: string | null;
}

interface Props {
  result: UserSearchResult;
  viewerId: string | null;
}

export default function UserSearchResultCard({ result, viewerId }: Props) {
  const name = result.nickname ?? result.id.slice(0, 8);
  const debateRank = getDebateRankFromMmr(result.debate_mmr);
  const banterRank = getBanterRankFromMmr(result.banter_mmr);
  const total = result.wins + result.losses;
  const winRate = calcWinRate(result.wins, result.losses);
  const statusColor =
    result.effectiveStatus === "online" || result.effectiveStatus === "idle"
      ? "bg-green-400"
      : result.effectiveStatus === "in_match"
      ? "bg-purple-400"
      : "bg-slate-600";

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
      <div className="flex items-center gap-3">
        <div className="relative shrink-0">
          <Avatar src={result.avatar_url} name={name} size="md" />
          <span
            className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-slate-900 ${statusColor}`}
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-white">{name}</p>
          <p className="font-mono text-xs text-slate-600">#{result.id.slice(0, 8)}</p>
        </div>
      </div>

      {result.bio && (
        <p className="mt-2 truncate text-xs text-slate-400">{result.bio}</p>
      )}

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
        <span>
          ⚖️{" "}
          <span className={debateRank.textClass}>
            {debateRank.icon} {debateRank.title}
          </span>
          <span className="ml-1 font-mono text-slate-600">{result.debate_mmr}</span>
        </span>
        <span>
          🔥{" "}
          <span className={banterRank.textClass}>
            {banterRank.icon} {banterRank.title}
          </span>
          <span className="ml-1 font-mono text-slate-600">{result.banter_mmr}</span>
        </span>
        {total > 0 && (
          <span>
            <span className="text-green-400">{result.wins}W</span>
            {" / "}
            <span className="text-red-400">{result.losses}L</span>
            {" · "}
            {winRate}%
          </span>
        )}
      </div>

      {viewerId && (
        <FriendActionButton
          viewerId={viewerId}
          targetUserId={result.id}
          initialState={result.friendshipState ?? "none"}
          requestId={result.requestId}
        />
      )}
    </div>
  );
}
