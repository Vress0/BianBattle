"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import BattleInviteCard from "@/components/battle-invites/BattleInviteCard";
import Avatar from "@/components/ui/Avatar";

interface FriendRequestNotif {
  id: string;
  type: "friend_request";
  userId: string;
  nickname: string | null;
  avatarUrl: string | null;
  createdAt: string;
}

interface BattleInviteNotif {
  id: string;
  type: "battle_invite";
  inviterId: string;
  inviterNickname: string | null;
  inviterAvatarUrl: string | null;
  mode: string;
  topic: string;
  myRole: string;
  expiresAt: string;
  createdAt: string;
}

interface NotificationsData {
  friendRequests: FriendRequestNotif[];
  battleInvites: BattleInviteNotif[];
  totalCount: number;
}

export default function NotificationsPageClient() {
  const router = useRouter();
  const [data, setData] = useState<NotificationsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      if (!res.ok) throw new Error();
      const d = (await res.json()) as NotificationsData;
      setData(d);
      setFetchError(null);
    } catch {
      setFetchError("載入通知失敗，請稍後再試");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
    const pollId = setInterval(fetchData, 5_000);

    function handleVisibility() {
      if (document.visibilityState === "visible") fetchData();
    }
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      clearInterval(pollId);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [fetchData]);

  async function handleFriendRespond(requestId: string, action: "accept" | "reject") {
    const key = `fr-${action}-${requestId}`;
    setActionLoading(key);
    setActionError(null);
    try {
      const res = await fetch("/api/friends/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, action }),
      });
      const d = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !d.ok) {
        setActionError(d.error ?? "操作失敗，請稍後再試");
      } else {
        await fetchData();
      }
    } catch {
      setActionError("操作失敗，請稍後再試");
    } finally {
      setActionLoading(null);
    }
  }

  if (loading) {
    return (
      <div className="py-16 text-center">
        <p className="text-slate-400">載入中…</p>
      </div>
    );
  }

  if (fetchError || !data) {
    return (
      <div className="rounded-xl border border-red-900/50 bg-red-950/20 py-14 text-center">
        <p className="text-red-400">{fetchError ?? "載入失敗"}</p>
        <button
          onClick={fetchData}
          className="mt-4 rounded-lg bg-slate-800 px-4 py-2 text-sm text-slate-300 hover:bg-slate-700"
        >
          重試
        </button>
      </div>
    );
  }

  const { friendRequests, battleInvites } = data;
  const hasNotifs = friendRequests.length > 0 || battleInvites.length > 0;

  return (
    <>
      {actionError && (
        <div className="mb-4 rounded-lg border border-red-800/60 bg-red-950/20 px-4 py-3 text-sm text-red-400">
          {actionError}
        </div>
      )}

      {!hasNotifs && (
        <div className="rounded-xl border border-dashed border-slate-700 py-16 text-center">
          <p className="text-slate-400">目前沒有通知。</p>
        </div>
      )}

      {/* Battle Invites */}
      {battleInvites.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-4 text-lg font-semibold text-white">
            對戰邀請
            <span className="ml-2 text-sm font-normal text-slate-500">
              ({battleInvites.length})
            </span>
          </h2>
          <div className="space-y-3">
            {battleInvites.map((bi) => (
              <BattleInviteCard
                key={bi.id}
                inviteId={bi.id}
                inviterNickname={bi.inviterNickname}
                inviterAvatarUrl={bi.inviterAvatarUrl}
                mode={bi.mode}
                topic={bi.topic}
                myRole={bi.myRole}
                expiresAt={bi.expiresAt}
                onAccepted={(matchId) => router.push(`/matches/${matchId}`)}
                onRejected={fetchData}
              />
            ))}
          </div>
        </section>
      )}

      {/* Friend Requests */}
      {friendRequests.length > 0 && (
        <section>
          <h2 className="mb-4 text-lg font-semibold text-white">
            好友邀請
            <span className="ml-2 text-sm font-normal text-slate-500">
              ({friendRequests.length})
            </span>
          </h2>
          <div className="space-y-3">
            {friendRequests.map((fr) => {
              const name = fr.nickname ?? fr.userId.slice(0, 8);
              const busyAccept = actionLoading === `fr-accept-${fr.id}`;
              const busyReject = actionLoading === `fr-reject-${fr.id}`;
              const busy = busyAccept || busyReject;
              return (
                <div
                  key={fr.id}
                  className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900 p-4"
                >
                  <Avatar src={fr.avatarUrl} name={name} size="md" />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-white">{name}</p>
                    <p className="text-xs text-slate-500">想加你為好友</p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      onClick={() => handleFriendRespond(fr.id, "accept")}
                      disabled={busy}
                      className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-indigo-500 disabled:opacity-50"
                    >
                      {busyAccept ? "接受中…" : "接受"}
                    </button>
                    <button
                      onClick={() => handleFriendRespond(fr.id, "reject")}
                      disabled={busy}
                      className="rounded-lg border border-slate-600 px-3 py-1.5 text-xs text-slate-300 transition-colors hover:bg-slate-700 disabled:opacity-50"
                    >
                      {busyReject ? "拒絕中…" : "拒絕"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </>
  );
}
