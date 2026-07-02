import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUserSafe } from "@/lib/auth/get-current-user";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: inviteId } = await params;

  const supabase = await createClient();
  const user = await getCurrentUserSafe(supabase);
  if (!user) return NextResponse.json({ error: "未登入" }, { status: 401 });

  let body: { action?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "請求格式錯誤" }, { status: 400 });
  }

  const { action } = body;
  if (!action || !["accept", "reject"].includes(action as string)) {
    return NextResponse.json({ error: "action 無效" }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: invite } = await admin
    .from("battle_invites")
    .select(
      "id, inviter_id, receiver_id, mode, topic, inviter_side, receiver_side, status, match_id, expires_at"
    )
    .eq("id", inviteId)
    .maybeSingle();

  if (!invite) return NextResponse.json({ error: "找不到邀請" }, { status: 404 });
  if ((invite.receiver_id as string) !== user.id) {
    return NextResponse.json({ error: "無權操作此邀請" }, { status: 403 });
  }

  // Idempotent: already accepted
  if ((invite.status as string) === "accepted" && invite.match_id) {
    return NextResponse.json({ ok: true, matchId: invite.match_id as string });
  }

  if ((invite.status as string) !== "pending") {
    return NextResponse.json({ error: "此邀請已不可操作" }, { status: 400 });
  }

  const now = new Date().toISOString();

  if (new Date(invite.expires_at as string) < new Date()) {
    await admin
      .from("battle_invites")
      .update({ status: "expired", updated_at: now })
      .eq("id", inviteId);
    return NextResponse.json({ error: "邀請已過期" }, { status: 400 });
  }

  if (action === "reject") {
    await admin
      .from("battle_invites")
      .update({ status: "rejected", updated_at: now })
      .eq("id", inviteId);
    return NextResponse.json({ ok: true });
  }

  // Accept — claim atomically: only succeeds if still pending AND receiver matches
  const { data: marked } = await admin
    .from("battle_invites")
    .update({ status: "accepted", updated_at: now })
    .eq("id", inviteId)
    .eq("status", "pending")
    .eq("receiver_id", user.id)
    .select("id")
    .maybeSingle();

  if (!marked) {
    const { data: existing } = await admin
      .from("battle_invites")
      .select("match_id, status")
      .eq("id", inviteId)
      .single();
    if (existing?.match_id) return NextResponse.json({ ok: true, matchId: existing.match_id as string });
    return NextResponse.json({ error: "邀請狀態已變更" }, { status: 400 });
  }

  const topicStr = (invite.topic as string).slice(0, 50);
  const modeStr = invite.mode as string;

  const { data: match, error: matchErr } = await admin
    .from("matches")
    .insert({
      title: `好友約戰：${topicStr}`,
      mode: modeStr,
      format: "1v1",
      topic: invite.topic as string,
      status: "active",
      created_by: invite.inviter_id as string,
      started_at: now,
      is_rated: true,
    })
    .select("id")
    .single();

  if (matchErr || !match) {
    // Rollback invite status
    await admin
      .from("battle_invites")
      .update({ status: "pending", updated_at: now })
      .eq("id", inviteId);
    return NextResponse.json({ error: "建立對戰失敗" }, { status: 500 });
  }

  const matchId = match.id as string;

  // Insert both players
  await admin.from("match_players").insert([
    {
      match_id: matchId,
      user_id: invite.inviter_id as string,
      side: invite.inviter_side as string,
      joined_at: now,
    },
    {
      match_id: matchId,
      user_id: invite.receiver_id as string,
      side: invite.receiver_side as string,
      joined_at: now,
    },
  ]);

  // Record match_id on invite
  await admin
    .from("battle_invites")
    .update({ match_id: matchId, updated_at: now })
    .eq("id", inviteId);

  // Update user statuses (best-effort)
  await Promise.allSettled([
    admin.from("user_statuses").upsert(
      {
        user_id: invite.inviter_id as string,
        status: "in_match",
        current_match_id: matchId,
        current_mode: modeStr,
        last_seen_at: now,
        updated_at: now,
      },
      { onConflict: "user_id" }
    ),
    admin.from("user_statuses").upsert(
      {
        user_id: invite.receiver_id as string,
        status: "in_match",
        current_match_id: matchId,
        current_mode: modeStr,
        last_seen_at: now,
        updated_at: now,
      },
      { onConflict: "user_id" }
    ),
  ]);

  return NextResponse.json({ ok: true, matchId });
}
