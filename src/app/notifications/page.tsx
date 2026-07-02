import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserSafe } from "@/lib/auth/get-current-user";
import NotificationsPageClient from "@/components/notifications/NotificationsPageClient";

export default async function NotificationsPage() {
  const supabase = await createClient();
  const user = await getCurrentUserSafe(supabase);
  if (!user) redirect("/auth/login?redirectTo=/notifications");

  return (
    <main className="min-h-screen bg-slate-950">
      <div className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="mb-8 text-2xl font-bold text-white">通知中心</h1>
        <NotificationsPageClient />
      </div>
    </main>
  );
}
