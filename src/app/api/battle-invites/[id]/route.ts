import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUserSafe } from "@/lib/auth/get-current-user";

export const dynamic = "force-dynamic";

export async function GET(
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
    .select(
      "id, inviter_id, receiver_id, mode, topic, inviter_side, receiver_side, status, match_id, expires_at"
    )
    .eq("id", inviteId)
    .maybeSingle();

  if (!invite) return NextResponse.json({ error: "找不到邀請" }, { status: 404 });

  if (
    (invite.inviter_id as string) !== user.id &&
    (invite.receiver_id as string) !== user.id
  ) {
    return NextResponse.json({ error: "無權查看此邀請" }, { status: 403 });
  }

  return NextResponse.json(
    {
      id: invite.id as string,
      status: invite.status as string,
      matchId: (invite.match_id as string | null) ?? null,
      mode: invite.mode as string,
      topic: invite.topic as string,
      inviterId: invite.inviter_id as string,
      receiverId: invite.receiver_id as string,
      inviterSide: invite.inviter_side as string,
      receiverSide: invite.receiver_side as string,
      expiresAt: invite.expires_at as string,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
