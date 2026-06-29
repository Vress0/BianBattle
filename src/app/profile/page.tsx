import {
  RANK_LABELS,
  RANK_ICONS,
  RANK_TEXT_COLORS,
  RANK_BORDER_COLORS,
} from "@/lib/constants";
import { MOCK_CURRENT_PLAYER, MOCK_RECENT_MATCHES } from "@/lib/mockData";
import { calcWinRate, formatDate } from "@/lib/utils";

export default function ProfilePage() {
  const player = MOCK_CURRENT_PLAYER;
  const winRate = calcWinRate(player.wins, player.losses);

  return (
    <main className="min-h-screen bg-slate-950">
      <div className="mx-auto max-w-4xl px-4 py-12">
        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div className="flex items-center gap-5">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-indigo-900 text-2xl font-bold text-white">
              {player.name.charAt(0)}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">{player.name}</h1>
              <p className="text-sm text-slate-400">
                {player.wins + player.losses} 場對戰 · 勝率 {winRate}%
              </p>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-3 divide-x divide-slate-800 text-center">
            <div className="py-2">
              <p className="text-2xl font-bold text-green-400">{player.wins}</p>
              <p className="text-xs text-slate-500">勝場</p>
            </div>
            <div className="py-2">
              <p className="text-2xl font-bold text-red-400">{player.losses}</p>
              <p className="text-xs text-slate-500">敗場</p>
            </div>
            <div className="py-2">
              <p className="text-2xl font-bold text-white">{winRate}%</p>
              <p className="text-xs text-slate-500">勝率</p>
            </div>
          </div>
        </section>

        <section className="mt-5 grid gap-4 sm:grid-cols-2">
          <RankCard
            label="辯論段位"
            icon="⚖️"
            rank={player.debateRank}
            mmr={player.debateMMR}
          />
          <RankCard
            label="嘴砲段位"
            icon="🔥"
            rank={player.banterRank}
            mmr={player.banterMMR}
          />
        </section>

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
                  <p className="truncate font-medium text-white">
                    {match.topic}
                  </p>
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
  rank: string;
  mmr: number;
}

function RankCard({ label, icon, rank, mmr }: RankCardProps) {
  const rankKey = rank as keyof typeof RANK_LABELS;

  return (
    <div
      className={`rounded-2xl border ${RANK_BORDER_COLORS[rankKey]} bg-slate-900 p-5`}
    >
      <div className="flex items-center gap-2 text-sm text-slate-400">
        <span>{icon}</span>
        <span>{label}</span>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <span className="text-3xl">{RANK_ICONS[rankKey]}</span>
        <div>
          <p className={`text-lg font-bold ${RANK_TEXT_COLORS[rankKey]}`}>
            {RANK_LABELS[rankKey]}
          </p>
          <p className="text-sm text-slate-400">{mmr.toLocaleString()} MMR</p>
        </div>
      </div>
    </div>
  );
}
