"use client";
import { useState } from "react";
import BattleInviteModal from "./BattleInviteModal";

interface Props {
  targetUserId: string;
  targetNickname: string;
  className?: string;
  disabled?: boolean;
}

export default function BattleInviteButton({
  targetUserId,
  targetNickname,
  className,
  disabled,
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        disabled={disabled}
        className={
          className ??
          "rounded-lg border border-violet-800/60 px-3 py-1.5 text-xs font-medium text-violet-400 transition-colors hover:bg-violet-900/30 disabled:opacity-50"
        }
      >
        邀請對戰
      </button>
      {open && (
        <BattleInviteModal
          targetUserId={targetUserId}
          targetNickname={targetNickname}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
