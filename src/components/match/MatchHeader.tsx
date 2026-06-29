import type { MatchData } from "@/types";

interface MatchHeaderProps {
  match: MatchData;
}

export default function MatchHeader({ match }: MatchHeaderProps) {
  const proTotal = match.scores.pro.total;
  const conTotal = match.scores.con.total;

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <span className="rounded bg-slate-800 px-2 py-0.5 font-mono font-semibold text-slate-300">
            {match.mode}
          </span>
          {match.isRanked && (
            <span className="rounded bg-yellow-900/30 px-2 py-0.5 text-xs font-medium text-yellow-400">
              排位
            </span>
          )}
          <span className="rounded bg-slate-800 px-2 py-0.5 text-xs text-slate-400">
            {match.type === "debate" ? "辯論" : "嘴砲"}
          </span>
        </div>
        <span className="text-sm text-slate-500">
          第 {match.currentRound} / {match.totalRounds} 回合
        </span>
      </div>

      <h1 className="mt-4 text-lg font-bold text-white md:text-xl">
        辯題：{match.topic}
      </h1>

      <div className="mt-5 flex items-center gap-4">
        <div className="flex-1 text-center">
          <p className="text-3xl font-bold text-indigo-400">{proTotal}</p>
          <p className="text-xs text-slate-500">正方得分</p>
        </div>
        <div className="text-slate-600">VS</div>
        <div className="flex-1 text-center">
          <p className="text-3xl font-bold text-rose-400">{conTotal}</p>
          <p className="text-xs text-slate-500">反方得分</p>
        </div>
      </div>

      <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-slate-800">
        <div
          className="bg-indigo-500 transition-all"
          style={{ width: `${(proTotal / (proTotal + conTotal)) * 100}%` }}
        />
        <div className="flex-1 bg-rose-500" />
      </div>
    </div>
  );
}
