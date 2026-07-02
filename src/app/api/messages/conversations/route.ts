import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUserSafe } from "@/lib/auth/get-current-user";
import { getEffectiveUserStatus } from "@/lib/status-display";
import type { UserStatusRow } from "@/lib/status-display";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET() {
  const supabase = await createClient();
  const user = await getCurrentUserSafe(supabase);
  if (!user) return NextResponse.json({ error: "未登入" }, { status: 401 });

  const admin = createAdminClient();
  const userId = user.id;

  const { data: convRows } = await admin
    .from("direct_conversations")
    .select("id, user_one_id, user_two_id, last_message_preview, last_message_at")
    .or(`user_one_id.eq.${userId},user_two_id.eq.${userId}`)
    .order("last_message_at", { ascending: false, nullsFirst: false });

  if (!convRows || convRows.length === 0) {
    return NextResponse.json({ conversations: [] });
  }

  const convIds = convRows.map((c) => c.id as string);
  const otherIdByConv: Record<string, string> = {};
  for (const c of convRows) {
    otherIdByConv[c.id as string] =
      (c.user_one_id as string) === userId
        ? (c.user_two_id as string)
        : (c.user_one_id as string);
  }
  const otherIds = [...new Set(Object.values(otherIdByConv))];

  const [
    { data: profiles },
    { data: statusRows },
    { data: readRecords },
    { data: unreadMessages },
  ] = await Promise.all([
    admin.from("profiles").select("id, nickname, avatar_url").in("id", otherIds),
    admin
      .from("user_statuses")
      .select("user_id, status, current_match_id, current_mode, last_seen_at")
      .in("user_id", otherIds),
    admin
      .from("direct_conversation_reads")
      .select("conversation_id, last_read_at")
      .eq("user_id", userId)
      .in("conversation_id", convIds),
    admin
      .from("direct_messages")
      .select("conversation_id, created_at")
      .in("conversation_id", convIds)
      .neq("sender_id", userId)
      .is("deleted_at", null),
  ]);

  const profileMap: Record<string, { nickname: string | null; avatar_url: string | null }> = {};
  for (const p of profiles ?? []) {
    profileMap[p.id as string] = {
      nickname: p.nickname as string | null,
      avatar_url: p.avatar_url as string | null,
    };
  }

  const statusMap: Record<string, string> = {};
  for (const s of statusRows ?? []) {
    statusMap[s.user_id as string] = getEffectiveUserStatus(s as UserStatusRow);
  }

  const readMap: Record<string, string | null> = {};
  for (const r of readRecords ?? []) {
    readMap[r.conversation_id as string] = r.last_read_at as string | null;
  }

  const unreadCounts: Record<string, number> = {};
  for (const msg of unreadMessages ?? []) {
    const cid = msg.conversation_id as string;
    const lastRead = readMap[cid];
    const createdAt = msg.created_at as string;
    if (!lastRead || createdAt > lastRead) {
      unreadCounts[cid] = (unreadCounts[cid] ?? 0) + 1;
    }
  }

  const conversations = convRows.map((c) => {
    const cid = c.id as string;
    const otherId = otherIdByConv[cid];
    const profile = profileMap[otherId];
    return {
      conversationId: cid,
      otherUser: {
        id: otherId,
        nickname: profile?.nickname ?? null,
        avatar_url: profile?.avatar_url ?? null,
      },
      otherUserStatus: statusMap[otherId] ?? "offline",
      last_message_preview: c.last_message_preview as string | null,
      last_message_at: c.last_message_at as string | null,
      unread_count: unreadCounts[cid] ?? 0,
    };
  });

  return NextResponse.json({ conversations });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const user = await getCurrentUserSafe(supabase);
  if (!user) return NextResponse.json({ error: "未登入" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "請求格式錯誤" }, { status: 400 });
  }

  const targetUserId = (body as { targetUserId?: unknown }).targetUserId;
  if (typeof targetUserId !== "string" || !UUID_RE.test(targetUserId)) {
    return NextResponse.json({ error: "無效的使用者 ID" }, { status: 400 });
  }
  if (targetUserId === user.id) {
    return NextResponse.json({ error: "不能和自己私訊" }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: targetProfile } = await admin
    .from("profiles")
    .select("id")
    .eq("id", targetUserId)
    .maybeSingle();
  if (!targetProfile) {
    return NextResponse.json({ error: "找不到該使用者" }, { status: 404 });
  }

  // Verify they are friends (either direction)
  const [{ data: fwd }, { data: rev }] = await Promise.all([
    admin
      .from("friend_requests")
      .select("id")
      .eq("requester_id", user.id)
      .eq("receiver_id", targetUserId)
      .eq("status", "accepted")
      .maybeSingle(),
    admin
      .from("friend_requests")
      .select("id")
      .eq("requester_id", targetUserId)
      .eq("receiver_id", user.id)
      .eq("status", "accepted")
      .maybeSingle(),
  ]);
  if (!fwd && !rev) {
    return NextResponse.json({ error: "只能和好友私訊" }, { status: 403 });
  }

  // user_one_id < user_two_id (lexicographic)
  const [smallerId, largerId] =
    user.id < targetUserId ? [user.id, targetUserId] : [targetUserId, user.id];

  const { data: existing } = await admin
    .from("direct_conversations")
    .select("id")
    .eq("user_one_id", smallerId)
    .eq("user_two_id", largerId)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ ok: true, conversationId: existing.id });
  }

  const { data: newConv, error: createErr } = await admin
    .from("direct_conversations")
    .insert({ user_one_id: smallerId, user_two_id: largerId })
    .select("id")
    .single();

  if (createErr || !newConv) {
    return NextResponse.json({ error: "建立私訊失敗，請稍後再試" }, { status: 500 });
  }

  await admin.from("direct_conversation_reads").insert([
    { conversation_id: newConv.id, user_id: user.id, last_read_at: new Date().toISOString() },
    { conversation_id: newConv.id, user_id: targetUserId, last_read_at: null },
  ]);

  return NextResponse.json({ ok: true, conversationId: newConv.id });
}
