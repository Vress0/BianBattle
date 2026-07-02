import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUserSafe } from "@/lib/auth/get-current-user";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function verifyParticipant(conversationId: string, userId: string) {
  const admin = createAdminClient();
  const { data: conv } = await admin
    .from("direct_conversations")
    .select("id, user_one_id, user_two_id")
    .eq("id", conversationId)
    .maybeSingle();
  if (!conv) return null;
  if ((conv.user_one_id as string) !== userId && (conv.user_two_id as string) !== userId)
    return null;
  return conv;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  const { conversationId } = await params;

  if (!UUID_RE.test(conversationId)) {
    return NextResponse.json({ error: "無效的對話 ID" }, { status: 400 });
  }

  const supabase = await createClient();
  const user = await getCurrentUserSafe(supabase);
  if (!user) return NextResponse.json({ error: "未登入" }, { status: 401 });

  const conv = await verifyParticipant(conversationId, user.id);
  if (!conv) return NextResponse.json({ error: "無法存取此對話" }, { status: 403 });

  const admin = createAdminClient();
  const { data: rows } = await admin
    .from("direct_messages")
    .select("id, sender_id, body, created_at, deleted_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(50);

  const messages = (rows ?? []).reverse().map((m) => ({
    id: m.id,
    sender_id: m.sender_id,
    body: m.deleted_at ? null : m.body,
    created_at: m.created_at,
    deleted_at: m.deleted_at ?? null,
  }));

  return NextResponse.json({ messages });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  const { conversationId } = await params;

  if (!UUID_RE.test(conversationId)) {
    return NextResponse.json({ error: "無效的對話 ID" }, { status: 400 });
  }

  const supabase = await createClient();
  const user = await getCurrentUserSafe(supabase);
  if (!user) return NextResponse.json({ error: "未登入" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "請求格式錯誤" }, { status: 400 });
  }

  const msgBody = (body as { body?: unknown }).body;
  if (typeof msgBody !== "string") {
    return NextResponse.json({ error: "訊息格式錯誤" }, { status: 400 });
  }
  const trimmed = msgBody.trim();
  if (trimmed.length === 0) {
    return NextResponse.json({ error: "訊息不可空白" }, { status: 400 });
  }
  if (trimmed.length > 1000) {
    return NextResponse.json({ error: "訊息最多 1000 字" }, { status: 400 });
  }

  const conv = await verifyParticipant(conversationId, user.id);
  if (!conv) return NextResponse.json({ error: "無法存取此對話" }, { status: 403 });

  // Verify they are still friends
  const admin = createAdminClient();
  const otherId =
    (conv.user_one_id as string) === user.id
      ? (conv.user_two_id as string)
      : (conv.user_one_id as string);

  const [{ data: fwd }, { data: rev }] = await Promise.all([
    admin
      .from("friend_requests")
      .select("id")
      .eq("requester_id", user.id)
      .eq("receiver_id", otherId)
      .eq("status", "accepted")
      .maybeSingle(),
    admin
      .from("friend_requests")
      .select("id")
      .eq("requester_id", otherId)
      .eq("receiver_id", user.id)
      .eq("status", "accepted")
      .maybeSingle(),
  ]);
  if (!fwd && !rev) {
    return NextResponse.json({ error: "只能和好友私訊" }, { status: 403 });
  }

  const now = new Date().toISOString();

  // sender_id always from auth, never from request body
  const { data: newMsg, error: insertErr } = await admin
    .from("direct_messages")
    .insert({ conversation_id: conversationId, sender_id: user.id, body: trimmed })
    .select("id, sender_id, body, created_at, deleted_at")
    .single();

  if (insertErr || !newMsg) {
    return NextResponse.json({ error: "送出訊息失敗，請稍後再試" }, { status: 500 });
  }

  await Promise.all([
    admin
      .from("direct_conversations")
      .update({
        last_message_at: now,
        last_message_preview: trimmed.slice(0, 100),
        updated_at: now,
      })
      .eq("id", conversationId),
    admin
      .from("direct_conversation_reads")
      .upsert(
        { conversation_id: conversationId, user_id: user.id, last_read_at: now },
        { onConflict: "conversation_id,user_id" }
      ),
  ]);

  return NextResponse.json({
    message: {
      id: newMsg.id,
      sender_id: newMsg.sender_id,
      body: newMsg.body,
      created_at: newMsg.created_at,
      deleted_at: null,
    },
  });
}
