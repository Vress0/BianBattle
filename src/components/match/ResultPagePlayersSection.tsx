"use client";

import { useState } from "react";
import Avatar from "@/components/ui/Avatar";
import UserInfoCard from "@/components/profile/UserInfoCard";
import { calcWinRate } from "@/lib/utils";

export interface PlayerInfo {
  id: string;
  nickname: string | null;
  avatarUrl: string | null;
  bio: string | null;
  wins: number;
  losses: number;
  debateMmr: number;
  banterMmr: number;
  side: string;
}

interface Props {
  proPlayer: PlayerInfo | null;
  conPlayer: PlayerInfo | null;
}

function PlayerCard({
  player,
  onViewInfo,
}: {
  player: PlayerInfo | null;
  onViewInfo: (p: PlayerInfo) => void;
}) {
  if (!player) {
    return (
      <div className="flex flex-col items-center rounded-xl border border-slate-800 bg-slate-900/50 p-4 text-center">
        <p className="text-sm text-slate-500">（空缺）</p>
        <p className="text-xs text-slate-600">{player === null ? "" : ""}</p>
      </div>
    );
  }

  const displayName = player.nickname ?? player.id.slice(0, 8);
  const total = player.wins + player.losses;
  const winRate = calcWinRate(player.wins, player.losses);
  const sideLabel = player.side === "pro" ? "正方" : "反方";

  return (
    <div className="flex flex-col rounded-xl border border-slate-800 bg-slate-900 p-4">
      <div className="flex items-center gap-3">
        <Avatar src={player.avatarUrl} name={displayName} size="md" />
        <div className="min-w-0">
          <p className="truncate font-semibold text-white">{displayName}</p>
          <p className="text-xs text-slate-400">{sideLabel}</p>
        </div>
      </div>
      <div className="mt-2 flex gap-3 text-xs">
        <span className="text-green-400">{player.wins}勝</span>
        <span className="text-red-400">{player.losses}敗</span>
        <span className="text-slate-400">{total > 0 ? `${winRate}%` : "—"}</span>
      </div>
      <button
        onClick={() => onViewInfo(player)}
        className="mt-2 self-start text-xs text-indigo-400 transition-colors hover:text-indigo-300"
      >
        查看資訊
      </button>
    </div>
  );
}

export default function ResultPagePlayersSection({ proPlayer, conPlayer }: Props) {
  const [modalPlayer, setModalPlayer] = useState<PlayerInfo | null>(null);

  function handleBackdrop(e: React.MouseEvent) {
    if (e.target === e.currentTarget) setModalPlayer(null);
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <PlayerCard player={proPlayer} onViewInfo={setModalPlayer} />
        <PlayerCard player={conPlayer} onViewInfo={setModalPlayer} />
      </div>

      {modalPlayer && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
          onClick={handleBackdrop}
        >
          <div className="w-full max-w-sm">
            <UserInfoCard
              id={modalPlayer.id}
              nickname={modalPlayer.nickname}
              avatarUrl={modalPlayer.avatarUrl}
              bio={modalPlayer.bio}
              wins={modalPlayer.wins}
              losses={modalPlayer.losses}
              debateMmr={modalPlayer.debateMmr}
              banterMmr={modalPlayer.banterMmr}
              side={modalPlayer.side}
            />
            <div className="mt-2">
              <button
                onClick={() => setModalPlayer(null)}
                className="w-full rounded-xl border border-slate-700 py-2.5 text-sm text-slate-400 transition-colors hover:bg-slate-800"
              >
                關閉
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
