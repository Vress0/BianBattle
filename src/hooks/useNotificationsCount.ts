"use client";
import { useEffect, useState } from "react";

export function useNotificationsCount() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    async function fetchCount() {
      try {
        const res = await fetch("/api/notifications/count", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { count: number };
        setCount(data.count);
      } catch {
        // ignore
      }
    }

    fetchCount();
    const id = setInterval(fetchCount, 10_000);

    function handleVisibility() {
      if (document.visibilityState === "visible") fetchCount();
    }
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  return count;
}
