"use client";

import Link from "next/link";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";

export default function NavbarMessagesLink() {
  const count = useUnreadMessages();

  return (
    <Link
      href="/messages"
      className="relative whitespace-nowrap rounded-lg px-3 py-1.5 text-sm text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
    >
      私訊
      {count > 0 && (
        <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-0.5 text-[10px] font-bold text-white">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
