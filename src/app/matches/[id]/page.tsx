import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import MatchRoom from "./MatchRoom";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function MatchPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: match } = await supabase
    .from("matches")
    .select("id, title, mode, format, status, topic, created_by, winner_side, started_at, ended_at, ended_reason, surrendered_by, is_rated, created_at, updated_at")
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

  // Resolve profiles for all involved users
  const playerUserIds = rawPlayers?.map((p) => p.user_id) ?? [];
  const messageUserIds = rawMessages?.map((m) => m.user_id) ?? [];
  const allUserIds = [...new Set([...playerUserIds, ...messageUserIds])];

  const profileMap: Record<string, string | null> = {};
  if (allUserIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, nickname")
      .in("id", allUserIds);
    for (const p of profiles ?? []) {
      profileMap[p.id] = p.nickname ?? null;
    }
  }

  const proRaw = rawPlayers?.find((p) => p.side === "pro") ?? null;
  const conRaw = rawPlayers?.find((p) => p.side === "con") ?? null;

  const messages = (rawMessages ?? []).map((m) => ({
    id: m.id,
    match_id: m.match_id,
    user_id: m.user_id,
    side: m.side,
    content: m.content,
    round: m.round,
    created_at: m.created_at,
    nickname: profileMap[m.user_id] ?? null,
  }));

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
            started_at: match.started_at ?? null,
            ended_at: match.ended_at ?? null,
            ended_reason: match.ended_reason ?? null,
            winner_side: match.winner_side ?? null,
            is_rated: match.is_rated ?? true,
          }}
          proPlayer={
            proRaw
              ? {
                  user_id: proRaw.user_id,
                  nickname: profileMap[proRaw.user_id] ?? null,
                  disconnected_at: proRaw.disconnected_at ?? null,
                  forfeit_deadline_at: proRaw.forfeit_deadline_at ?? null,
                }
              : null
          }
          conPlayer={
            conRaw
              ? {
                  user_id: conRaw.user_id,
                  nickname: profileMap[conRaw.user_id] ?? null,
                  disconnected_at: conRaw.disconnected_at ?? null,
                  forfeit_deadline_at: conRaw.forfeit_deadline_at ?? null,
                }
              : null
          }
          messages={messages}
          currentUserId={user?.id ?? null}
        />
      </div>
    </main>
  );
}
