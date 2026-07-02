import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getEffectiveUserStatus } from "@/lib/status-display";
import type { UserStatusRow } from "@/lib/status-display";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const raw = searchParams.get("userIds") ?? "";
  const userIds = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 200);

  if (userIds.length === 0) {
    return NextResponse.json({ statuses: {} });
  }

  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("user_statuses")
      .select("user_id, status, current_match_id, current_mode, last_seen_at")
      .in("user_id", userIds);

    const statuses: Record<string, string> = {};
    for (const row of data ?? []) {
      const uid = row.user_id as string;
      statuses[uid] = getEffectiveUserStatus(row as UserStatusRow);
    }
    // Users not in the result are offline
    for (const uid of userIds) {
      if (!(uid in statuses)) {
        statuses[uid] = "offline";
      }
    }

    return NextResponse.json({ statuses });
  } catch {
    return NextResponse.json({ statuses: {} });
  }
}
