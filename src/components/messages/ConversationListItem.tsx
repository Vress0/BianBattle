import Link from "next/link";
import Avatar from "@/components/ui/Avatar";
import type { ConversationItem } from "@/hooks/useConversationsRealtime";

function formatConvTime(dateStr: string | null): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) {
    return d.toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit", hour12: false });
  }
  if (diffDays === 1) return "昨天";
  if (diffDays < 7) {
    const days = ["日", "一", "二", "三", "四", "五", "六"];
    return `週${days[d.getDay()]}`;
  }
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

interface Props {
  item: ConversationItem;
}

export default function ConversationListItem({ item }: Props) {
  const name = item.otherUser.nickname ?? item.otherUser.id.slice(0, 8);
  const statusColor =
    item.otherUserStatus === "online" || item.otherUserStatus === "idle"
      ? "bg-green-400"
      : item.otherUserStatus === "in_match"
      ? "bg-purple-400"
      : "bg-slate-600";

  return (
    <Link
      href={`/messages/${item.conversationId}`}
      className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900 p-4 transition-colors hover:bg-slate-800"
    >
      <div className="relative shrink-0">
        <Avatar src={item.otherUser.avatar_url} name={name} size="md" />
        <span
          className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-slate-900 ${statusColor}`}
        />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate font-semibold text-white">{name}</span>
          <div className="flex shrink-0 items-center gap-2">
            {item.last_message_at && (
              <span className="text-xs text-slate-500">
                {formatConvTime(item.last_message_at)}
              </span>
            )}
            {item.unread_count > 0 && (
              <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-indigo-600 px-1 text-[11px] font-bold text-white">
                {item.unread_count > 99 ? "99+" : item.unread_count}
              </span>
            )}
          </div>
        </div>
        {item.last_message_preview && (
          <p
            className={`mt-0.5 truncate text-sm ${
              item.unread_count > 0 ? "font-medium text-slate-300" : "text-slate-500"
            }`}
          >
            {item.last_message_preview}
          </p>
        )}
      </div>
    </Link>
  );
}
