import Link from "next/link";
import type { RoomListItem } from "@/types";

interface RoomCardProps {
  room: RoomListItem;
}

const STATUS_LABELS: Record<RoomListItem["status"], string> = {
  waiting: "等待中",
  in_progress: "對戰中",
  finished: "已結束",
};

const STATUS_COLORS: Record<RoomListItem["status"], string> = {
  waiting: "text-green-400 bg-green-900/30",
  in_progress: "text-yellow-400 bg-yellow-900/30",
  finished: "text-slate-500 bg-slate-800",
};

export default function RoomCard({ room }: RoomCardProps) {
  const isFull = room.currentPlayers >= room.maxPlayers;
  const isJoinable = room.status === "waiting" && !isFull;

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-900 p-4 transition-colors hover:border-slate-700">
      <div className="flex items-start justify-between gap-2">
        <p className="font-medium text-white">{room.topic}</p>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[room.status]}`}
        >
          {STATUS_LABELS[room.status]}
        </span>
      </div>

      <div className="flex items-center gap-3 text-sm text-slate-400">
        <span className="rounded bg-slate-800 px-2 py-0.5 font-mono font-semibold text-slate-300">
          {room.mode}
        </span>
        {room.isRanked && (
          <span className="rounded bg-yellow-900/30 px-2 py-0.5 text-xs font-medium text-yellow-400">
            排位
          </span>
        )}
        <span>
          {room.currentPlayers}/{room.maxPlayers} 人
        </span>
      </div>

      {isJoinable ? (
        <Link
          href={`/matches/${room.id}`}
          className="mt-1 rounded-lg bg-indigo-600 py-2 text-center text-sm font-medium text-white transition-colors hover:bg-indigo-500"
        >
          加入房間
        </Link>
      ) : (
        <Link
          href={`/matches/${room.id}`}
          className="mt-1 rounded-lg border border-slate-700 py-2 text-center text-sm font-medium text-slate-400 transition-colors hover:bg-slate-800"
        >
          觀看對戰
        </Link>
      )}
    </div>
  );
}
