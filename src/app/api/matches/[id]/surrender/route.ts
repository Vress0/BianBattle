import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserSafe } from "@/lib/auth/get-current-user";
import { createAdminClient } from "@/lib/supabase/admin";
import { isInGracePeriod, opposedSide } from "@/lib/match-rules";

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
  if (match.status !== "active") return NextResponse.json({ error: "比賽不在進行中" }, { status: 400 });
  if (match.ended_at) return NextResponse.json({ error: "比賽已結束" }, { status: 400 });

  const { data: player } = await admin
    .from("match_players")
    .select("id, side, user_id")
    .eq("match_id", matchId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!player) return NextResponse.json({ error: "你不是這場比賽的玩家" }, { status: 403 });

  const mySide = player.side as "pro" | "con";
  const winnerSide = opposedSide(mySide);
  const now = new Date().toISOString();
  const inGrace = isInGracePeriod(match.started_at);

  if (inGrace) {
    const { data: updated } = await admin
      .from("matches")
      .update({
        status: "cancelled",
        ended_at: now,
        ended_reason: "grace_surrender",
        surrendered_by: user.id,
        winner_side: null,
        is_rated: false,
        updated_at: now,
      })
      .eq("id", matchId)
      .is("ended_at", null)
      .select("id");

    if (!updated || updated.length === 0) {
      return NextResponse.json({ error: "比賽已結束" }, { status: 400 });
    }

    await admin
      .from("match_players")
      .update({ disconnected_at: null, forfeit_deadline_at: null })
      .eq("match_id", matchId);
    await admin.from("match_typing_status").delete().eq("match_id", matchId);

    // Clear status for surrendering player (both players had grace — cancel, not finish)
    await admin.from("user_statuses").upsert(
      { user_id: user.id, status: "online", current_match_id: null, current_mode: null, last_seen_at: now, updated_at: now },
      { onConflict: "user_id" }
    );
    return NextResponse.json({ ok: true, rated: false, reason: "grace_surrender" });
  }

  // Normal surrender
  const { data: updated } = await admin
    .from("matches")
    .update({
      status: "finished",
      ended_at: now,
      ended_reason: "surrender",
      surrendered_by: user.id,
      winner_side: winnerSide,
      is_rated: true,
      updated_at: now,
    })
    .eq("id", matchId)
    .is("ended_at", null)
    .select("id");

  if (!updated || updated.length === 0) {
    return NextResponse.json({ error: "比賽已結束" }, { status: 400 });
  }

  // Update stats (protected by ended_at check above — only runs once)
  const { data: opponentPlayer } = await admin
    .from("match_players")
    .select("user_id")
    .eq("match_id", matchId)
    .eq("side", winnerSide)
    .maybeSingle();

  const playerIds = [user.id, ...(opponentPlayer ? [opponentPlayer.user_id] : [])];
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, wins, losses")
    .in("id", playerIds);

  for (const profile of profiles ?? []) {
    if (profile.id === user.id) {
      await admin
        .from("profiles")
        .update({ losses: (profile.losses ?? 0) + 1 })
        .eq("id", profile.id);
    } else {
      await admin
        .from("profiles")
        .update({ wins: (profile.wins ?? 0) + 1 })
        .eq("id", profile.id);
    }
  }

  await admin
    .from("match_players")
    .update({ disconnected_at: null, forfeit_deadline_at: null })
    .eq("match_id", matchId);
  await admin.from("match_typing_status").delete().eq("match_id", matchId);

  // Clear status for both players — match is over
  const allPlayerIds = [user.id, ...(opponentPlayer ? [opponentPlayer.user_id] : [])];
  for (const uid of allPlayerIds) {
    await admin.from("user_statuses").upsert(
      { user_id: uid, status: "online", current_match_id: null, current_mode: null, last_seen_at: now, updated_at: now },
      { onConflict: "user_id" }
    );
  }

  return NextResponse.json({ ok: true, rated: true, reason: "surrender" });
}
