"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import UserInfoCard from "@/components/profile/UserInfoCard";
import { getUserMatchResult } from "@/lib/match-display";
import type { UserMatchResultKey } from "@/lib/match-display";
import { getEffectiveUserStatus } from "@/lib/status-display";
import type { UserEffectiveStatus, UserStatusRow } from "@/lib/status-display";
import type { FriendshipState } from "@/lib/friends";

interface PlayerProfile {
  id: string;
  nickname: string | null;
  avatar_url: string | null;
  bio: string | null;
  wins: number;
  losses: number;
  debate_mmr: number;
  banter_mmr: number;
}

interface Props {
  userId: string;
  side: string;
  viewerId?: string | null;
  onClose: () => void;
}

export default function PlayerInfoModal({ userId, side, viewerId, onClose }: Props) {
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [recentResults, setRecentResults] = useState<UserMatchResultKey[]>([]);
  const [status, setStatus] = useState<UserEffectiveStatus>("offline");
  const [currentMatchId, setCurrentMatchId] = useState<string | null>(null);
  const [currentMode, setCurrentMode] = useState<string | null>(null);
  const [friendshipState, setFriendshipState] = useState<FriendshipState>("none");
  const [friendshipRequestId, setFriendshipRequestId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);

  // Realtime subscription + polling fallback for live status updates
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`user_status_modal_${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_statuses",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (payload.eventType === "DELETE") {
            setStatus("offline");
            setCurrentMatchId(null);
            setCurrentMode(null);
          } else {
            const row = payload.new as UserStatusRow & { user_id: string };
            setStatus(getEffectiveUserStatus(row));
            setCurrentMatchId((row.current_match_id as string | null) ?? null);
            setCurrentMode((row.current_mode as string | null) ?? null);
          }
        }
      )
      .subscribe();

    const pollId = setInterval(async () => {
      const { data } = await supabase
        .from("user_statuses")
        .select("status, current_match_id, current_mode, last_seen_at")
        .eq("user_id", userId)
        .maybeSingle();
      setStatus(getEffectiveUserStatus(data as UserStatusRow | null));
      setCurrentMatchId((data?.current_match_id as string | null) ?? null);
      setCurrentMode((data?.current_mode as string | null) ?? null);
    }, 15_000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollId);
    };
  }, [userId]);

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient();

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("id, nickname, avatar_url, bio, wins, losses, debate_mmr, banter_mmr")
        .eq("id", userId)
        .maybeSingle();

      if (profileError || !profileData) {
        setFetchError(true);
        setLoading(false);
        return;
      }

      setProfile(profileData as PlayerProfile);

      // Fetch player status
      const { data: statusData } = await supabase
        .from("user_statuses")
        .select("status, current_match_id, current_mode, last_seen_at")
        .eq("user_id", userId)
        .maybeSingle();

      const effectiveStatus = getEffectiveUserStatus(statusData as UserStatusRow | null);
      setStatus(effectiveStatus);
      setCurrentMatchId((statusData?.current_match_id as string | null) ?? null);
      setCurrentMode((statusData?.current_mode as string | null) ?? null);

      // Fetch friendship state with the viewer (best-effort — not critical)
      if (viewerId && viewerId !== userId) {
        try {
          const fsRes = await fetch(`/api/friends/status?userId=${userId}`);
          if (fsRes.ok) {
            const fsData = (await fsRes.json()) as {
              state: FriendshipState;
              requestId?: string | null;
            };
            setFriendshipState(fsData.state);
            setFriendshipRequestId(fsData.requestId ?? null);
          }
        } catch {
          // silently ignore
        }
      }

      // Fetch recent match results (latest 20 matches joined, then take top 10)
      const { data: playerRows } = await supabase
        .from("match_players")
        .select("match_id, side")
        .eq("user_id", userId)
        .order("joined_at", { ascending: false })
        .limit(20);

      if (playerRows && playerRows.length > 0) {
        const sideByMatch: Record<string, string> = {};
        for (const p of playerRows) {
          sideByMatch[p.match_id as string] = p.side as string;
        }
        const matchIds = playerRows.map((p) => p.match_id as string);

        const { data: matchRows } = await supabase
          .from("matches")
          .select("id, status, winner_side, is_rated")
          .in("id", matchIds)
          .order("created_at", { ascending: false })
          .limit(10);

        const results: UserMatchResultKey[] = (matchRows ?? []).map((m) =>
          getUserMatchResult(
            m.status as string,
            (m.winner_side as string | null) ?? null,
            (m.is_rated as boolean) ?? false,
            sideByMatch[m.id as string] ?? null
          )
        );
        setRecentResults(results);
      }

      setLoading(false);
    }

    fetchData();
  }, [userId, viewerId]);

  function handleBackdrop(e: React.MouseEvent) {
    if (e.target === e.currentTarget) onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
      onClick={handleBackdrop}
    >
      <div className="w-full max-w-sm">
        {loading ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-10 text-center">
            <p className="text-slate-400">載入中…</p>
          </div>
        ) : fetchError || !profile ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center">
            <p className="text-slate-500">無法取得玩家資訊。</p>
          </div>
        ) : (
          <UserInfoCard
            id={profile.id}
            nickname={profile.nickname}
            avatarUrl={profile.avatar_url}
            bio={profile.bio}
            wins={profile.wins ?? 0}
            losses={profile.losses ?? 0}
            debateMmr={profile.debate_mmr ?? 1000}
            banterMmr={profile.banter_mmr ?? 1000}
            side={side}
            recentResults={recentResults}
            status={status}
            currentMatchId={currentMatchId}
            currentMode={currentMode}
            viewerId={viewerId}
            friendshipState={friendshipState}
            friendshipRequestId={friendshipRequestId}
          />
        )}
        <div className="mt-2">
          <button
            onClick={onClose}
            className="w-full rounded-xl border border-slate-700 py-2.5 text-sm text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
          >
            關閉
          </button>
        </div>
      </div>
    </div>
  );
}
