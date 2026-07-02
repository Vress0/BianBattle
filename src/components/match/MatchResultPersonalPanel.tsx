"use client";

import { useState } from "react";
import Link from "next/link";
import MatchBookmarkButton from "@/components/match/MatchBookmarkButton";
import MatchNoteEditor from "@/components/profile/MatchNoteEditor";
import {
  getUserMatchResult,
  getResultSymbol,
  getResultSymbolClass,
} from "@/lib/match-display";
import type { UserMatchResultKey } from "@/lib/match-display";

interface Props {
  matchId: string;
  userId: string;
  viewerSide: string;
  opponentName: string;
  winnerSide: string | null;
  isRated: boolean;
  isBookmarked: boolean;
  noteContent: string | null;
  matchStatus?: string;
}

const RESULT_LABELS: Record<UserMatchResultKey, string> = {
  win: "你勝利了！",
  loss: "你失敗了",
  unrated: "本場不計分",
  cancelled: "比賽取消",
  active: "比賽進行中",
};

export default function MatchResultPersonalPanel({
  matchId,
  userId,
  viewerSide,
  opponentName,
  winnerSide,
  isRated,
  isBookmarked,
  noteContent,
  matchStatus,
}: Props) {
  const [savedNote, setSavedNote] = useState(noteContent);

  const resultKey = getUserMatchResult(
    matchStatus ?? "finished",
    winnerSide,
    isRated,
    viewerSide
  );
  const symbol = getResultSymbol(resultKey);
  const symbolClass = getResultSymbolClass(resultKey);
  const resultLabel = RESULT_LABELS[resultKey];
  const sideLabel = viewerSide === "pro" ? "正方" : "反方";

  return (
    <section className="mt-5 rounded-2xl border border-indigo-900/60 bg-slate-900 p-6">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-indigo-300">
        你的結果
      </h2>

      {/* Result hero */}
      <div className="flex items-center gap-3">
        <span className={`text-4xl font-bold leading-none ${symbolClass}`}>{symbol}</span>
        <p className={`text-2xl font-bold ${symbolClass}`}>{resultLabel}</p>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-y-3 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-xs text-slate-500">你的方位</dt>
          <dd className="mt-0.5 text-slate-200">{sideLabel}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">對手</dt>
          <dd className="mt-0.5 text-slate-200">{opponentName}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">是否計分</dt>
          <dd className={`mt-0.5 ${isRated ? "text-indigo-300" : "text-slate-500"}`}>
            {isRated ? "計入戰績" : "不計入戰績"}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">MMR 變化</dt>
          <dd className="mt-0.5 text-slate-500">尚未記錄 MMR 變化</dd>
        </div>
      </dl>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <MatchBookmarkButton
          matchId={matchId}
          userId={userId}
          isBookmarked={isBookmarked}
        />
      </div>

      <div className="mt-3">
        <p className="mb-1 text-xs font-medium text-slate-400">我的備註</p>
        <MatchNoteEditor
          matchId={matchId}
          userId={userId}
          initialNote={savedNote}
          onSave={setSavedNote}
        />
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <Link
          href="/profile/history"
          className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 transition-colors hover:bg-slate-800"
        >
          歷史戰績
        </Link>
        <Link
          href="/profile"
          className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 transition-colors hover:bg-slate-800"
        >
          個人資料
        </Link>
      </div>
    </section>
  );
}
