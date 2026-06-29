import LeaderboardTabs from "@/app/leaderboard/LeaderboardTabs";
import {
  MOCK_LEADERBOARD_DEBATE,
  MOCK_LEADERBOARD_BANTER,
  MOCK_CURRENT_PLAYER,
} from "@/lib/mockData";

export default function LeaderboardPage() {
  return (
    <main className="min-h-screen bg-slate-950">
      <div className="mx-auto max-w-4xl px-4 py-12">
        <div className="mb-2 text-xs font-semibold uppercase tracking-widest text-yellow-400">
          LEADERBOARD
        </div>
        <h1 className="text-3xl font-bold text-white md:text-4xl">排行榜</h1>
        <p className="mt-2 text-slate-400">
          本賽季最強辯論者與嘴砲王排名。
        </p>

        <div className="mt-10">
          <LeaderboardTabs
            debateEntries={MOCK_LEADERBOARD_DEBATE}
            banterEntries={MOCK_LEADERBOARD_BANTER}
            currentPlayerId={MOCK_CURRENT_PLAYER.id}
          />
        </div>
      </div>
    </main>
  );
}
