import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  RANK_LABELS,
  RANK_ICONS,
  RANK_TEXT_COLORS,
  RANK_BORDER_COLORS,
} from "@/lib/constants";
import { MOCK_RECENT_MATCHES } from "@/lib/mockData";
import { calcWinRate, formatDate } from "@/lib/utils";
import { mmrToRank } from "@/lib/rank";
import ProfileEditForm from "./ProfileEditForm";
import type { RankTier } from "@/types";

interface Profile {
  nickname: string | null;
  debate_mmr: number;
  banter_mmr: number;
  wins: number;
  losses: number;
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
  const winRate = calcWinRate(profile.wins, profile.losses);
  const debateRank = mmrToRank(profile.debate_mmr);
  const banterRank = mmrToRank(profile.banter_mmr);

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
          <div className="mt-6 grid grid-cols-3 divide-x divide-slate-800 text-center">
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
                {profile.wins + profile.losses > 0 ? `${winRate}%` : "—"}
              </p>
              <p className="text-xs text-slate-500">勝率</p>
            </div>
          </div>
        </section>

        {/* 段位卡 */}
        <section className="mt-5 grid gap-4 sm:grid-cols-2">
          <RankCard
            label="辯論段位"
            icon="⚖️"
            rank={debateRank}
            mmr={profile.debate_mmr}
          />
          <RankCard
            label="嘴砲段位"
            icon="🔥"
            rank={banterRank}
            mmr={profile.banter_mmr}
          />
        </section>

        {/* 最近對戰 */}
        <section className="mt-8">
          <h2 className="mb-4 text-lg font-semibold text-white">最近對戰</h2>
          <div className="space-y-3">
            {MOCK_RECENT_MATCHES.map((match) => (
              <div
                key={match.id}
                className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900 p-4"
              >
                <span
                  className={`w-8 shrink-0 rounded-lg py-1 text-center text-xs font-bold ${
                    match.result === "win"
                      ? "bg-green-900/50 text-green-400"
                      : "bg-red-900/50 text-red-400"
                  }`}
                >
                  {match.result === "win" ? "勝" : "敗"}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-white">{match.topic}</p>
                  <p className="text-xs text-slate-500">
                    vs {match.opponent} · {match.mode} ·{" "}
                    {match.type === "debate" ? "辯論" : "嘴砲"} ·{" "}
                    {formatDate(match.date)}
                  </p>
                </div>
              </div>
            ))}
          </div>
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
          <p className={`text-lg font-bold ${RANK_TEXT_COLORS[rank]}`}>
            {RANK_LABELS[rank]}
          </p>
          <p className="text-sm text-slate-400">{mmr.toLocaleString()} MMR</p>
        </div>
      </div>
    </div>
  );
}
