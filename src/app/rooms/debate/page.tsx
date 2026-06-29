import MatchModeCard from "@/components/room/MatchModeCard";
import RoomCard from "@/components/room/RoomCard";
import QueuePanel from "@/components/room/QueuePanel";
import { MOCK_DEBATE_ROOMS } from "@/lib/mockData";

const MODES = [
  {
    mode: "1v1" as const,
    playerCount: 1,
    description: "最純粹的單挑對決，考驗個人立論與反駁能力。",
  },
  {
    mode: "3v3" as const,
    playerCount: 3,
    description: "隊友協作，分工立論，展現團隊辯論默契。",
  },
  {
    mode: "5v5" as const,
    playerCount: 5,
    description: "大型辯論陣容，策略更豐富，勝負更精彩。",
  },
];

export default function DebateRoomPage() {
  return (
    <main className="min-h-screen bg-slate-950">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="mb-2 text-xs font-semibold uppercase tracking-widest text-indigo-400">
          DEBATE ROOM
        </div>
        <h1 className="text-3xl font-bold text-white md:text-4xl">辯論房</h1>
        <p className="mt-2 text-slate-400">
          正式回合制辯論模式。每回合計時發言，AI
          即時評分，賽後詳細分析報告。
        </p>

        <section className="mt-10">
          <h2 className="mb-4 text-lg font-semibold text-white">選擇模式</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {MODES.map((m, i) => (
              <MatchModeCard
                key={m.mode}
                mode={m.mode}
                playerCount={m.playerCount}
                description={m.description}
                isSelected={i === 0}
                accentColor="indigo"
              />
            ))}
          </div>
        </section>

        <div className="mt-10 grid gap-8 lg:grid-cols-3">
          <section className="lg:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">進行中的房間</h2>
              <div className="flex gap-2">
                <span className="rounded-full border border-indigo-700/50 bg-indigo-900/30 px-3 py-1 text-xs text-indigo-300">
                  一般對戰
                </span>
                <span className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-400">
                  排位對戰
                </span>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {MOCK_DEBATE_ROOMS.map((room) => (
                <RoomCard key={room.id} room={room} />
              ))}
            </div>
          </section>

          <aside>
            <h2 className="mb-4 text-lg font-semibold text-white">快速配對</h2>
            <QueuePanel
              type="debate"
              mode="1v1"
              isRanked={false}
              waitingCount={12}
              estimatedSeconds={90}
            />
          </aside>
        </div>
      </div>
    </main>
  );
}
