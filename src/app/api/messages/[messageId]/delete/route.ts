import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUserSafe } from "@/lib/auth/get-current-user";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ messageId: string }> }
) {
  const { messageId } = await params;

  if (!UUID_RE.test(messageId)) {
    return NextResponse.json({ error: "無效的訊息 ID" }, { status: 400 });
  }

  const supabase = await createClient();
  const user = await getCurrentUserSafe(supabase);
  if (!user) return NextResponse.json({ error: "未登入" }, { status: 401 });

  const admin = createAdminClient();

  const { data: msg } = await admin
    .from("direct_messages")
    .select("id, sender_id, deleted_at")
    .eq("id", messageId)
    .maybeSingle();

  if (!msg) return NextResponse.json({ error: "找不到訊息" }, { status: 404 });
  if ((msg.sender_id as string) !== user.id) {
    return NextResponse.json({ error: "只能收回自己的訊息" }, { status: 403 });
  }
  if (msg.deleted_at) {
    return NextResponse.json({ ok: true });
  }

  const now = new Date().toISOString();
  const { error } = await admin
    .from("direct_messages")
    .update({ deleted_at: now, updated_at: now })
    .eq("id", messageId);

  if (error) {
    return NextResponse.json({ error: "收回失敗，請稍後再試" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
