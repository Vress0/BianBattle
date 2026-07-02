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

  let body: { userId?: string };
  try {
    body = (await request.json()) as { userId?: string };
  } catch {
    return NextResponse.json({ error: "請求格式錯誤" }, { status: 400 });
  }

  const { userId: targetId } = body;
  if (!targetId || !UUID_RE.test(targetId)) {
    return NextResponse.json({ error: "無效的使用者 ID" }, { status: 400 });
  }
  if (targetId === user.id) {
    return NextResponse.json({ error: "不能對自己執行此操作" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Find accepted relationship (either direction)
  const [{ data: fwd }, { data: rev }] = await Promise.all([
    admin
      .from("friend_requests")
      .select("id, status")
      .eq("requester_id", user.id)
      .eq("receiver_id", targetId)
      .eq("status", "accepted")
      .maybeSingle(),
    admin
      .from("friend_requests")
      .select("id, status")
      .eq("requester_id", targetId)
      .eq("receiver_id", user.id)
      .eq("status", "accepted")
      .maybeSingle(),
  ]);
  const existing = fwd ?? rev;

  if (!existing) {
    return NextResponse.json({ error: "你們不是好友" }, { status: 400 });
  }

  const now = new Date().toISOString();
  const { error: updateErr } = await admin
    .from("friend_requests")
    .update({ status: "cancelled", updated_at: now })
    .eq("id", existing.id);

  if (updateErr) {
    return NextResponse.json({ error: "解除好友失敗，請稍後再試" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, state: "none" });
}
