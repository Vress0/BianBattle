import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUserSafe } from "@/lib/auth/get-current-user";

export const dynamic = "force-dynamic";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: inviteId } = await params;

  const supabase = await createClient();
  const user = await getCurrentUserSafe(supabase);
  if (!user) return NextResponse.json({ error: "未登入" }, { status: 401 });

  const admin = createAdminClient();

  const { data: invite } = await admin
    .from("battle_invites")
    .select("id, inviter_id, status")
    .eq("id", inviteId)
    .maybeSingle();

  if (!invite) return NextResponse.json({ error: "找不到邀請" }, { status: 404 });
  if ((invite.inviter_id as string) !== user.id) {
    return NextResponse.json({ error: "只有發起人可以取消邀請" }, { status: 403 });
  }
  if ((invite.status as string) !== "pending") {
    return NextResponse.json({ error: "此邀請已不可取消" }, { status: 400 });
  }

  await admin
    .from("battle_invites")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("id", inviteId);

  return NextResponse.json({ ok: true });
}
