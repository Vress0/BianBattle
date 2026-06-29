import Link from "next/link";
import {
  RANK_TIERS,
  RANK_LABELS,
  RANK_ICONS,
  RANK_TEXT_COLORS,
  RANK_BORDER_COLORS,
  RANK_MMR_THRESHOLDS,
} from "@/lib/constants";
import { MOCK_CURRENT_PLAYER } from "@/lib/mockData";
import { rankProgressPercent, mmrToNextRank } from "@/lib/rank";

export default function RankedPage() {
  const debateProgress = rankProgressPercent(MOCK_CURRENT_PLAYER.debateMMR);
  const banterProgress = rankProgressPercent(MOCK_CURRENT_PLAYER.banterMMR);
  const debateToNext = mmrToNextRank(MOCK_CURRENT_PLAYER.debateMMR);
  const banterToNext = mmrToNextRank(MOCK_CURRENT_PLAYER.banterMMR);

  return (
    <main className="min-h-screen bg-slate-950">
      <div className="mx-auto max-w-5xl px-4 py-12">
        <div className="mb-2 text-xs font-semibold uppercase tracking-widest text-yellow-400">
          RANKED
        </div>
        <h1 className="text-3xl font-bold text-white md:text-4xl">排位賽</h1>
        <p className="mt-2 text-slate-400">
          辯論與嘴砲雙軌排位系統，從青銅爬到王者，用實力說話。
        </p>

        <section className="mt-10">
          <h2 className="mb-5 text-lg font-semibold text-white">段位系統</h2>
          <div className="grid grid-cols-4 gap-3 sm:grid-cols-7">
            {RANK_TIERS.map((tier) => (
              <div
                key={tier}
                className={`rounded-xl border p-3 text-center ${RANK_BORDER_COLORS[tier]} bg-slate-900`}
              >
                <div className="text-2xl">{RANK_ICONS[tier]}</div>
                <p className={`mt-1 text-xs font-bold ${RANK_TEXT_COLORS[tier]}`}>
                  {RANK_LABELS[tier]}
                </p>
                <p className="mt-0.5 text-xs text-slate-600">
                  {RANK_MMR_THRESHOLDS[tier]}+
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-10 grid gap-5 md:grid-cols-2">
          <RankCard
            title="辯論排位"
            icon="⚖️"
            rank={MOCK_CURRENT_PLAYER.debateRank}
            mmr={MOCK_CURRENT_PLAYER.debateMMR}
            progress={debateProgress}
            toNext={debateToNext}
            color="indigo"
          />
          <RankCard
            title="嘴砲排位"
            icon="🔥"
            rank={MOCK_CURRENT_PLAYER.banterRank}
            mmr={MOCK_CURRENT_PLAYER.banterMMR}
            progress={banterProgress}
            toNext={banterToNext}
            color="amber"
          />
        </section>

        <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="mb-4 font-semibold text-white">排位規則</h2>
          <ul className="space-y-2 text-sm text-slate-400">
            <li className="flex gap-2">
              <span className="text-yellow-400">▸</span>
              勝利獲得 MMR，敗場扣除 MMR，差距越大增減幅越明顯
            </li>
            <li className="flex gap-2">
              <span className="text-yellow-400">▸</span>
              每賽季結束後段位衰退，維持活躍需每週完成對戰
            </li>
            <li className="flex gap-2">
              <span className="text-yellow-400">▸</span>
              AI 裁判公正評分，杜絕刷排位行為
            </li>
            <li className="flex gap-2">
              <span className="text-yellow-400">▸</span>
              辯論排位與嘴砲排位完全獨立計算
            </li>
          </ul>
        </section>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/rooms/debate"
            className="flex-1 rounded-xl bg-indigo-600 py-3 text-center font-semibold text-white transition-colors hover:bg-indigo-500"
          >
            開始辯論排位
          </Link>
          <Link
            href="/rooms/banter"
            className="flex-1 rounded-xl bg-amber-500 py-3 text-center font-semibold text-slate-950 transition-colors hover:bg-amber-400"
          >
            開始嘴砲排位
          </Link>
        </div>
      </div>
    </main>
  );
}

interface RankCardProps {
  title: string;
  icon: string;
  rank: string;
  mmr: number;
  progress: number;
  toNext: number;
  color: "indigo" | "amber";
}

function RankCard({
  title,
  icon,
  rank,
  mmr,
  progress,
  toNext,
  color,
}: RankCardProps) {
  const borderColor =
    color === "indigo" ? "border-indigo-800/60" : "border-amber-800/60";
  const accentText =
    color === "indigo" ? "text-indigo-400" : "text-amber-400";
  const progressBar =
    color === "indigo" ? "bg-indigo-500" : "bg-amber-500";

  const rankLabel =
    RANK_LABELS[rank as keyof typeof RANK_LABELS] ?? rank;
  const rankIcon =
    RANK_ICONS[rank as keyof typeof RANK_ICONS] ?? "🎯";

  return (
    <div className={`rounded-2xl border ${borderColor} bg-slate-900 p-6`}>
      <div className="flex items-center gap-2">
        <span>{icon}</span>
        <p className={`font-semibold ${accentText}`}>{title}</p>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <span className="text-4xl">{rankIcon}</span>
        <div>
          <p className="text-xl font-bold text-white">{rankLabel}</p>
          <p className="text-sm text-slate-400">{mmr.toLocaleString()} MMR</p>
        </div>
      </div>
      <div className="mt-4">
        <div className="mb-1 flex justify-between text-xs text-slate-500">
          <span>段位進度</span>
          {toNext > 0 && <span>距下段位 {toNext} MMR</span>}
          {toNext === 0 && <span>已達最高段位</span>}
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-800">
          <div
            className={`h-full rounded-full transition-all ${progressBar}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
