import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  RANK_LABELS,
  RANK_ICONS,
  RANK_TEXT_COLORS,
  RANK_BORDER_COLORS,
} from "@/lib/constants";
import { calcWinRate } from "@/lib/utils";
import { mmrToRank } from "@/lib/rank";
import { modeLabel, endedReasonLabel, formatDateTime } from "@/lib/match-display";
import ProfileEditForm from "./ProfileEditForm";
import type { RankTier } from "@/types";

interface Profile {
  nickname: string | null;
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
  resultLabel: string;
  resultClass: string;
  opponentName: string;
  when: string;
}

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
        <div className="text-center">
          <p className="mb-2 text-4xl">🔒</p>
          <h1 className="mb-2 text-2xl font-bold text-white">請先登入</h1>
          <p className="mb-6 text-slate-400">登入後即可查看個人資料與對戰記錄。</p>
          <Link
            href="/auth/login"
            className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500"
          >
            前往登入
          </Link>
        </div>
      </main>
    );
  }

  const { data: rawProfile } = await supabase
    .from("profiles")
    .select("nickname, debate_mmr, banter_mmr, wins, losses")
    .eq("id", user.id)
    .single();

  const profile: Profile = {
    nickname: rawProfile?.nickname ?? null,
    debate_mmr: rawProfile?.debate_mmr ?? 1000,
    banter_mmr: rawProfile?.banter_mmr ?? 1000,
    wins: rawProfile?.wins ?? 0,
    losses: rawProfile?.losses ?? 0,
  };

  const displayName = profile.nickname ?? user.id.slice(0, 8);
  const totalGames = profile.wins + profile.losses;
  const winRate = calcWinRate(profile.wins, profile.losses);
  const debateRank = mmrToRank(profile.debate_mmr);
  const banterRank = mmrToRank(profile.banter_mmr);

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
      .select("id, title, mode, status, ended_reason, winner_side, is_rated, created_at, ended_at")
      .in("id", myMatchIds)
      .order("created_at", { ascending: false })
      .limit(10);

    if (matchesError) {
      historyError = true;
    } else {
      const ids = (matches ?? []).map((m) => m.id);
      const { data: allPlayers } =
        ids.length > 0
          ? await supabase.from("match_players").select("match_id, user_id, side").in("match_id", ids)
          : { data: [] };

      const opponentIdByMatch: Record<string, string | null> = {};
      for (const p of allPlayers ?? []) {
        if (p.match_id in sideByMatch && p.side !== sideByMatch[p.match_id]) {
          opponentIdByMatch[p.match_id] = p.user_id;
        }
      }

      const opponentIds = [
        ...new Set(Object.values(opponentIdByMatch).filter((v): v is string => Boolean(v))),
      ];
      const opponentNameMap: Record<string, string | null> = {};
      if (opponentIds.length > 0) {
        const { data: opponentProfiles } = await supabase
          .from("profiles")
          .select("id, nickname")
          .in("id", opponentIds);
        for (const p of opponentProfiles ?? []) opponentNameMap[p.id] = p.nickname ?? null;
      }

      recentMatches = (matches ?? []).map((m) => {
        const userSide = sideByMatch[m.id];
        let resultLabel: string;
        let resultClass: string;
        if (m.status === "cancelled") {
          resultLabel = "取消";
          resultClass = "bg-slate-800 text-slate-400";
        } else if (!m.is_rated || !m.winner_side) {
          resultLabel = "不計分";
          resultClass = "bg-slate-800 text-slate-400";
        } else if (m.winner_side === userSide) {
          resultLabel = "勝";
          resultClass = "bg-green-900/50 text-green-400";
        } else {
          resultLabel = "敗";
          resultClass = "bg-red-900/50 text-red-400";
        }

        const opponentId = opponentIdByMatch[m.id] ?? null;
        const opponentName = opponentId
          ? (opponentNameMap[opponentId] ?? opponentId.slice(0, 8))
          : "無對手";

        return {
          id: m.id,
          title: m.title,
          mode: m.mode,
          status: m.status,
          ended_reason: m.ended_reason,
          is_rated: m.is_rated,
          resultLabel,
          resultClass,
          opponentName,
          when: m.ended_at ?? m.created_at,
        };
      });
    }
  }

  return (
    <main className="min-h-screen bg-slate-950">
      <div className="mx-auto max-w-4xl px-4 py-12">
        {/* 玩家資訊卡 */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div className="flex items-start gap-5">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-indigo-900 text-2xl font-bold text-white">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-bold text-white">{displayName}</h1>
              <p className="mt-0.5 font-mono text-xs text-slate-600">UID: {user.id.slice(0, 12)}…</p>
              <ProfileEditForm userId={user.id} currentNickname={profile.nickname} />
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
              <p className="text-2xl font-bold text-white">{totalGames > 0 ? `${winRate}%` : "—"}</p>
              <p className="text-xs text-slate-500">勝率</p>
            </div>
          </div>
        </section>

        {/* 段位卡 */}
        <section className="mt-5 grid gap-4 sm:grid-cols-2">
          <RankCard label="辯論段位" icon="⚖️" rank={debateRank} mmr={profile.debate_mmr} />
          <RankCard label="嘴砲段位" icon="🔥" rank={banterRank} mmr={profile.banter_mmr} />
        </section>

        {/* 最近對戰 */}
        <section className="mt-8">
          <h2 className="mb-4 text-lg font-semibold text-white">最近 10 場對戰紀錄</h2>
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
                    className={`w-10 shrink-0 rounded-lg py-1 text-center text-xs font-bold ${match.resultClass}`}
                  >
                    {match.resultLabel}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-white">{match.title}</p>
                    <p className="text-xs text-slate-500">
                      vs {match.opponentName} · {modeLabel(match.mode)} ·{" "}
                      {endedReasonLabel(match.ended_reason)} ·{" "}
                      {match.is_rated ? "計入戰績" : "不計入戰績"} · {formatDateTime(match.when)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-700 py-14 text-center">
              <p className="text-slate-500">還沒有對戰紀錄，去開一場辯論吧！</p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

interface RankCardProps {
  label: string;
  icon: string;
  rank: RankTier;
  mmr: number;
}

function RankCard({ label, icon, rank, mmr }: RankCardProps) {
  return (
    <div className={`rounded-2xl border ${RANK_BORDER_COLORS[rank]} bg-slate-900 p-5`}>
      <div className="flex items-center gap-2 text-sm text-slate-400">
        <span>{icon}</span>
        <span>{label}</span>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <span className="text-3xl">{RANK_ICONS[rank]}</span>
        <div>
          <p className={`text-lg font-bold ${RANK_TEXT_COLORS[rank]}`}>{RANK_LABELS[rank]}</p>
          <p className="text-sm text-slate-400">{mmr.toLocaleString()} MMR</p>
        </div>
      </div>
    </div>
  );
}
