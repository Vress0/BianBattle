import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserSafe } from "@/lib/auth/get-current-user";
import { createAdminClient } from "@/lib/supabase/admin";
import { isInGracePeriod, AFK_FORFEIT_SECONDS } from "@/lib/match-rules";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: matchId } = await params;

  const supabase = await createClient();
  const user = await getCurrentUserSafe(supabase);

  if (!user) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }

  const admin = createAdminClient();

  const { data: match } = await admin
    .from("matches")
    .select("id, status, started_at, ended_at, mode")
    .eq("id", matchId)
    .single();

  if (!match) return NextResponse.json({ error: "找不到比賽" }, { status: 404 });

  const { data: player } = await admin
    .from("match_players")
    .select("id, side, user_id")
    .eq("match_id", matchId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!player) return NextResponse.json({ error: "你不是這場比賽的玩家" }, { status: 403 });

  const redirectTo = `/rooms/${match.mode}`;
  const now = new Date().toISOString();

  // Waiting: free the slot
  if (match.status === "waiting") {
    await admin.from("match_players").delete().eq("id", player.id);
    await admin.from("user_statuses").upsert(
      { user_id: user.id, status: "online", current_match_id: null, current_mode: null, last_seen_at: now, updated_at: now },
      { onConflict: "user_id" }
    );
    return NextResponse.json({ ok: true, redirectTo });
  }

  // Active + already ended
  if (match.ended_at) {
    return NextResponse.json({ ok: true, redirectTo });
  }

  const inGrace = isInGracePeriod(match.started_at);

  if (inGrace) {
    // Cancel match without stats
    const { data: updated } = await admin
      .from("matches")
      .update({
        status: "cancelled",
        ended_at: now,
        ended_reason: "grace_leave",
        winner_side: null,
        is_rated: false,
        updated_at: now,
      })
      .eq("id", matchId)
      .is("ended_at", null)
      .select("id");

    if (updated && updated.length > 0) {
      await admin.from("match_typing_status").delete().eq("match_id", matchId);
    }

    await admin.from("user_statuses").upsert(
      { user_id: user.id, status: "online", current_match_id: null, current_mode: null, last_seen_at: now, updated_at: now },
      { onConflict: "user_id" }
    );
    return NextResponse.json({ ok: true, redirectTo });
  }

  // After grace: record disconnection, let check-timeout handle forfeit
  const forfeitDeadline = new Date(Date.now() + AFK_FORFEIT_SECONDS * 1000).toISOString();

  await admin
    .from("match_players")
    .update({
      disconnected_at: now,
      forfeit_deadline_at: forfeitDeadline,
      last_seen_at: now,
    })
    .eq("id", player.id);

  await admin.from("match_typing_status")
    .update({ is_typing: false, last_typed_at: now })
    .eq("match_id", matchId)
    .eq("user_id", user.id);

  // Status will appear offline after 90s with no heartbeat — explicit clear for immediate UX
  await admin.from("user_statuses").upsert(
    { user_id: user.id, status: "online", current_match_id: null, current_mode: null, last_seen_at: now, updated_at: now },
    { onConflict: "user_id" }
  );

  return NextResponse.json({ ok: true, redirectTo });
}
