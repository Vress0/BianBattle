"use client";
import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

interface Callbacks {
  onAccepted: (matchId: string) => void;
  onRejected: () => void;
  onCancelled: () => void;
  onExpired: () => void;
}

export function useBattleInviteRealtime(
  inviteId: string | null,
  callbacks: Callbacks
) {
  const callbacksRef = useRef(callbacks);
  // Sync ref after every render so async events always call the latest callbacks
  useEffect(() => { callbacksRef.current = callbacks; });

  useEffect(() => {
    if (!inviteId) return;

    let stopped = false;
    let pollId: ReturnType<typeof setInterval> | null = null;

    function stop() {
      stopped = true;
      if (pollId) clearInterval(pollId);
    }

    function handleStatus(
      status: string,
      matchId: string | null,
      expiresAt?: string
    ) {
      if (stopped) return;
      if (status === "accepted" && matchId) {
        stop();
        callbacksRef.current.onAccepted(matchId);
      } else if (status === "rejected") {
        stop();
        callbacksRef.current.onRejected();
      } else if (status === "cancelled") {
        stop();
        callbacksRef.current.onCancelled();
      } else if (
        status === "expired" ||
        (expiresAt && new Date(expiresAt) < new Date())
      ) {
        stop();
        callbacksRef.current.onExpired();
      }
    }

    async function poll() {
      if (stopped) return;
      try {
        const res = await fetch(`/api/battle-invites/${inviteId}`, {
          cache: "no-store",
        });
        if (!res.ok || stopped) return;
        const data = (await res.json()) as {
          status: string;
          matchId: string | null;
          expiresAt: string;
        };
        handleStatus(data.status, data.matchId, data.expiresAt);
      } catch {
        // ignore — fallback continues next tick
      }
    }

    // Initial poll then every 3 s
    poll();
    pollId = setInterval(poll, 3_000);

    // Realtime subscription (best-effort; polling is the guaranteed fallback)
    const supabase = createClient();
    const channel = supabase
      .channel(`bi_watch_${inviteId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "battle_invites",
          filter: `id=eq.${inviteId}`,
        },
        (payload) => {
          if (stopped) return;
          const u = payload.new as {
            status: string;
            match_id: string | null;
            expires_at: string;
          };
          handleStatus(u.status, u.match_id ?? null, u.expires_at);
        }
      )
      .subscribe();

    return () => {
      stop();
      supabase.removeChannel(channel);
    };
  }, [inviteId]);
}
