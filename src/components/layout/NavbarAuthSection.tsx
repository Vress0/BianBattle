"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface NavbarAuthSectionProps {
  user: { id: string; nickname?: string | null } | null;
}

export default function NavbarAuthSection({ user }: NavbarAuthSectionProps) {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  if (!user) {
    return (
      <Link
        href="/auth/login"
        className="ml-2 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-indigo-500"
      >
        登入
      </Link>
    );
  }

  const displayName = user.nickname ?? user.id.slice(0, 8);

  return (
    <div className="ml-2 flex items-center gap-2">
      <Link
        href="/profile"
        className="rounded-lg px-3 py-1.5 text-sm text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
      >
        {displayName}
      </Link>
      <button
        onClick={handleLogout}
        className="rounded-lg px-3 py-1.5 text-sm text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
      >
        登出
      </button>
    </div>
  );
}
