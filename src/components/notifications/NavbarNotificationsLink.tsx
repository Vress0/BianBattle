"use client";
import Link from "next/link";
import { useNotificationsCount } from "@/hooks/useNotificationsCount";

export default function NavbarNotificationsLink() {
  const count = useNotificationsCount();

  return (
    <Link
      href="/notifications"
      className="relative whitespace-nowrap rounded-lg px-3 py-1.5 text-sm text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
    >
      通知
      {count > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
