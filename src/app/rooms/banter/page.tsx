import MatchModeCard from "@/components/room/MatchModeCard";
import RoomCard from "@/components/room/RoomCard";
import QueuePanel from "@/components/room/QueuePanel";
import { MOCK_BANTER_ROOMS } from "@/lib/mockData";

const MODES = [
  {
    mode: "1v1" as const,
    playerCount: 1,
    description: "閃電嘴砲，一對一展現你的幽默與反應力。",
  },
  {
    mode: "3v3" as const,
    playerCount: 3,
    description: "組隊嘴砲，和夥伴一起用犀利話語轟炸對手。",
  },
  {
    mode: "5v5" as const,
    playerCount: 5,
    description: "大亂鬥嘴砲，最熱鬧的對話競技場。",
  },
];

const BANTER_FEATURES = [
  {
    icon: "⚡",
    title: "嘴砲戰力",
    desc: "根據發言的犀利度、創意度、幽默感即時評分",
  },
  {
    icon: "🎭",
    title: "幽默反擊",
    desc: "用最妙的回答反將對手一軍，贏得更高分數",
  },
  {
    icon: "🔥",
    title: "連擊加成",
    desc: "連續精彩發言可獲得連擊加成分數",
  },
];

export default function BanterRoomPage() {
  return (
    <main className="min-h-screen bg-slate-950">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="mb-2 text-xs font-semibold uppercase tracking-widest text-amber-400">
          BANTER ROOM
        </div>
        <h1 className="text-3xl font-bold text-white md:text-4xl">嘴砲房</h1>
        <p className="mt-2 text-slate-400">
          輕鬆快速的對戰模式。用幽默、反應力與觀點打出你的風格，AI
          評分犀利度與創意。
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
                accentColor="amber"
              />
            ))}
          </div>
        </section>

        <section className="mt-8">
          <h2 className="mb-4 text-lg font-semibold text-white">嘴砲特色</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {BANTER_FEATURES.map((f) => (
              <div
                key={f.title}
                className="rounded-xl border border-amber-900/50 bg-amber-950/20 p-4"
              >
                <span className="text-2xl">{f.icon}</span>
                <p className="mt-2 font-semibold text-amber-300">{f.title}</p>
                <p className="mt-1 text-sm text-slate-400">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="mt-4 rounded-2xl border border-amber-800/50 bg-amber-950/20 p-4">
          <p className="text-sm font-semibold text-amber-400">
            ⚠️ 嘴砲安全規則
          </p>
          <p className="mt-1 text-sm text-slate-400">
            嘴砲可以幽默、可以犀利，但
            <span className="font-medium text-white">
              不能人身攻擊、歧視、霸凌或惡意羞辱
            </span>
            。AI 裁判將自動偵測違規發言，違規者將被扣分並可能被封禁。
          </p>
        </div>

        <div className="mt-10 grid gap-8 lg:grid-cols-3">
          <section className="lg:col-span-2">
            <h2 className="mb-4 text-lg font-semibold text-white">
              進行中的嘴砲房
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {MOCK_BANTER_ROOMS.map((room) => (
                <RoomCard key={room.id} room={room} />
              ))}
            </div>
          </section>

          <aside>
            <h2 className="mb-4 text-lg font-semibold text-white">快速嘴砲</h2>
            <QueuePanel
              type="banter"
              mode="1v1"
              isRanked={false}
              waitingCount={28}
              estimatedSeconds={30}
            />
          </aside>
        </div>
      </div>
    </main>
  );
}
