import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUserSafe } from "@/lib/auth/get-current-user";
import { getFriendshipState } from "@/lib/friends";
import type { FriendRequestRow, FriendshipState } from "@/lib/friends";
import { getEffectiveUserStatus } from "@/lib/status-display";
import type { UserStatusRow } from "@/lib/status-display";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const q = (new URL(request.url).searchParams.get("q") ?? "").trim();

  if (q.length < 2 || q.length > 50) {
    return NextResponse.json({ results: [] });
  }

  const admin = createAdminClient();

  const { data: profiles } = await admin
    .from("profiles")
    .select("id, nickname, avatar_url, bio, wins, losses, debate_mmr, banter_mmr")
    .not("nickname", "is", null)
    .ilike("nickname", `%${q}%`)
    .limit(20);

  if (!profiles || profiles.length === 0) {
    return NextResponse.json({ results: [] });
  }

  const ids = profiles.map((p) => p.id as string);

  const supabase = await createClient();
  const [{ data: statusRows }, viewer] = await Promise.all([
    admin
      .from("user_statuses")
      .select("user_id, status, current_match_id, current_mode, last_seen_at")
      .in("user_id", ids),
    getCurrentUserSafe(supabase),
  ]);

  const statusMap: Record<string, string> = {};
  for (const s of statusRows ?? []) {
    statusMap[s.user_id as string] = getEffectiveUserStatus(s as UserStatusRow);
  }

  const friendshipMap: Record<string, { state: FriendshipState; requestId: string | null }> = {};

  if (viewer) {
    const idSet = new Set(ids);
    if (idSet.has(viewer.id)) {
      friendshipMap[viewer.id] = { state: "self", requestId: null };
    }

    const { data: friendRows } = await admin
      .from("friend_requests")
      .select("id, requester_id, receiver_id, status")
      .or(`requester_id.eq.${viewer.id},receiver_id.eq.${viewer.id}`);

    for (const row of friendRows ?? []) {
      const reqId = row.requester_id as string;
      const recId = row.receiver_id as string;
      const otherId = reqId === viewer.id ? recId : reqId;
      if (!idSet.has(otherId)) continue;
      friendshipMap[otherId] = {
        state: getFriendshipState(viewer.id, otherId, row as FriendRequestRow),
        requestId: row.id as string,
      };
    }
  }

  const results = profiles.map((p) => ({
    id: p.id as string,
    nickname: p.nickname as string | null,
    avatar_url: p.avatar_url as string | null,
    bio: p.bio as string | null,
    wins: (p.wins as number) ?? 0,
    losses: (p.losses as number) ?? 0,
    debate_mmr: (p.debate_mmr as number) ?? 1000,
    banter_mmr: (p.banter_mmr as number) ?? 1000,
    effectiveStatus: statusMap[p.id as string] ?? "offline",
    friendshipState: viewer ? (friendshipMap[p.id as string]?.state ?? "none") : null,
    requestId: friendshipMap[p.id as string]?.requestId ?? null,
  }));

  return NextResponse.json({ results });
}
