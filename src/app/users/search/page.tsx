import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserSafe } from "@/lib/auth/get-current-user";
import UserSearchClient from "@/components/users/UserSearchClient";

export const metadata: Metadata = { title: "搜尋玩家 - BianBattle" };

export default async function SearchPage() {
  const supabase = await createClient();
  const user = await getCurrentUserSafe(supabase);

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="mb-2 text-2xl font-bold text-white">搜尋玩家</h1>
      <p className="mb-6 text-sm text-slate-400">依暱稱尋找其他玩家。</p>
      <UserSearchClient viewerId={user?.id ?? null} />
    </main>
  );
}
