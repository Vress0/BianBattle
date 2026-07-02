import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserSafe } from "@/lib/auth/get-current-user";
import FriendsPageClient from "@/components/friends/FriendsPageClient";

export default async function FriendsPage() {
  const supabase = await createClient();
  const user = await getCurrentUserSafe(supabase);

  if (!user) {
    redirect("/auth/login?redirectTo=/friends");
  }

  return (
    <main className="min-h-screen bg-slate-950">
      <div className="mx-auto max-w-3xl px-4 py-12">
        <div className="mb-2 text-xs font-semibold uppercase tracking-widest text-indigo-400">
          FRIENDS
        </div>
        <h1 className="text-3xl font-bold text-white md:text-4xl">好友</h1>
        <p className="mt-2 text-slate-400">管理你的好友、查看邀請。</p>

        <div className="mt-10">
          <FriendsPageClient viewerId={user.id} />
        </div>
      </div>
    </main>
  );
}
