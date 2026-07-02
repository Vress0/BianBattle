import { createClient } from "@/lib/supabase/server";
import LeaderboardTabs, { type LeaderboardProfile } from "@/app/leaderboard/LeaderboardTabs";
import { getEffectiveUserStatus } from "@/lib/status-display";
import type { UserStatusRow } from "@/lib/status-display";

export default async function LeaderboardPage() {
  const supabase = await createClient();

  const { data: rawProfiles, error } = await supabase
    .from("profiles")
    .select("id, nickname, avatar_url, wins, losses, debate_mmr, banter_mmr")
    .limit(200);

  // Fetch statuses for all profiles (best-effort — table may not exist yet)
  const userIds = (rawProfiles ?? []).map((p) => p.id as string);
  const statusMap: Record<string, UserStatusRow> = {};
  if (userIds.length > 0) {
    const { data: statusRows } = await supabase
      .from("user_statuses")
      .select("user_id, status, current_match_id, current_mode, last_seen_at")
      .in("user_id", userIds);
    for (const row of statusRows ?? []) {
      statusMap[row.user_id as string] = row as UserStatusRow;
    }
  }

  const entries: LeaderboardProfile[] = (rawProfiles ?? []).map((p) => ({
    id: p.id as string,
    nickname: (p.nickname as string | null) ?? null,
    avatar_url: (p.avatar_url as string | null) ?? null,
    wins: (p.wins as number) ?? 0,
    losses: (p.losses as number) ?? 0,
    debate_mmr: (p.debate_mmr as number) ?? 1000,
    banter_mmr: (p.banter_mmr as number) ?? 1000,
    effectiveStatus: getEffectiveUserStatus(statusMap[p.id as string] ?? null),
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
