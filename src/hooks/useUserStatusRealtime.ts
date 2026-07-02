"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getEffectiveUserStatus } from "@/lib/status-display";
import type { UserEffectiveStatus, UserStatusRow } from "@/lib/status-display";

export type StatusMap = Record<string, UserEffectiveStatus>;

/**
 * Subscribes to Supabase Realtime for user_statuses and polls every 15 s as
 * fallback. Returns a map of userId → effective status.
 *
 * Requires user_statuses to be in the supabase_realtime publication:
 *   ALTER PUBLICATION supabase_realtime ADD TABLE public.user_statuses;
 */
export function useUserStatusRealtime(
  userIds: string[],
  initialStatuses?: StatusMap
): StatusMap {
  const [map, setMap] = useState<StatusMap>(() => initialStatuses ?? {});

  // Stable key — effect only re-runs when the user ID set actually changes
  const sortedKey = [...userIds].sort().join(",");

  // Counter to deduplicate channel names (channel must be unique per client)
  const channelSeq = useRef(0);

  useEffect(() => {
    if (userIds.length === 0) return;
    let cancelled = false;
    const userIdsSet = new Set(userIds);

    async function fetchAll() {
      try {
        const params = encodeURIComponent(userIds.join(","));
        const res = await fetch(`/api/status/batch?userIds=${params}`);
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as { statuses: StatusMap };
        if (!cancelled) setMap((prev) => ({ ...prev, ...data.statuses }));
      } catch {
        // API fail does not crash — polling will retry
      }
    }

    fetchAll();
    const pollId = setInterval(fetchAll, 15_000);

    // Supabase Realtime — subscribes to all user_statuses changes and filters
    // client-side. Falls back to polling above if Realtime is unavailable.
    const supabase = createClient();
    channelSeq.current += 1;
    const channel = supabase
      .channel(`user_statuses_rt_${channelSeq.current}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_statuses" },
        (payload) => {
          if (cancelled) return;
          const newRow = payload.new as Partial<UserStatusRow & { user_id: string }>;
          const oldRow = payload.old as Partial<{ user_id: string }>;
          const userId = newRow.user_id ?? oldRow.user_id;
          if (!userId || !userIdsSet.has(userId)) return;

          if (payload.eventType === "DELETE") {
            setMap((prev) => ({ ...prev, [userId]: "offline" }));
          } else {
            setMap((prev) => ({
              ...prev,
              [userId]: getEffectiveUserStatus(newRow as UserStatusRow),
            }));
          }
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      clearInterval(pollId);
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortedKey]);

  return map;
}
