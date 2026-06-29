import type { ChatMessage } from "@/types";

interface ChatPanelProps {
  messages: ChatMessage[];
  currentRound: number;
}

export default function ChatPanel({ messages, currentRound }: ChatPanelProps) {
  const roundMessages = messages.filter((m) => m.round === currentRound);
  const prevMessages = messages.filter((m) => m.round < currentRound);

  return (
    <div className="flex flex-col rounded-2xl border border-slate-800 bg-slate-900">
      <div className="border-b border-slate-800 px-4 py-3">
        <p className="font-semibold text-white">發言區</p>
        <p className="text-xs text-slate-500">第 {currentRound} 回合</p>
      </div>

      <div className="flex-1 space-y-4 p-4">
        {prevMessages.length > 0 && (
          <div className="rounded-xl bg-slate-800/50 p-3">
            <p className="mb-2 text-xs font-semibold text-slate-500">
              前回合紀錄
            </p>
            <div className="space-y-2">
              {prevMessages.map((msg) => (
                <MessageBubble key={msg.id} message={msg} faded />
              ))}
            </div>
          </div>
        )}

        {roundMessages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
      </div>

      <div className="border-t border-slate-800 p-4">
        <div className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-3">
          <span className="flex-1 text-sm text-slate-500">輪到對方發言...</span>
          <button
            disabled
            className="rounded-lg bg-slate-700 px-4 py-1.5 text-sm font-medium text-slate-400"
          >
            發言
          </button>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({
  message,
  faded = false,
}: {
  message: ChatMessage;
  faded?: boolean;
}) {
  const isPro = message.side === "pro";
  const bubbleBg = isPro ? "bg-indigo-950/60 border-indigo-900/60" : "bg-rose-950/60 border-rose-900/60";
  const sideLabel = isPro ? "正方" : "反方";
  const sideColor = isPro ? "text-indigo-400" : "text-rose-400";

  return (
    <div className={`rounded-xl border p-3 ${bubbleBg} ${faded ? "opacity-60" : ""}`}>
      <div className="mb-1 flex items-center gap-2">
        <span className={`text-xs font-semibold ${sideColor}`}>
          {sideLabel}
        </span>
        <span className="text-xs text-slate-400">{message.playerName}</span>
      </div>
      <p className="text-sm text-slate-200">{message.content}</p>
    </div>
  );
}
