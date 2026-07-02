import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserSafe } from "@/lib/auth/get-current-user";
import { getEffectiveUserStatus } from "@/lib/status-display";
import type { UserEffectiveStatus } from "@/lib/status-display";
import { getUserMatchResult } from "@/lib/match-display";
import type { UserMatchResultKey } from "@/lib/match-display";
import MatchRoom from "./MatchRoom";

interface PageProps {
  params: Promise<{ id: string }>;
}

type StatusMap = Record<string, UserEffectiveStatus>;

interface ProfileData {
  nickname: string | null;
  avatar_url: string | null;
  bio: string | null;
  wins: number;
  losses: number;
  debate_mmr: number;
  banter_mmr: number;
}

type RecentRow = {
  side: string;
  match: {
    status: string;
    winner_side: string | null;
    is_rated: boolean | null;
    ended_at: string | null;
  } | null;
};

function processRecentResults(data: unknown[] | null): UserMatchResultKey[] {
  if (!data) return [];
  return (data as RecentRow[])
    .filter((r) => r.match && (r.match.status === "finished" || r.match.status === "cancelled"))
    .sort((a, b) => {
      const at = a.match?.ended_at ? new Date(a.match.ended_at).getTime() : 0;
      const bt = b.match?.ended_at ? new Date(b.match.ended_at).getTime() : 0;
      return bt - at;
    })
    .slice(0, 5)
    .map((r) =>
      getUserMatchResult(
        r.match!.status,
        r.match!.winner_side,
        r.match!.is_rated ?? false,
        r.side
      )
    );
}

export default async function MatchPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const user = await getCurrentUserSafe(supabase);

  const { data: match } = await supabase
    .from("matches")
    .select("id, title, mode, format, status, topic, pro_position, con_position, created_by, winner_side, started_at, ended_at, ended_reason, surrendered_by, is_rated, created_at, updated_at")
    .eq("id", id)
    .single();

  if (!match) notFound();

  const { data: rawPlayers } = await supabase
    .from("match_players")
    .select("id, match_id, user_id, side, joined_at, disconnected_at, forfeit_deadline_at, forfeited_at, last_seen_at")
    .eq("match_id", id);

  const { data: rawMessages } = await supabase
    .from("match_messages")
    .select("id, match_id, user_id, side, content, round, created_at")
    .eq("match_id", id)
    .order("created_at", { ascending: true });

  const playerUserIds = rawPlayers?.map((p) => p.user_id) ?? [];
  const messageUserIds = rawMessages?.map((m) => m.user_id) ?? [];
  const allUserIds = [...new Set([...playerUserIds, ...messageUserIds])];

  const proRaw = rawPlayers?.find((p) => p.side === "pro") ?? null;
  const conRaw = rawPlayers?.find((p) => p.side === "con") ?? null;

  // Expanded profile query + initial statuses + recent results (all parallel)
  const [profilesResult, statusesResult, proRecentResult, conRecentResult] = await Promise.all([
    allUserIds.length > 0
      ? supabase
          .from("profiles")
          .select("id, nickname, avatar_url, bio, wins, losses, debate_mmr, banter_mmr")
          .in("id", allUserIds)
      : Promise.resolve({ data: null }),
    playerUserIds.length > 0
      ? supabase
          .from("user_statuses")
          .select("user_id, status, current_match_id, current_mode, last_seen_at")
          .in("user_id", playerUserIds)
      : Promise.resolve({ data: null }),
    proRaw
      ? supabase
          .from("match_players")
          .select("side, match:matches!match_id(status, winner_side, is_rated, ended_at)")
          .eq("user_id", proRaw.user_id)
          .neq("match_id", id)
          .limit(20)
      : Promise.resolve({ data: null }),
    conRaw
      ? supabase
          .from("match_players")
          .select("side, match:matches!match_id(status, winner_side, is_rated, ended_at)")
          .eq("user_id", conRaw.user_id)
          .neq("match_id", id)
          .limit(20)
      : Promise.resolve({ data: null }),
  ]);

  const profileMap: Record<string, ProfileData> = {};
  for (const p of profilesResult.data ?? []) {
    profileMap[p.id] = {
      nickname: p.nickname ?? null,
      avatar_url: p.avatar_url ?? null,
      bio: p.bio ?? null,
      wins: (p.wins as number | null) ?? 0,
      losses: (p.losses as number | null) ?? 0,
      debate_mmr: (p.debate_mmr as number | null) ?? 1000,
      banter_mmr: (p.banter_mmr as number | null) ?? 1000,
    };
  }

  const initialStatuses: StatusMap = {};
  for (const row of statusesResult.data ?? []) {
    const r = row as {
      user_id: string;
      status: string;
      current_match_id: string | null;
      current_mode: string | null;
      last_seen_at: string;
    };
    initialStatuses[r.user_id] = getEffectiveUserStatus(r);
  }

  const proRecentResults = processRecentResults(proRecentResult.data);
  const conRecentResults = processRecentResults(conRecentResult.data);

  const messages = (rawMessages ?? []).map((m) => ({
    id: m.id,
    match_id: m.match_id,
    user_id: m.user_id,
    side: m.side,
    content: m.content,
    round: m.round,
    created_at: m.created_at,
    nickname: profileMap[m.user_id]?.nickname ?? null,
  }));

  function buildPlayer(raw: typeof proRaw) {
    if (!raw) return null;
    const prof = profileMap[raw.user_id];
    return {
      user_id: raw.user_id,
      nickname: prof?.nickname ?? null,
      disconnected_at: raw.disconnected_at ?? null,
      forfeit_deadline_at: raw.forfeit_deadline_at ?? null,
      avatar_url: prof?.avatar_url ?? null,
      bio: prof?.bio ?? null,
      wins: prof?.wins ?? 0,
      losses: prof?.losses ?? 0,
      debate_mmr: prof?.debate_mmr ?? 1000,
      banter_mmr: prof?.banter_mmr ?? 1000,
    };
  }

  return (
    <main className="min-h-screen bg-slate-950">
      <div className="mx-auto max-w-5xl px-4 py-8">
        <MatchRoom
          match={{
            id: match.id,
            title: match.title,
            mode: match.mode,
            status: match.status,
            topic: match.topic,
            pro_position: match.pro_position ?? null,
            con_position: match.con_position ?? null,
            started_at: match.started_at ?? null,
            ended_at: match.ended_at ?? null,
            ended_reason: match.ended_reason ?? null,
            winner_side: match.winner_side ?? null,
            is_rated: match.is_rated ?? true,
          }}
          proPlayer={buildPlayer(proRaw)}
          conPlayer={buildPlayer(conRaw)}
          proRecentResults={proRecentResults}
          conRecentResults={conRecentResults}
          initialStatuses={initialStatuses}
          messages={messages}
          currentUserId={user?.id ?? null}
        />
      </div>
    </main>
  );
}
