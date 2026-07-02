import type { DirectMessage } from "@/lib/messages";

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("zh-TW", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

interface Props {
  message: DirectMessage;
  isOwn: boolean;
  onDelete?: (id: string) => void;
}

export default function MessageBubble({ message, isOwn, onDelete }: Props) {
  const isDeleted = !!message.deleted_at;

  return (
    <div className={`mb-3 flex ${isOwn ? "justify-end" : "justify-start"}`}>
      <div className={`flex max-w-[75%] flex-col ${isOwn ? "items-end" : "items-start"}`}>
        <div
          className={`rounded-2xl px-4 py-2.5 ${
            isOwn
              ? "rounded-tr-sm bg-indigo-600 text-white"
              : "rounded-tl-sm bg-slate-800 text-slate-100"
          }`}
        >
          {isDeleted ? (
            <p className="text-sm italic opacity-50">訊息已收回</p>
          ) : (
            <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{message.body}</p>
          )}
        </div>
        <div className={`mt-0.5 flex items-center gap-2 px-1 ${isOwn ? "flex-row-reverse" : ""}`}>
          <span className="text-[11px] text-slate-500">{formatTime(message.created_at)}</span>
          {isOwn && !isDeleted && onDelete && (
            <button
              onClick={() => onDelete(message.id)}
              className="text-[11px] text-slate-600 transition-colors hover:text-slate-400"
            >
              收回
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
