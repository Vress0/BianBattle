import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserSafe } from "@/lib/auth/get-current-user";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const user = await getCurrentUserSafe(supabase);

  if (!user) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }

  let body: { status?: string; matchId?: string | null };
  try {
    body = (await request.json()) as { status?: string; matchId?: string | null };
  } catch {
    return NextResponse.json({ error: "請求格式錯誤" }, { status: 400 });
  }

  const { status = "online", matchId = null } = body;

  if (!["online", "in_match", "idle"].includes(status)) {
    return NextResponse.json({ error: "無效的狀態" }, { status: 400 });
  }

  const admin = createAdminClient();
  const now = new Date().toISOString();

  if (status === "in_match") {
    if (!matchId) {
      return NextResponse.json({ error: "對局中狀態需提供 matchId" }, { status: 400 });
    }

    const { data: match } = await admin
      .from("matches")
      .select("id, mode, status")
      .eq("id", matchId)
      .maybeSingle();

    if (!match) {
      return NextResponse.json({ error: "找不到這場比賽" }, { status: 404 });
    }

    // If match already ended, treat as online
    if (match.status === "finished" || match.status === "cancelled") {
      await admin.from("user_statuses").upsert(
        {
          user_id: user.id,
          status: "online",
          current_match_id: null,
          current_mode: null,
          last_seen_at: now,
          updated_at: now,
        },
        { onConflict: "user_id" }
      );
      return NextResponse.json({ ok: true });
    }

    // Verify user is a player in this match
    const { data: player } = await admin
      .from("match_players")
      .select("id")
      .eq("match_id", matchId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!player) {
      return NextResponse.json({ error: "你不是這場比賽的玩家" }, { status: 403 });
    }

    await admin.from("user_statuses").upsert(
      {
        user_id: user.id,
        status: "in_match",
        current_match_id: matchId,
        current_mode: match.mode as string,
        last_seen_at: now,
        updated_at: now,
      },
      { onConflict: "user_id" }
    );
  } else {
    await admin.from("user_statuses").upsert(
      {
        user_id: user.id,
        status,
        current_match_id: null,
        current_mode: null,
        last_seen_at: now,
        updated_at: now,
      },
      { onConflict: "user_id" }
    );
  }

  return NextResponse.json({ ok: true });
}
