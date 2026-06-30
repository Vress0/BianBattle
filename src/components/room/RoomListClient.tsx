"use client";

import { useState } from "react";
import Link from "next/link";
import { STATUS_LABELS, winnerSideLabel, formatDateTime } from "@/lib/match-display";

export interface RoomEntry {
  id: string;
  title: string;
  topic: string | null;
  status: string;
  winner_side: string | null;
  is_rated: boolean;
  created_at: string;
  proNickname: string | null;
  conNickname: string | null;
  filled: number;
}

interface RoomListClientProps {
  mode: "debate" | "banter";
  rooms: RoomEntry[];
}

type FilterKey = "all" | "joinable" | "active" | "finished";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "全部" },
  { key: "joinable", label: "可加入" },
  { key: "active", label: "對戰中" },
  { key: "finished", label: "已結束" },
];

function statusGroupRank(status: string): number {
  if (status === "waiting") return 0;
  if (status === "active") return 1;
  return 2; // finished | cancelled
}

function matchesFilter(status: string, filter: FilterKey): boolean {
  if (filter === "all") return true;
  if (filter === "joinable") return status === "waiting";
  if (filter === "active") return status === "active";
  return status === "finished" || status === "cancelled";
}

export default function RoomListClient({ mode, rooms }: RoomListClientProps) {
  const [filter, setFilter] = useState<FilterKey>("all");

  const isDebate = mode === "debate";
  const accentBorder = isDebate ? "hover:border-indigo-700/60" : "hover:border-amber-700/60";
  const accentText = isDebate ? "group-hover:text-indigo-300" : "group-hover:text-amber-300";

  const filtered = rooms
    .filter((r) => matchesFilter(r.status, filter))
    .sort((a, b) => {
      const groupDiff = statusGroupRank(a.status) - statusGroupRank(b.status);
      if (groupDiff !== 0) return groupDiff;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  return (
    <div>
      <div className="mt-6 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              filter === f.key
                ? isDebate
                  ? "bg-indigo-600 text-white"
                  : "bg-amber-600 text-white"
                : "bg-slate-800 text-slate-400 hover:bg-slate-700"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length > 0 ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {filtered.map((room) => {
            const isTerminal = room.status === "finished" || room.status === "cancelled";
            const resultText =
              !room.is_rated || !room.winner_side ? "不計戰績" : winnerSideLabel(room.winner_side);

            return (
              <Link
                key={room.id}
                href={`/matches/${room.id}`}
                className={`group rounded-xl border border-slate-800 bg-slate-900 p-4 transition-colors hover:bg-slate-800/60 ${accentBorder}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className={`font-semibold text-white line-clamp-1 ${accentText}`}>
                    {room.topic ?? room.title}
                  </p>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      room.status === "active"
                        ? "bg-green-900/50 text-green-400"
                        : room.status === "waiting"
                          ? "bg-yellow-900/50 text-yellow-400"
                          : "bg-slate-800 text-slate-400"
                    }`}
                  >
                    {STATUS_LABELS[room.status] ?? room.status}
                  </span>
                </div>

                <p className="mt-1 line-clamp-1 text-sm text-slate-400">
                  正方：{room.proNickname ?? "空缺"} · 反方：{room.conNickname ?? "空缺"}
                </p>

                <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                  <span>{isDebate ? "辯論" : "嘴砲"} · 1v1</span>
                  <span>·</span>
                  <span>玩家 {room.filled}/2</span>
                  <span>·</span>
                  <span>{formatDateTime(room.created_at)}</span>
                  {isTerminal && (
                    <>
                      <span>·</span>
                      <span className="text-slate-400">{resultText}</span>
                    </>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="mt-10 rounded-xl border border-dashed border-slate-700 py-14 text-center">
          <p className="text-slate-500">目前沒有房間，建立一場新的對戰吧！</p>
        </div>
      )}
    </div>
  );
}
