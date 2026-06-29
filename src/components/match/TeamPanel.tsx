import type { Player, TeamSide, JudgeScore } from "@/types";
import { RANK_LABELS, RANK_TEXT_COLORS } from "@/lib/constants";

interface TeamPanelProps {
  side: TeamSide;
  players: Player[];
  score: JudgeScore;
}

export default function TeamPanel({ side, players, score }: TeamPanelProps) {
  const isPro = side === "pro";
  const label = isPro ? "正方 PRO" : "反方 CON";
  const borderColor = isPro ? "border-indigo-800/60" : "border-rose-800/60";
  const headerBg = isPro ? "bg-indigo-950/50" : "bg-rose-950/50";
  const labelText = isPro ? "text-indigo-400" : "text-rose-400";

  return (
    <div className={`rounded-2xl border ${borderColor} overflow-hidden bg-slate-900`}>
      <div className={`px-4 py-3 ${headerBg}`}>
        <p className={`text-sm font-bold ${labelText}`}>{label}</p>
      </div>

      <div className="p-4">
        <div className="space-y-3">
          {players.map((player) => (
            <div key={player.id} className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-800 text-sm font-bold text-white">
                {player.name.charAt(0)}
              </div>
              <div className="min-w-0">
                <p className="truncate font-medium text-white">{player.name}</p>
                <p className={`text-xs ${RANK_TEXT_COLORS[player.debateRank]}`}>
                  {RANK_LABELS[player.debateRank]}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 border-t border-slate-800 pt-4">
          <p className="mb-2 text-xs font-semibold text-slate-500">本回合得分</p>
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between text-slate-400">
              <span>邏輯</span>
              <span className="font-mono text-white">{score.logic}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>表達</span>
              <span className="font-mono text-white">{score.expression}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>反駁</span>
              <span className="font-mono text-white">{score.counterArgument}</span>
            </div>
            <div className="flex justify-between border-t border-slate-800 pt-1.5 font-semibold">
              <span className="text-slate-300">總分</span>
              <span className={`font-mono ${labelText}`}>{score.total}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
