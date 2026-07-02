"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function StatusHeartbeat() {
  const pathname = usePathname();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const visListenerRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    // MatchRoom handles in_match heartbeat on match pages — don't conflict
    if (pathname.startsWith("/matches/")) return;

    const supabase = createClient();
    let cancelled = false;

    async function sendHeartbeat() {
      try {
        await fetch("/api/status/heartbeat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "online", matchId: null }),
        });
      } catch {
        // silently ignore — network errors should not affect UX
      }
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session || cancelled) return;

      sendHeartbeat();
      intervalRef.current = setInterval(sendHeartbeat, 30_000);

      visListenerRef.current = () => {
        if (document.visibilityState === "visible") {
          sendHeartbeat();
        }
      };
      document.addEventListener("visibilitychange", visListenerRef.current);
    });

    return () => {
      cancelled = true;
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (visListenerRef.current !== null) {
        document.removeEventListener("visibilitychange", visListenerRef.current);
        visListenerRef.current = null;
      }
    };
  }, [pathname]);

  return null;
}
