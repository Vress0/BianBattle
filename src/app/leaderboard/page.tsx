import { createClient } from "@/lib/supabase/server";
import LeaderboardTabs, { type LeaderboardProfile } from "@/app/leaderboard/LeaderboardTabs";

export default async function LeaderboardPage() {
  const supabase = await createClient();

  const { data: rawProfiles, error } = await supabase
    .from("profiles")
    .select("id, nickname, wins, losses, debate_mmr, banter_mmr")
    .limit(200);

  const entries: LeaderboardProfile[] = (rawProfiles ?? []).map((p) => ({
    id: p.id,
    nickname: p.nickname ?? null,
    wins: p.wins ?? 0,
    losses: p.losses ?? 0,
    debate_mmr: p.debate_mmr ?? 1000,
    banter_mmr: p.banter_mmr ?? 1000,
  }));

  return (
    <main className="min-h-screen bg-slate-950">
      <div className="mx-auto max-w-4xl px-4 py-12">
        <div className="mb-2 text-xs font-semibold uppercase tracking-widest text-yellow-400">
          LEADERBOARD
        </div>
        <h1 className="text-3xl font-bold text-white md:text-4xl">排行榜</h1>
        <p className="mt-2 text-slate-400">全平台玩家對戰數據排名。</p>

        <div className="mt-10">
          {error ? (
            <div className="rounded-2xl border border-red-900/50 bg-red-950/20 py-14 text-center">
              <p className="text-red-400">載入排行榜時發生錯誤，請稍後再試。</p>
            </div>
          ) : (
            <LeaderboardTabs entries={entries} />
          )}
        </div>
      </div>
    </main>
  );
}
