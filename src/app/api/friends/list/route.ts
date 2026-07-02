import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUserSafe } from "@/lib/auth/get-current-user";
import { getEffectiveUserStatus } from "@/lib/status-display";
import type { UserStatusRow } from "@/lib/status-display";

interface ProfileRow {
  id: string;
  nickname: string | null;
  avatar_url: string | null;
  bio: string | null;
  wins: number;
  losses: number;
  debate_mmr: number;
  banter_mmr: number;
}

export async function GET() {
  const supabase = await createClient();
  const user = await getCurrentUserSafe(supabase);
  if (!user) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }

  const admin = createAdminClient();

  // Fetch all rows involving current user
  const { data: rows } = await admin
    .from("friend_requests")
    .select("id, requester_id, receiver_id, status")
    .or(`requester_id.eq.${user.id},receiver_id.eq.${user.id}`);

  const friendRows: { id: string; otherId: string }[] = [];
  const incomingRows: { id: string; otherId: string }[] = [];
  const outgoingRows: { id: string; otherId: string }[] = [];

  for (const row of rows ?? []) {
    const reqId = row.requester_id as string;
    const recId = row.receiver_id as string;
    const otherId = reqId === user.id ? recId : reqId;

    if (row.status === "accepted") {
      friendRows.push({ id: row.id as string, otherId });
    } else if (row.status === "pending") {
      if (recId === user.id) {
        incomingRows.push({ id: row.id as string, otherId });
      } else {
        outgoingRows.push({ id: row.id as string, otherId });
      }
    }
  }

  // Collect all profile IDs to batch-fetch
  const allIds = [
    ...friendRows.map((r) => r.otherId),
    ...incomingRows.map((r) => r.otherId),
    ...outgoingRows.map((r) => r.otherId),
  ];
  const uniqueIds = [...new Set(allIds)];

  const profileMap: Record<string, ProfileRow> = {};
  if (uniqueIds.length > 0) {
    const { data: profiles } = await admin
      .from("profiles")
      .select("id, nickname, avatar_url, bio, wins, losses, debate_mmr, banter_mmr")
      .in("id", uniqueIds);
    for (const p of profiles ?? []) {
      profileMap[p.id as string] = {
        id: p.id as string,
        nickname: (p.nickname as string | null) ?? null,
        avatar_url: (p.avatar_url as string | null) ?? null,
        bio: (p.bio as string | null) ?? null,
        wins: (p.wins as number) ?? 0,
        losses: (p.losses as number) ?? 0,
        debate_mmr: (p.debate_mmr as number) ?? 1000,
        banter_mmr: (p.banter_mmr as number) ?? 1000,
      };
    }
  }

  // Fetch statuses for friends
  const friendIds = friendRows.map((r) => r.otherId);
  const statusMap: Record<string, string> = {};
  if (friendIds.length > 0) {
    const { data: statusRows } = await admin
      .from("user_statuses")
      .select("user_id, status, current_match_id, current_mode, last_seen_at")
      .in("user_id", friendIds);
    for (const s of statusRows ?? []) {
      statusMap[s.user_id as string] = getEffectiveUserStatus(s as UserStatusRow);
    }
  }

  const friends = friendRows
    .map(({ id, otherId }) => {
      const p = profileMap[otherId];
      if (!p) return null;
      return {
        requestId: id,
        userId: otherId,
        nickname: p.nickname,
        avatar_url: p.avatar_url,
        bio: p.bio,
        wins: p.wins,
        losses: p.losses,
        debate_mmr: p.debate_mmr,
        banter_mmr: p.banter_mmr,
        effectiveStatus: statusMap[otherId] ?? "offline",
      };
    })
    .filter(Boolean);

  const incomingRequests = incomingRows
    .map(({ id, otherId }) => {
      const p = profileMap[otherId];
      if (!p) return null;
      return {
        requestId: id,
        userId: otherId,
        nickname: p.nickname,
        avatar_url: p.avatar_url,
        bio: p.bio,
      };
    })
    .filter(Boolean);

  const outgoingRequests = outgoingRows
    .map(({ id, otherId }) => {
      const p = profileMap[otherId];
      if (!p) return null;
      return {
        requestId: id,
        userId: otherId,
        nickname: p.nickname,
        avatar_url: p.avatar_url,
        bio: p.bio,
      };
    })
    .filter(Boolean);

  return NextResponse.json({ friends, incomingRequests, outgoingRequests });
}
