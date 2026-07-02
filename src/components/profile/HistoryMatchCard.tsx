"use client";

import Link from "next/link";
import Avatar from "@/components/ui/Avatar";
import MatchBookmarkButton from "@/components/match/MatchBookmarkButton";
import MatchNoteEditor from "@/components/profile/MatchNoteEditor";
import type { HistoryMatchRow } from "@/types";
import {
  modeLabel,
  endedReasonLabel,
  getSideLabel,
  winnerSideLabel,
  formatDateTime,
  formatDuration,
  getResultSymbol,
  getResultSymbolClass,
  getResultBgClass,
  getResultAriaLabel,
} from "@/lib/match-display";
import type { UserMatchResultKey } from "@/lib/match-display";

const RESULT_LABELS: Record<UserMatchResultKey, string> = {
  win: "勝利",
  loss: "失敗",
  unrated: "不計分",
  cancelled: "取消",
  active: "進行中",
};

interface Props {
  match: HistoryMatchRow;
  userId: string;
  isBookmarked: boolean;
  noteContent: string | null | undefined;
  onBookmarkToggle: (matchId: string, newState: boolean) => void;
  onNoteChange: (matchId: string, newNote: string) => void;
}

export default function HistoryMatchCard({
  match,
  userId,
  isBookmarked,
  noteContent,
  onBookmarkToggle,
  onNoteChange,
}: Props) {
  const symbol = getResultSymbol(match.resultKey);
  const symbolClass = getResultSymbolClass(match.resultKey);
  const bgClass = getResultBgClass(match.resultKey);
  const ariaLabel = getResultAriaLabel(match.resultKey);
  const resultLabel = RESULT_LABELS[match.resultKey];
  const duration = formatDuration(match.started_at, match.ended_at);
  const isEnded = match.status === "finished" || match.status === "cancelled";
  const note = noteContent ?? null;

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-0.5 text-xs font-bold ${bgClass} ${symbolClass}`}
            title={ariaLabel}
            aria-label={ariaLabel}
          >
            <span>{symbol}</span>
            <span>{resultLabel}</span>
          </span>
          <span className="rounded-lg border border-slate-700 px-2 py-0.5 text-xs text-slate-400">
            {modeLabel(match.mode)}
          </span>
          {!match.is_rated &&
            match.resultKey !== "cancelled" &&
            match.resultKey !== "unrated" && (
              <span className="text-xs text-slate-500">不計戰績</span>
            )}
        </div>
        <MatchBookmarkButton
          matchId={match.id}
          userId={userId}
          isBookmarked={isBookmarked}
          onToggle={(s) => onBookmarkToggle(match.id, s)}
          compact
        />
      </div>

      {/* Topic / title */}
      <p className="mt-2 font-semibold text-white line-clamp-2">
        {match.topic ?? match.title}
      </p>

      {/* Opponent */}
      <div className="mt-2 flex items-center gap-2">
        <Avatar src={match.opponentAvatarUrl} name={match.opponentName} size="xs" />
        <p className="text-sm text-slate-400">
          vs <span className="text-slate-300">{match.opponentName}</span>
        </p>
      </div>

      {/* Details */}
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
        <span>你是{getSideLabel(match.userSide)}</span>
        {match.winner_side && (
          <>
            <span>·</span>
            <span>{winnerSideLabel(match.winner_side)}</span>
          </>
        )}
        {match.ended_reason && (
          <>
            <span>·</span>
            <span>{endedReasonLabel(match.ended_reason)}</span>
          </>
        )}
        {duration && (
          <>
            <span>·</span>
            <span>{duration}</span>
          </>
        )}
        <span>·</span>
        <span>{formatDateTime(match.created_at)}</span>
      </div>

      {/* Note */}
      <MatchNoteEditor
        matchId={match.id}
        userId={userId}
        initialNote={note}
        onSave={(n) => onNoteChange(match.id, n)}
      />

      {/* Action */}
      {isEnded && (
        <div className="mt-3">
          <Link
            href={`/matches/${match.id}/result`}
            className="inline-block rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-indigo-500"
          >
            查看對局
          </Link>
        </div>
      )}
    </div>
  );
}
