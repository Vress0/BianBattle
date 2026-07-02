import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUserSafe } from "@/lib/auth/get-current-user";
import { getFriendshipState } from "@/lib/friends";
import type { FriendRequestRow } from "@/lib/friends";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(request: NextRequest) {
  const targetId = new URL(request.url).searchParams.get("userId");

  if (!targetId || !UUID_RE.test(targetId)) {
    return NextResponse.json({ state: "none" });
  }

  const supabase = await createClient();
  const user = await getCurrentUserSafe(supabase);

  if (!user) {
    return NextResponse.json({ state: "none" });
  }
  if (user.id === targetId) {
    return NextResponse.json({ state: "self" });
  }

  const admin = createAdminClient();

  const [{ data: fwd }, { data: rev }] = await Promise.all([
    admin
      .from("friend_requests")
      .select("id, requester_id, receiver_id, status")
      .eq("requester_id", user.id)
      .eq("receiver_id", targetId)
      .maybeSingle(),
    admin
      .from("friend_requests")
      .select("id, requester_id, receiver_id, status")
      .eq("requester_id", targetId)
      .eq("receiver_id", user.id)
      .maybeSingle(),
  ]);

  const row = (fwd ?? rev) as FriendRequestRow | null;
  const state = getFriendshipState(user.id, targetId, row);

  return NextResponse.json({
    state,
    requestId: row?.id ?? null,
  });
}
