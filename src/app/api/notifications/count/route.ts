import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUserSafe } from "@/lib/auth/get-current-user";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const user = await getCurrentUserSafe(supabase);
  if (!user) return NextResponse.json({ count: 0 });

  const admin = createAdminClient();
  const now = new Date().toISOString();

  const [frResult, biResult] = await Promise.all([
    admin
      .from("friend_requests")
      .select("id", { count: "exact", head: true })
      .eq("receiver_id", user.id)
      .eq("status", "pending"),
    admin
      .from("battle_invites")
      .select("id", { count: "exact", head: true })
      .eq("receiver_id", user.id)
      .eq("status", "pending")
      .gt("expires_at", now),
  ]);

  const count = (frResult.count ?? 0) + (biResult.count ?? 0);
  return NextResponse.json({ count });
}
