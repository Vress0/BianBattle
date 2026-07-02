import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserSafe } from "@/lib/auth/get-current-user";
import { calcWinRate } from "@/lib/utils";
import {
  getDebateRankFromMmr,
  getBanterRankFromMmr,
} from "@/lib/rank";
import type { DebateRankInfo, BanterRankInfo } from "@/lib/rank";
import {
  getEffectiveUserStatus,
  getStatusLabel,
  getStatusIcon,
  getStatusBadgeClass,
} from "@/lib/status-display";
import type { UserStatusRow } from "@/lib/status-display";
import {
  modeLabel,
  endedReasonLabel,
  formatDateTime,
  getUserMatchResult,
  getResultSymbol,
  getResultSymbolClass,
  getResultBgClass,
  getResultAriaLabel,
} from "@/lib/match-display";
import type { UserMatchResultKey } from "@/lib/match-display";
import ProfileEditForm from "./ProfileEditForm";
import AvatarUpload from "@/components/profile/AvatarUpload";
import BioEditor from "@/components/profile/BioEditor";
import RecentResultsStrip from "@/components/ui/RecentResultsStrip";

interface Profile {
  nickname: string | null;
  avatar_url: string | null;
  bio: string | null;
  debate_mmr: number;
  banter_mmr: number;
  wins: number;
  losses: number;
}

interface RecentMatchRow {
  id: string;
  title: string;
  mode: string;
  status: string;
  ended_reason: string | null;
  is_rated: boolean;
  resultKey: UserMatchResultKey;
  opponentName: string;
  when: string;
  isBookmarked: boolean;
  hasNote: boolean;
}

