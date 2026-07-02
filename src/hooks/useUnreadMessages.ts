"use client";

import { useEffect, useState } from "react";

export function useUnreadMessages() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    async function fetchCount() {
      try {
        const res = await fetch("/api/messages/unread-count", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { count: number };
        setCount(data.count);
      } catch { /* ignore */ }
    }

    fetchCount();
    const pollId = setInterval(fetchCount, 30_000);
    return () => clearInterval(pollId);
  }, []);

  return count;
}
