"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { FriendshipState } from "@/lib/friends";
import BattleInviteButton from "@/components/battle-invites/BattleInviteButton";

interface Props {
  viewerId: string | null | undefined;
  targetUserId: string;
  targetNickname?: string | null;
  initialState: FriendshipState;
  requestId?: string | null;
}

export default function FriendActionButton({
  viewerId,
  targetUserId,
  targetNickname,
  initialState,
  requestId: initialRequestId,
}: Props) {
  const [state, setState] = useState<FriendshipState>(initialState);
  const [reqId, setReqId] = useState<string | null>(initialRequestId ?? null);
  const [loading, setLoading] = useState(false);
  const [dmLoading, setDmLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Not logged in or viewing own profile — show nothing
  if (!viewerId || state === "self") return null;

  function clearError() {
    setError(null);
  }

  async function sendRequest() {
    setLoading(true);
    clearError();
    try {
      const res = await fetch("/api/friends/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receiverId: targetUserId }),
      });
      const data = (await res.json()) as { ok?: boolean; state?: string; requestId?: string; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "送出邀請失敗，請稍後再試");
      } else {
        setState("pending_sent");
        setReqId(data.requestId ?? null);
      }
    } catch {
      setError("送出邀請失敗，請稍後再試");
    } finally {
      setLoading(false);
    }
  }

  async function cancelRequest() {
    if (!reqId) return;
    setLoading(true);
    clearError();
    try {
      const res = await fetch("/api/friends/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId: reqId }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "取消失敗，請稍後再試");
      } else {
        setState("none");
        setReqId(null);
      }
    } catch {
      setError("取消失敗，請稍後再試");
    } finally {
      setLoading(false);
    }
  }

  async function respondRequest(action: "accept" | "reject") {
    if (!reqId) return;
    setLoading(true);
    clearError();
    try {
      const res = await fetch("/api/friends/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId: reqId, action }),
      });
      const data = (await res.json()) as { ok?: boolean; state?: string; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "操作失敗，請稍後再試");
      } else {
        setState(action === "accept" ? "friends" : "none");
        if (action === "reject") setReqId(null);
      }
    } catch {
      setError("操作失敗，請稍後再試");
    } finally {
      setLoading(false);
    }
  }

  async function handleStartDM() {
    setDmLoading(true);
    clearError();
    try {
      const res = await fetch("/api/messages/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId }),
      });
      const data = (await res.json()) as { ok?: boolean; conversationId?: string; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "無法開啟私訊，請稍後再試");
      } else if (data.conversationId) {
        router.push(`/messages/${data.conversationId}`);
      }
    } catch {
      setError("無法開啟私訊，請稍後再試");
    } finally {
      setDmLoading(false);
    }
  }

  async function removeFriend() {
    if (!confirm("確定要解除好友關係嗎？")) return;
    setLoading(true);
    clearError();
    try {
      const res = await fetch("/api/friends/remove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: targetUserId }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "解除失敗，請稍後再試");
      } else {
        setState("none");
        setReqId(null);
      }
    } catch {
      setError("解除失敗，請稍後再試");
    } finally {
      setLoading(false);
    }
  }

  const btnBase =
    "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50";
  const btnPrimary = `${btnBase} bg-indigo-600 text-white hover:bg-indigo-500`;
  const btnSecondary = `${btnBase} border border-slate-600 text-slate-300 hover:bg-slate-700`;
  const btnDanger = `${btnBase} border border-red-700/60 text-red-400 hover:bg-red-900/30`;

  return (
    <div className="mt-3 border-t border-slate-800 pt-3">
      <div className="flex flex-wrap gap-2">
        {state === "none" && (
          <button onClick={sendRequest} disabled={loading} className={btnPrimary}>
            {loading ? "送出中…" : "＋ 加好友"}
          </button>
        )}

        {state === "pending_sent" && (
          <>
            <span className={`${btnBase} border border-slate-700 text-slate-400 cursor-default`}>
              ✓ 已送出邀請
            </span>
            <button onClick={cancelRequest} disabled={loading} className={btnSecondary}>
              {loading ? "取消中…" : "取消邀請"}
            </button>
          </>
        )}

        {state === "pending_received" && (
          <>
            <button onClick={() => respondRequest("accept")} disabled={loading} className={btnPrimary}>
              {loading ? "處理中…" : "接受好友"}
            </button>
            <button onClick={() => respondRequest("reject")} disabled={loading} className={btnSecondary}>
              拒絕
            </button>
          </>
        )}

        {state === "friends" && (
          <>
            <span className={`${btnBase} border border-indigo-700/50 text-indigo-400 cursor-default`}>
              ♥ 好友
            </span>
            <button
              onClick={handleStartDM}
              disabled={loading || dmLoading}
              className={btnSecondary}
            >
              {dmLoading ? "前往中…" : "私訊"}
            </button>
            <BattleInviteButton
              targetUserId={targetUserId}
              targetNickname={targetNickname ?? targetUserId.slice(0, 8)}
              className={btnSecondary}
              disabled={loading || dmLoading}
            />
            <button onClick={removeFriend} disabled={loading || dmLoading} className={btnDanger}>
              {loading ? "解除中…" : "解除好友"}
            </button>
          </>
        )}
      </div>

      {error && (
        <p className="mt-1.5 text-xs text-red-400">{error}</p>
      )}
    </div>
  );
}
