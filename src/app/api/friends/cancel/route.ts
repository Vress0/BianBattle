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

  let body: { requestId?: string };
  try {
    body = (await request.json()) as { requestId?: string };
  } catch {
    return NextResponse.json({ error: "請求格式錯誤" }, { status: 400 });
  }

  const { requestId } = body;
  if (!requestId || !UUID_RE.test(requestId)) {
    return NextResponse.json({ error: "無效的邀請 ID" }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: row } = await admin
    .from("friend_requests")
    .select("id, requester_id, status")
    .eq("id", requestId)
    .maybeSingle();

  if (!row) {
    return NextResponse.json({ error: "找不到好友邀請" }, { status: 404 });
  }
  if (row.requester_id !== user.id) {
    return NextResponse.json({ error: "只能取消自己送出的邀請" }, { status: 403 });
  }
  if (row.status !== "pending") {
    return NextResponse.json({ error: "只能取消待處理的邀請" }, { status: 400 });
  }

  const now = new Date().toISOString();
  const { error: updateErr } = await admin
    .from("friend_requests")
    .update({ status: "cancelled", updated_at: now })
    .eq("id", requestId);

  if (updateErr) {
    return NextResponse.json({ error: "取消失敗，請稍後再試" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, state: "none" });
}
