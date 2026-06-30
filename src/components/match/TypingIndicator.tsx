import type { DbMatchTypingStatus } from "@/types";

interface TypingIndicatorProps {
  typingStatuses: DbMatchTypingStatus[];
  currentUserId: string | null;
  proNickname: string | null;
  conNickname: string | null;
  proUserId: string | null;
  conUserId: string | null;
}

export default function TypingIndicator({
  typingStatuses,
  currentUserId,
  proNickname,
  conNickname,
  proUserId,
  conUserId,
}: TypingIndicatorProps) {
  // Statuses are pre-filtered for staleness before being passed in
  const active = typingStatuses.filter(
    (s) => s.is_typing && s.user_id !== currentUserId
  );

  if (active.length === 0) return null;

  function label(s: DbMatchTypingStatus): string {
    const sideLabel = s.side === "pro" ? "正方" : "反方";
    let name: string;
    if (s.side === "pro") {
      name = proNickname ?? (proUserId ? proUserId.slice(0, 8) : "玩家");
    } else {
      name = conNickname ?? (conUserId ? conUserId.slice(0, 8) : "玩家");
    }
    return `${sideLabel} ${name} 正在輸入中`;
  }

  return (
    <div className="flex flex-col gap-0.5 px-1">
      {active.map((s) => (
        <p key={s.user_id} className="flex items-center gap-1.5 text-xs text-slate-500">
          <span className="inline-flex gap-0.5">
            <span className="animate-bounce" style={{ animationDelay: "0ms" }}>·</span>
            <span className="animate-bounce" style={{ animationDelay: "150ms" }}>·</span>
            <span className="animate-bounce" style={{ animationDelay: "300ms" }}>·</span>
          </span>
          {label(s)}
        </p>
      ))}
    </div>
  );
}
