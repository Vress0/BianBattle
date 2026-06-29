import type { RoomType } from "@/types";

interface QueuePanelProps {
  type: RoomType;
  mode: string;
  isRanked: boolean;
  waitingCount: number;
  estimatedSeconds: number;
}

export default function QueuePanel({
  type,
  mode,
  isRanked,
  waitingCount,
  estimatedSeconds,
}: QueuePanelProps) {
  const isDebate = type === "debate";
  const borderColor = isDebate ? "border-indigo-800/60" : "border-amber-800/60";
  const accentText = isDebate ? "text-indigo-400" : "text-amber-400";
  const dotColor = isDebate ? "bg-indigo-400" : "bg-amber-400";

  return (
    <div className={`rounded-2xl border p-6 ${borderColor} bg-slate-900`}>
      <div className="flex items-center gap-2">
        <span className={`h-2.5 w-2.5 animate-pulse rounded-full ${dotColor}`} />
        <p className={`font-semibold ${accentText}`}>配對系統</p>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-4 text-center">
        <div>
          <p className="text-2xl font-bold text-white">{mode}</p>
          <p className="text-xs text-slate-500">模式</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-white">{waitingCount}</p>
          <p className="text-xs text-slate-500">等待中</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-white">
            ~{Math.ceil(estimatedSeconds / 60)}分
          </p>
          <p className="text-xs text-slate-500">預估等待</p>
        </div>
      </div>

      {isRanked && (
        <p className="mt-4 text-center text-xs text-yellow-500">
          ⚡ 排位配對 — 勝負影響段位 MMR
        </p>
      )}

      <button
        className={`mt-5 w-full rounded-xl py-3 font-semibold transition-colors ${
          isDebate
            ? "bg-indigo-600 text-white hover:bg-indigo-500"
            : "bg-amber-500 text-slate-950 hover:bg-amber-400"
        }`}
      >
        開始配對
      </button>
    </div>
  );
}
