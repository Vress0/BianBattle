import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUserSafe } from "@/lib/auth/get-current-user";

export const dynamic = "force-dynamic";

async function areFriends(
  admin: ReturnType<typeof createAdminClient>,
  userAId: string,
  userBId: string
): Promise<boolean> {
  const { data } = await admin
    .from("friend_requests")
    .select("id")
    .or(
      `and(requester_id.eq.${userAId},receiver_id.eq.${userBId}),and(requester_id.eq.${userBId},receiver_id.eq.${userAId})`
    )
    .eq("status", "accepted")
    .maybeSingle();
  return !!data;
}

export async function GET() {
  const supabase = await createClient();
  const user = await getCurrentUserSafe(supabase);
  if (!user) return NextResponse.json({ error: "未登入" }, { status: 401 });

  const admin = createAdminClient();

  const { data: invites } = await admin
    .from("battle_invites")
    .select(
      "id, inviter_id, receiver_id, mode, topic, inviter_side, receiver_side, status, match_id, expires_at, created_at"
    )
    .or(`receiver_id.eq.${user.id},inviter_id.eq.${user.id}`)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (!invites || invites.length === 0) {
    return NextResponse.json({ incoming: [], outgoing: [] });
  }

  const userIds = [
    ...new Set(invites.flatMap((i) => [i.inviter_id as string, i.receiver_id as string])),
  ];
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, nickname, avatar_url")
    .in("id", userIds);

  const pm = Object.fromEntries(
    (profiles ?? []).map((p) => [
      p.id as string,
      { nickname: (p.nickname as string | null) ?? null, avatar_url: (p.avatar_url as string | null) ?? null },
    ])
  );

  const incoming = invites
    .filter((i) => (i.receiver_id as string) === user.id)
    .map((i) => ({
      id: i.id as string,
      inviterId: i.inviter_id as string,
      inviterNickname: pm[i.inviter_id as string]?.nickname ?? null,
      inviterAvatarUrl: pm[i.inviter_id as string]?.avatar_url ?? null,
      mode: i.mode as string,
      topic: i.topic as string,
      inviterSide: i.inviter_side as string,
      receiverSide: i.receiver_side as string,
      myRole: (i.receiver_side as string) === "pro" ? "正方" : "反方",
      expiresAt: i.expires_at as string,
      createdAt: i.created_at as string,
    }));

  const outgoing = invites
    .filter((i) => (i.inviter_id as string) === user.id)
    .map((i) => ({
      id: i.id as string,
      receiverId: i.receiver_id as string,
      receiverNickname: pm[i.receiver_id as string]?.nickname ?? null,
      receiverAvatarUrl: pm[i.receiver_id as string]?.avatar_url ?? null,
      mode: i.mode as string,
      topic: i.topic as string,
      inviterSide: i.inviter_side as string,
      receiverSide: i.receiver_side as string,
      expiresAt: i.expires_at as string,
      createdAt: i.created_at as string,
    }));

  return NextResponse.json({ incoming, outgoing });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const user = await getCurrentUserSafe(supabase);
  if (!user) return NextResponse.json({ error: "未登入" }, { status: 401 });

  let body: { receiverId?: unknown; mode?: unknown; topic?: unknown; inviterSide?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "請求格式錯誤" }, { status: 400 });
  }

  const { receiverId, mode, topic, inviterSide } = body;

  if (!receiverId || typeof receiverId !== "string") {
    return NextResponse.json({ error: "缺少 receiverId" }, { status: 400 });
  }
  if (receiverId === user.id) {
    return NextResponse.json({ error: "不能邀請自己" }, { status: 400 });
  }
  if (!mode || !["debate", "banter"].includes(mode as string)) {
    return NextResponse.json({ error: "模式無效" }, { status: 400 });
  }
  if (!topic || typeof topic !== "string" || topic.trim().length === 0) {
    return NextResponse.json({ error: "辯題不可空白" }, { status: 400 });
  }
  if (topic.trim().length > 120) {
    return NextResponse.json({ error: "辯題最多 120 字" }, { status: 400 });
  }
  if (!inviterSide || !["pro", "con"].includes(inviterSide as string)) {
    return NextResponse.json({ error: "立場無效" }, { status: 400 });
  }

  const admin = createAdminClient();

  const friends = await areFriends(admin, user.id, receiverId);
  if (!friends) {
    return NextResponse.json({ error: "只能邀請好友對戰" }, { status: 403 });
  }

  const receiverSide = inviterSide === "pro" ? "con" : "pro";

  const { data: invite, error } = await admin
    .from("battle_invites")
    .insert({
      inviter_id: user.id,
      receiver_id: receiverId,
      mode: mode as "debate" | "banter",
      topic: (topic as string).trim(),
      inviter_side: inviterSide as "pro" | "con",
      receiver_side: receiverSide,
      status: "pending",
    })
    .select("id, expires_at")
    .single();

  if (error || !invite) {
    return NextResponse.json({ error: "發送邀請失敗" }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    inviteId: invite.id as string,
    expiresAt: invite.expires_at as string,
  });
}
