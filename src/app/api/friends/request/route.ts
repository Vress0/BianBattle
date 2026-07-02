import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUserSafe } from "@/lib/auth/get-current-user";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const user = await getCurrentUserSafe(supabase);
  if (!user) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }

  let body: { receiverId?: string };
  try {
    body = (await request.json()) as { receiverId?: string };
  } catch {
    return NextResponse.json({ error: "請求格式錯誤" }, { status: 400 });
  }

  const { receiverId } = body;
  if (!receiverId || !UUID_RE.test(receiverId)) {
    return NextResponse.json({ error: "無效的使用者 ID" }, { status: 400 });
  }
  if (receiverId === user.id) {
    return NextResponse.json({ error: "不能加自己為好友" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Verify receiver exists
  const { data: receiverProfile } = await admin
    .from("profiles")
    .select("id")
    .eq("id", receiverId)
    .maybeSingle();
  if (!receiverProfile) {
    return NextResponse.json({ error: "找不到該使用者" }, { status: 404 });
  }

  // Check existing relationship (either direction)
  const [{ data: fwd }, { data: rev }] = await Promise.all([
    admin
      .from("friend_requests")
      .select("id, requester_id, receiver_id, status")
      .eq("requester_id", user.id)
      .eq("receiver_id", receiverId)
      .maybeSingle(),
    admin
      .from("friend_requests")
      .select("id, requester_id, receiver_id, status")
      .eq("requester_id", receiverId)
      .eq("receiver_id", user.id)
      .maybeSingle(),
  ]);
  const existing = fwd ?? rev;

  const now = new Date().toISOString();

  if (existing) {
    if (existing.status === "accepted") {
      return NextResponse.json({ error: "你們已經是好友了" }, { status: 400 });
    }
    if (existing.status === "pending") {
      if (existing.requester_id === user.id) {
        return NextResponse.json({ error: "你已送出好友邀請，等待對方接受" }, { status: 400 });
      }
      // They already sent me a request — tell user to respond instead
      return NextResponse.json(
        { error: "對方已向你送出好友邀請，請查看收到的邀請" },
        { status: 400 }
      );
    }
    // rejected or cancelled → re-request: update row, swap requester/receiver to current user
    const { data: updated, error: updateErr } = await admin
      .from("friend_requests")
      .update({
        requester_id: user.id,
        receiver_id: receiverId,
        status: "pending",
        updated_at: now,
      })
      .eq("id", existing.id)
      .select("id")
      .single();
    if (updateErr || !updated) {
      return NextResponse.json({ error: "送出邀請失敗，請稍後再試" }, { status: 500 });
    }
    return NextResponse.json({ ok: true, state: "pending_sent", requestId: updated.id });
  }

  // No existing row — insert
  const { data: inserted, error: insertErr } = await admin
    .from("friend_requests")
    .insert({ requester_id: user.id, receiver_id: receiverId, status: "pending" })
    .select("id")
    .single();
  if (insertErr || !inserted) {
    return NextResponse.json({ error: "送出邀請失敗，請稍後再試" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, state: "pending_sent", requestId: inserted.id });
}
