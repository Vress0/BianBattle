interface JudgePanelProps {
  comment: string;
  round: number;
}

export default function JudgePanel({ comment, round }: JudgePanelProps) {
  return (
    <div className="rounded-2xl border border-purple-900/60 bg-slate-900 p-5">
      <div className="flex items-center gap-2">
        <span className="text-xl">⚖️</span>
        <div>
          <p className="font-semibold text-white">AI 裁判</p>
          <p className="text-xs text-purple-400">第 {round} 回合評語</p>
        </div>
      </div>

      <div className="mt-4 rounded-xl bg-purple-950/30 p-4">
        <p className="text-sm leading-relaxed text-slate-300">{comment}</p>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs text-slate-500">
        <div className="rounded-lg bg-slate-800 py-2">
          <p className="text-base font-bold text-purple-400">邏輯</p>
          <p>論證清晰度</p>
        </div>
        <div className="rounded-lg bg-slate-800 py-2">
          <p className="text-base font-bold text-purple-400">表達</p>
          <p>語言流暢度</p>
        </div>
        <div className="rounded-lg bg-slate-800 py-2">
          <p className="text-base font-bold text-purple-400">反駁</p>
          <p>攻防有效性</p>
        </div>
      </div>
    </div>
  );
}