export default async function ProfilePage() {
  const supabase = await createClient();
  const user = await getCurrentUserSafe(supabase);

  if (!user) {
    redirect("/auth/login?redirectTo=/profile");
  }

  const { data: rawProfile } = await supabase
    .from("profiles")
    .select("nickname, avatar_url, bio, debate_mmr, banter_mmr, wins, losses")
    .eq("id", user.id)
    .single();

  const profile: Profile = {
    nickname: rawProfile?.nickname ?? null,
    avatar_url: (rawProfile?.avatar_url as string | null) ?? null,
    bio: (rawProfile?.bio as string | null) ?? null,
    debate_mmr: rawProfile?.debate_mmr ?? 1000,
    banter_mmr: rawProfile?.banter_mmr ?? 1000,
    wins: rawProfile?.wins ?? 0,
    losses: rawProfile?.losses ?? 0,
  };

  const displayName = profile.nickname ?? user.id.slice(0, 8);
  const totalGames = profile.wins + profile.losses;
  const winRate = calcWinRate(profile.wins, profile.losses);
  const debateRankInfo = getDebateRankFromMmr(profile.debate_mmr);
  const banterRankInfo = getBanterRankFromMmr(profile.banter_mmr);

  // Own status — best-effort (table may not exist yet)
  const { data: statusRow } = await supabase
    .from("user_statuses")
    .select("status, current_match_id, current_mode, last_seen_at")
    .eq("user_id", user.id)
    .maybeSingle();
  const ownStatus = getEffectiveUserStatus(statusRow as UserStatusRow | null);

  // ─── Recent match history ──────────────────────────────────────────────────
  let recentMatches: RecentMatchRow[] = [];
  let historyError = false;

  const { data: myPlayerRows, error: myPlayerError } = await supabase
    .from("match_players")
    .select("match_id, side")
    .eq("user_id", user.id);

  if (myPlayerError) {
    historyError = true;
  } else if (myPlayerRows && myPlayerRows.length > 0) {
    const sideByMatch: Record<string, string> = {};
    for (const r of myPlayerRows) sideByMatch[r.match_id] = r.side;
    const myMatchIds = myPlayerRows.map((r) => r.match_id);

    const { data: matches, error: matchesError } = await supabase
      .from("matches")
      .select(
        "id, title, mode, status, ended_reason, winner_side, is_rated, created_at, ended_at"
      )
      .in("id", myMatchIds)
      .order("created_at", { ascending: false })
      .limit(10);

    if (matchesError) {
      historyError = true;
    } else {
      const ids = (matches ?? []).map((m) => m.id);

      const { data: allPlayers } =
        ids.length > 0
          ? await supabase
              .from("match_players")
              .select("match_id, user_id, side")
              .in("match_id", ids)
          : { data: [] };

      const opponentIdByMatch: Record<string, string | null> = {};
      for (const p of allPlayers ?? []) {
        if (p.match_id in sideByMatch && p.side !== sideByMatch[p.match_id]) {
          opponentIdByMatch[p.match_id] = p.user_id;
        }
      }

      const opponentIds = [
        ...new Set(
          Object.values(opponentIdByMatch).filter((v): v is string => Boolean(v))
        ),
      ];
      const opponentNameMap: Record<string, string | null> = {};
      if (opponentIds.length > 0) {
        const { data: opponentProfiles } = await supabase
          .from("profiles")
          .select("id, nickname")
          .in("id", opponentIds);
        for (const p of opponentProfiles ?? [])
          opponentNameMap[p.id] = p.nickname ?? null;
      }

      // Bookmarks + notes for these 10 matches
      const { data: bookmarks } =
        ids.length > 0
          ? await supabase
              .from("match_bookmarks")
              .select("match_id")
              .eq("user_id", user.id)
              .in("match_id", ids)
          : { data: [] };
      const bookmarkedSet = new Set((bookmarks ?? []).map((b) => b.match_id as string));

      const { data: notes } =
        ids.length > 0
          ? await supabase
              .from("match_notes")
              .select("match_id")
              .eq("user_id", user.id)
              .in("match_id", ids)
          : { data: [] };
      const noteMatchIds = new Set((notes ?? []).map((n) => n.match_id as string));

      recentMatches = (matches ?? []).map((m) => {
        const userSide = sideByMatch[m.id];
        const resultKey = getUserMatchResult(
          m.status as string,
          (m.winner_side as string | null) ?? null,
          m.is_rated as boolean,
          userSide
        );

        const opponentId = opponentIdByMatch[m.id] ?? null;
        const opponentName = opponentId
          ? (opponentNameMap[opponentId] ?? opponentId.slice(0, 8))
          : "無對手";

        return {
          id: m.id as string,
          title: m.title as string,
          mode: m.mode as string,
          status: m.status as string,
          ended_reason: (m.ended_reason as string | null) ?? null,
          is_rated: m.is_rated as boolean,
          resultKey,
          opponentName,
          when: (m.ended_at as string | null) ?? (m.created_at as string),
          isBookmarked: bookmarkedSet.has(m.id as string),
          hasNote: noteMatchIds.has(m.id as string),
        };
      });
    }
  }

  const recentResults: UserMatchResultKey[] = recentMatches.map((m) => m.resultKey);

  return (
    <main className="min-h-screen bg-slate-950">
      <div className="mx-auto max-w-4xl px-4 py-12">
        {/* 玩家資訊卡 */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div className="flex flex-col items-start gap-5 sm:flex-row">
            {/* Avatar */}
            <div className="shrink-0">
              <AvatarUpload
                userId={user.id}
                currentAvatarUrl={profile.avatar_url}
                displayName={displayName}
              />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-bold text-white">{displayName}</h1>
              <p className="mt-0.5 font-mono text-xs text-slate-600">
                UID: {user.id.slice(0, 12)}…
              </p>
              <div className="mt-1.5">
                <span className={`inline-flex items-center gap-1 rounded-full border border-slate-700/60 bg-slate-800/60 px-2.5 py-0.5 text-xs ${getStatusBadgeClass(ownStatus)}`}>
                  {getStatusIcon(ownStatus)} {getStatusLabel(ownStatus)}
                </span>
              </div>
              <ProfileEditForm userId={user.id} currentNickname={profile.nickname} />
              <BioEditor userId={user.id} currentBio={profile.bio} />
            </div>
          </div>

          {/* 統計 */}
          <div className="mt-6 grid grid-cols-2 divide-x divide-slate-800 text-center sm:grid-cols-4">
            <div className="py-2">
              <p className="text-2xl font-bold text-white">{totalGames}</p>
              <p className="text-xs text-slate-500">總場次</p>
            </div>
            <div className="py-2">
              <p className="text-2xl font-bold text-green-400">{profile.wins}</p>
              <p className="text-xs text-slate-500">勝場</p>
            </div>
            <div className="py-2">
              <p className="text-2xl font-bold text-red-400">{profile.losses}</p>
              <p className="text-xs text-slate-500">敗場</p>
            </div>
            <div className="py-2">
              <p className="text-2xl font-bold text-white">
                {totalGames > 0 ? `${winRate}%` : "—"}
              </p>
              <p className="text-xs text-slate-500">勝率</p>
            </div>
          </div>

          {/* 最近戰績 O/X */}
          {recentResults.length > 0 && (
            <div className="mt-5 border-t border-slate-800 pt-4">
              <p className="mb-2 text-xs font-medium text-slate-500">最近戰績</p>
              <RecentResultsStrip results={recentResults} />
            </div>
          )}
        </section>

        {/* 段位卡 */}
        <section className="mt-5 grid gap-4 sm:grid-cols-2">
          <DebateRankCard rank={debateRankInfo} mmr={profile.debate_mmr} />
          <BanterRankCard rank={banterRankInfo} mmr={profile.banter_mmr} />
        </section>

        {/* 最近對戰 */}
        <section className="mt-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">最近 10 場對戰紀錄</h2>
            <Link
              href="/profile/history"
              className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-indigo-500"
            >
              查看全部歷史戰績
            </Link>
          </div>
          {historyError ? (
            <div className="rounded-xl border border-red-900/50 bg-red-950/20 py-10 text-center">
              <p className="text-red-400">載入對戰紀錄時發生錯誤，請稍後再試。</p>
            </div>
          ) : recentMatches.length > 0 ? (
            <div className="space-y-3">
              {recentMatches.map((match) => (
                <Link
                  key={match.id}
                  href={`/matches/${match.id}/result`}
                  className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900 p-4 transition-colors hover:border-slate-700 hover:bg-slate-800/60"
                >
                  <span
                    className={`inline-flex w-12 shrink-0 items-center justify-center gap-0.5 rounded-lg py-1 text-xs font-bold ${getResultBgClass(match.resultKey)} ${getResultSymbolClass(match.resultKey)}`}
                    title={getResultAriaLabel(match.resultKey)}
                    aria-label={getResultAriaLabel(match.resultKey)}
                  >
                    {getResultSymbol(match.resultKey)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate font-medium text-white">{match.title}</p>
                      {match.isBookmarked && (
                        <span className="shrink-0 text-xs text-yellow-400">★</span>
                      )}
                      {match.hasNote && (
                        <span className="shrink-0 text-xs text-slate-500">📝</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500">
                      vs {match.opponentName} · {modeLabel(match.mode)} ·{" "}
                      {endedReasonLabel(match.ended_reason)} ·{" "}
                      {match.is_rated ? "計入戰績" : "不計入戰績"} ·{" "}
                      {formatDateTime(match.when)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-700 py-14 text-center">
              <p className="mb-4 text-slate-500">還沒有對戰紀錄，去開一場辯論吧！</p>
              <div className="flex justify-center gap-3">
                <Link
                  href="/rooms/debate"
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500"
                >
                  前往辯論房
                </Link>
                <Link
                  href="/rooms/banter"
                  className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-amber-500"
                >
                  前往嘴砲房
                </Link>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function DebateRankCard({ rank, mmr }: { rank: DebateRankInfo; mmr: number }) {
  return (
    <div className={`rounded-2xl border ${rank.borderClass} bg-slate-900 p-5`}>
      <div className="flex items-center gap-2 text-sm text-slate-400">
        <span>⚖️</span>
        <span>辯論段位</span>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <span className="text-3xl">{rank.icon}</span>
        <div>
          <p className={`text-lg font-bold ${rank.textClass}`}>{rank.title}</p>
          <p className="text-sm text-slate-400">{mmr.toLocaleString()} MMR</p>
        </div>
      </div>
      <p className="mt-2 text-xs text-slate-500">{rank.description}</p>
    </div>
  );
}

function BanterRankCard({ rank, mmr }: { rank: BanterRankInfo; mmr: number }) {
  return (
    <div className={`rounded-2xl border ${rank.borderClass} bg-slate-900 p-5`}>
      <div className="flex items-center gap-2 text-sm text-slate-400">
        <span>🔥</span>
        <span>嘴砲段位</span>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <span className="text-3xl">{rank.icon}</span>
        <div>
          <p className={`text-lg font-bold ${rank.textClass}`}>{rank.title}</p>
          <p className="text-sm text-slate-400">{mmr.toLocaleString()} MMR · {rank.baseName}</p>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
        <span>特徵：{rank.trait}</span>
        <span>大招：{rank.ultimate}</span>
      </div>
      <p className="mt-1 text-xs text-slate-600">{rank.description}</p>
    </div>
  );
}
