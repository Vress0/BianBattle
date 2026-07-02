import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserSafe } from "@/lib/auth/get-current-user";
import ConversationList from "@/components/messages/ConversationList";

export const metadata: Metadata = { title: "私訊 - BianBattle" };

export default async function MessagesPage() {
  const supabase = await createClient();
  const user = await getCurrentUserSafe(supabase);

  if (!user) redirect("/auth/login?redirectTo=/messages");

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-bold text-white">私訊</h1>
      <ConversationList />
    </main>
  );
}
