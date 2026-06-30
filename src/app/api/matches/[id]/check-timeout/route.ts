import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isInGracePeriod, opposedSide } from "@/lib/match-rules";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: matchId } = await params;

  const admin = createAdminClient();

  const { data: match } = await admin
    .from("matches")
    .select("id, status, started_at, ended_at, mode")
    .eq("id", matchId)
    .single();

  if (!match || match.status !== "active" || match.ended_at) {
    return NextResponse.json({ ok: true, changed: false });
  }

  if (isInGracePeriod(match.started_at)) {
    return NextResponse.json({ ok: true, changed: false, inGracePeriod: true });
  }

  const now = new Date();

  // Find any player whose forfeit_deadline_at has passed and hasn't been processed
  const { data: forfeitedPlayers } = await admin
    .from("match_players")
    .select("id, user_id, side, forfeit_deadline_at, forfeited_at")
    .eq("match_id", matchId)
    .not("forfeit_deadline_at", "is", null)
    .is("forfeited_at", null);

  const expired = (forfeitedPlayers ?? []).filter(
    (p) => p.forfeit_deadline_at && new Date(p.forfeit_deadline_at) <= now
  );

  if (expired.length === 0) {
    return NextResponse.json({ ok: true, changed: false });
  }

  // Take the first expired player (there should only be one in 1v1)
  const forfeiter = expired[0];
  const winnerSide = opposedSide(forfeiter.side as "pro" | "con");
  const nowIso = now.toISOString();

  // Idempotent match update
  const { data: updated } = await admin
    .from("matches")
    .update({
      status: "finished",
      ended_at: nowIso,
      ended_reason: "timeout",
      winner_side: winnerSide,
      is_rated: true,
      updated_at: nowIso,
    })
    .eq("id", matchId)
    .is("ended_at", null)
    .select("id");

  if (!updated || updated.length === 0) {
    return NextResponse.json({ ok: true, changed: false });
  }

  // Mark player as forfeited
  await admin
    .from("match_players")
    .update({ forfeited_at: nowIso })
    .eq("id", forfeiter.id);

  // Update stats
  const { data: winnerPlayer } = await admin
    .from("match_players")
    .select("user_id")
    .eq("match_id", matchId)
    .eq("side", winnerSide)
    .maybeSingle();

  const playerIds = [forfeiter.user_id, ...(winnerPlayer ? [winnerPlayer.user_id] : [])];
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, wins, losses")
    .in("id", playerIds);

  for (const profile of profiles ?? []) {
    if (profile.id === forfeiter.user_id) {
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

  await admin.from("match_typing_status").delete().eq("match_id", matchId);
  return NextResponse.json({ ok: true, changed: true });
}
