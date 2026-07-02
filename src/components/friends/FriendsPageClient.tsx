"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Avatar from "@/components/ui/Avatar";
import PlayerInfoModal from "@/components/match/PlayerInfoModal";
import BattleInviteButton from "@/components/battle-invites/BattleInviteButton";
import { getStatusIcon, getStatusBadgeClass } from "@/lib/status-display";
import type { UserEffectiveStatus } from "@/lib/status-display";

interface FriendEntry {
  requestId: string;
  userId: string;
  nickname: string | null;
  avatar_url: string | null;
  bio: string | null;
  wins: number;
  losses: number;
  debate_mmr: number;
  banter_mmr: number;
  effectiveStatus: string;
}

interface RequestEntry {
  requestId: string;
  userId: string;
  nickname: string | null;
  avatar_url: string | null;
  bio: string | null;
}

interface FriendsList {
  friends: FriendEntry[];
  incomingRequests: RequestEntry[];
  outgoingRequests: RequestEntry[];
}

interface Props {
  viewerId: string;
}

export default function FriendsPageClient({ viewerId }: Props) {
  const router = useRouter();
  const [data, setData] = useState<FriendsList | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [viewingUserId, setViewingUserId] = useState<string | null>(null);

  const fetchList = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await fetch("/api/friends/list");
      if (!res.ok) throw new Error();
      const d = (await res.json()) as FriendsList;
      setData(d);
    } catch {
      setFetchError("載入好友列表失敗，請稍後再試。");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchList();
  }, [fetchList]);

  async function apiPost(url: string, body: Record<string, string>, actionKey: string) {
    setActionLoading(actionKey);
    setActionError(null);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !d.ok) {
        setActionError(d.error ?? "操作失敗，請稍後再試");
        return false;
      }
      return true;
    } catch {
      setActionError("操作失敗，請稍後再試");
      return false;
    } finally {
      setActionLoading(null);
    }
  }

  async function handleAccept(requestId: string) {
    const ok = await apiPost("/api/friends/respond", { requestId, action: "accept" }, `accept-${requestId}`);
    if (ok) fetchList();
  }

  async function handleReject(requestId: string) {
    const ok = await apiPost("/api/friends/respond", { requestId, action: "reject" }, `reject-${requestId}`);
    if (ok) fetchList();
  }

  async function handleCancel(requestId: string) {
    const ok = await apiPost("/api/friends/cancel", { requestId }, `cancel-${requestId}`);
    if (ok) fetchList();
  }

  async function handleStartDM(userId: string, requestId: string) {
    setActionLoading(`dm-${requestId}`);
    setActionError(null);
    try {
      const res = await fetch("/api/messages/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId: userId }),
      });
      const d = (await res.json()) as { ok?: boolean; conversationId?: string; error?: string };
      if (!res.ok || !d.ok) {
        setActionError(d.error ?? "無法開啟私訊，請稍後再試");
      } else if (d.conversationId) {
        router.push(`/messages/${d.conversationId}`);
      }
    } catch {
      setActionError("無法開啟私訊，請稍後再試");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleRemove(userId: string, requestId: string) {
    if (!confirm("確定要解除好友關係嗎？")) return;
    const ok = await apiPost("/api/friends/remove", { userId }, `remove-${requestId}`);
    if (ok) fetchList();
  }

  function handleModalClose() {
    setViewingUserId(null);
    // Re-fetch in case friendship state changed inside the modal
    fetchList();
  }

  const displayName = (entry: { nickname: string | null; userId: string }) =>
    entry.nickname ?? entry.userId.slice(0, 8);

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
          onClick={fetchList}
          className="mt-4 rounded-lg bg-slate-800 px-4 py-2 text-sm text-slate-300 hover:bg-slate-700"
        >
          重試
        </button>
      </div>
    );
  }

  const { friends, incomingRequests, outgoingRequests } = data;
  const hasAnyContent =
    friends.length > 0 || incomingRequests.length > 0 || outgoingRequests.length > 0;

  return (
    <>
      {/* Player info modal */}
      {viewingUserId && (
        <PlayerInfoModal
          userId={viewingUserId}
          side=""
          viewerId={viewerId}
          onClose={handleModalClose}
        />
      )}

      {actionError && (
        <div className="mb-4 rounded-lg border border-red-800/60 bg-red-950/20 px-4 py-3 text-sm text-red-400">
          {actionError}
        </div>
      )}

      {/* ─── 我的好友 ─── */}
      <section>
        <h2 className="text-lg font-semibold text-white">
          我的好友
          {friends.length > 0 && (
            <span className="ml-2 text-sm font-normal text-slate-500">({friends.length})</span>
          )}
        </h2>

        {friends.length === 0 ? (
          !hasAnyContent ? (
            <div className="mt-4 rounded-xl border border-dashed border-slate-700 py-12 text-center">
              <p className="text-slate-400">還沒有好友，去排行榜或對戰房認識玩家吧。</p>
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-500">還沒有好友。</p>
          )
        ) : (
          <div className="mt-4 space-y-3">
            {friends.map((f) => {
              const name = displayName(f);
              const status = f.effectiveStatus as UserEffectiveStatus;
              const busy = actionLoading === `remove-${f.requestId}`;
              return (
                <div
                  key={f.requestId}
                  className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900 p-4"
                >
                  <Avatar src={f.avatar_url} name={name} size="md" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white">{name}</span>
                      {status && status !== "offline" && (
                        <span
                          className={`text-xs ${getStatusBadgeClass(status)}`}
                          title={
                            status === "in_match" ? "對局中" : status === "idle" ? "閒置" : "在線"
                          }
                        >
                          {getStatusIcon(status)}
                        </span>
                      )}
                    </div>
                    {f.bio && (
                      <p className="mt-0.5 truncate text-xs text-slate-500 line-clamp-1">
                        {f.bio}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <button
                      onClick={() => setViewingUserId(f.userId)}
                      className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
                    >
                      查看資料
                    </button>
                    <button
                      onClick={() => handleStartDM(f.userId, f.requestId)}
                      disabled={!!actionLoading}
                      className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 transition-colors hover:bg-slate-800 hover:text-white disabled:opacity-50"
                    >
                      {actionLoading === `dm-${f.requestId}` ? "前往中…" : "私訊"}
                    </button>
                    <BattleInviteButton
                      targetUserId={f.userId}
                      targetNickname={name}
                      disabled={!!actionLoading}
                      className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 transition-colors hover:bg-slate-800 hover:text-white disabled:opacity-50"
                    />
                    <button
                      onClick={() => handleRemove(f.userId, f.requestId)}
                      disabled={busy}
                      className="rounded-lg border border-red-800/60 px-3 py-1.5 text-xs text-red-400 transition-colors hover:bg-red-900/30 disabled:opacity-50"
                    >
                      {busy ? "解除中…" : "解除好友"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ─── 收到的邀請 ─── */}
      <section className="mt-10">
        <h2 className="text-lg font-semibold text-white">
          收到的邀請
          {incomingRequests.length > 0 && (
            <span className="ml-2 text-sm font-normal text-slate-500">
              ({incomingRequests.length})
            </span>
          )}
        </h2>

        {incomingRequests.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">目前沒有收到好友邀請。</p>
        ) : (
          <div className="mt-4 space-y-3">
            {incomingRequests.map((req) => {
              const name = displayName(req);
              return (
                <div
                  key={req.requestId}
                  className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900 p-4"
                >
                  <Avatar src={req.avatar_url} name={name} size="md" />
                  <div className="min-w-0 flex-1">
                    <span className="font-semibold text-white">{name}</span>
                    {req.bio && (
                      <p className="mt-0.5 truncate text-xs text-slate-500 line-clamp-1">
                        {req.bio}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      onClick={() => handleAccept(req.requestId)}
                      disabled={!!actionLoading}
                      className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-indigo-500 disabled:opacity-50"
                    >
                      {actionLoading === `accept-${req.requestId}` ? "接受中…" : "接受"}
                    </button>
                    <button
                      onClick={() => handleReject(req.requestId)}
                      disabled={!!actionLoading}
                      className="rounded-lg border border-slate-600 px-3 py-1.5 text-xs text-slate-300 transition-colors hover:bg-slate-700 disabled:opacity-50"
                    >
                      {actionLoading === `reject-${req.requestId}` ? "拒絕中…" : "拒絕"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ─── 送出的邀請 ─── */}
      <section className="mt-10">
        <h2 className="text-lg font-semibold text-white">
          送出的邀請
          {outgoingRequests.length > 0 && (
            <span className="ml-2 text-sm font-normal text-slate-500">
              ({outgoingRequests.length})
            </span>
          )}
        </h2>

        {outgoingRequests.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">目前沒有送出邀請。</p>
        ) : (
          <div className="mt-4 space-y-3">
            {outgoingRequests.map((req) => {
              const name = displayName(req);
              const busy = actionLoading === `cancel-${req.requestId}`;
              return (
                <div
                  key={req.requestId}
                  className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900 p-4"
                >
                  <Avatar src={req.avatar_url} name={name} size="md" />
                  <div className="min-w-0 flex-1">
                    <span className="font-semibold text-white">{name}</span>
                    {req.bio && (
                      <p className="mt-0.5 truncate text-xs text-slate-500 line-clamp-1">
                        {req.bio}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleCancel(req.requestId)}
                    disabled={busy}
                    className="shrink-0 rounded-lg border border-slate-600 px-3 py-1.5 text-xs text-slate-300 transition-colors hover:bg-slate-700 disabled:opacity-50"
                  >
                    {busy ? "取消中…" : "取消邀請"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
}
