import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUserSafe } from "@/lib/auth/get-current-user";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const user = await getCurrentUserSafe(supabase);
  if (!user) return NextResponse.json({ error: "未登入" }, { status: 401 });

  const admin = createAdminClient();
  const now = new Date().toISOString();

  const [frResult, biResult] = await Promise.all([
    admin
      .from("friend_requests")
      .select("id, requester_id, created_at")
      .eq("receiver_id", user.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false }),
    admin
      .from("battle_invites")
      .select("id, inviter_id, mode, topic, inviter_side, receiver_side, expires_at, created_at")
      .eq("receiver_id", user.id)
      .eq("status", "pending")
      .gt("expires_at", now)
      .order("created_at", { ascending: false }),
  ]);

  const frUserIds = (frResult.data ?? []).map((r) => r.requester_id as string);
  const biUserIds = (biResult.data ?? []).map((r) => r.inviter_id as string);
  const userIds = [...new Set([...frUserIds, ...biUserIds])];

  const profileMap: Record<string, { nickname: string | null; avatar_url: string | null }> = {};
  if (userIds.length > 0) {
    const { data: profiles } = await admin
      .from("profiles")
      .select("id, nickname, avatar_url")
      .in("id", userIds);
    for (const p of profiles ?? []) {
      profileMap[p.id as string] = {
        nickname: (p.nickname as string | null) ?? null,
        avatar_url: (p.avatar_url as string | null) ?? null,
      };
    }
  }

  const friendRequests = (frResult.data ?? []).map((r) => ({
    id: r.id as string,
    type: "friend_request" as const,
    userId: r.requester_id as string,
    nickname: profileMap[r.requester_id as string]?.nickname ?? null,
    avatarUrl: profileMap[r.requester_id as string]?.avatar_url ?? null,
    createdAt: r.created_at as string,
  }));

  const battleInvites = (biResult.data ?? []).map((r) => ({
    id: r.id as string,
    type: "battle_invite" as const,
    inviterId: r.inviter_id as string,
    inviterNickname: profileMap[r.inviter_id as string]?.nickname ?? null,
    inviterAvatarUrl: profileMap[r.inviter_id as string]?.avatar_url ?? null,
    mode: r.mode as string,
    topic: r.topic as string,
    myRole: (r.receiver_side as string) === "pro" ? "正方" : "反方",
    expiresAt: r.expires_at as string,
    createdAt: r.created_at as string,
  }));

  return NextResponse.json({
    friendRequests,
    battleInvites,
    totalCount: friendRequests.length + battleInvites.length,
  });
}
