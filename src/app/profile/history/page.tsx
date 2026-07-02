import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserSafe } from "@/lib/auth/get-current-user";
import type { HistoryMatchRow } from "@/types";
import { getUserMatchResult } from "@/lib/match-display";
import HistoryPageClient, { type HistoryProfileStats } from "./HistoryPageClient";

export default async function HistoryPage() {
  const supabase = await createClient();
  const user = await getCurrentUserSafe(supabase);

  if (!user) {
    redirect("/auth/login?redirectTo=/profile/history");
  }

  const { data: rawProfile } = await supabase
    .from("profiles")
    .select("wins, losses, debate_mmr, banter_mmr")
    .eq("id", user.id)
    .single();

  const profileStats = {
    wins: rawProfile?.wins ?? 0,
    losses: rawProfile?.losses ?? 0,
    debateMmr: rawProfile?.debate_mmr ?? 1000,
    banterMmr: rawProfile?.banter_mmr ?? 1000,
  };

  const { data: myPlayerRows, error: playerError } = await supabase
    .from("match_players")
    .select("match_id, side")
    .eq("user_id", user.id);

  if (playerError) {
    return (
      <main className="min-h-screen bg-slate-950">
        <div className="mx-auto max-w-4xl px-4 py-12">
          <PageHeader />
          <div className="mt-8 rounded-xl border border-red-900/50 bg-red-950/20 py-14 text-center">
            <p className="text-red-400">讀取歷史戰績失敗，請稍後再試。</p>
          </div>
        </div>
      </main>
    );
  }

  if (!myPlayerRows || myPlayerRows.length === 0) {
    return (
      <main className="min-h-screen bg-slate-950">
        <div className="mx-auto max-w-4xl px-4 py-12">
          <PageHeader />
          <div className="mt-8 rounded-xl border border-dashed border-slate-700 py-16 text-center">
            <p className="mb-2 text-slate-400">還沒有任何對戰紀錄</p>
            <div className="mt-4 flex justify-center gap-3">
              <Link
                href="/rooms/debate"
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500"
              >
                建立辯論房
              </Link>
              <Link
                href="/rooms/banter"
                className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-amber-500"
              >
                建立嘴砲房
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  const sideByMatch: Record<string, string> = {};
  for (const r of myPlayerRows) sideByMatch[r.match_id] = r.side;
  const myMatchIds = myPlayerRows.map((r) => r.match_id);

  const { data: matches, error: matchesError } = await supabase
    .from("matches")
    .select(
      "id, title, mode, status, topic, started_at, ended_at, ended_reason, winner_side, is_rated, created_at"
    )
    .in("id", myMatchIds)
    .order("created_at", { ascending: false })
    .limit(50);

  if (matchesError) {
    return (
      <main className="min-h-screen bg-slate-950">
        <div className="mx-auto max-w-4xl px-4 py-12">
          <PageHeader />
          <div className="mt-8 rounded-xl border border-red-900/50 bg-red-950/20 py-14 text-center">
            <p className="text-red-400">讀取歷史戰績失敗，請稍後再試。</p>
          </div>
        </div>
      </main>
    );
  }

  const matchIds = (matches ?? []).map((m) => m.id);

  const { data: allPlayers } =
    matchIds.length > 0
      ? await supabase
          .from("match_players")
          .select("match_id, user_id, side")
          .in("match_id", matchIds)
      : { data: [] };

  const opponentIdByMatch: Record<string, string | null> = {};
  for (const p of allPlayers ?? []) {
    if (p.match_id in sideByMatch && p.side !== sideByMatch[p.match_id]) {
      opponentIdByMatch[p.match_id] = p.user_id;
    }
  }

  const opponentIds = [
    ...new Set(
      Object.values(opponentIdByMatch).filter((v): v is string => Boolean(v))
    ),
  ];

  const opponentProfileMap: Record<
    string,
    { nickname: string | null; avatar_url: string | null }
  > = {};
  if (opponentIds.length > 0) {
    const { data: opponentProfiles } = await supabase
      .from("profiles")
      .select("id, nickname, avatar_url")
      .in("id", opponentIds);
    for (const p of opponentProfiles ?? []) {
      opponentProfileMap[p.id] = {
        nickname: (p.nickname as string | null) ?? null,
        avatar_url: (p.avatar_url as string | null) ?? null,
      };
    }
  }

  const { data: bookmarks } =
    matchIds.length > 0
      ? await supabase
          .from("match_bookmarks")
          .select("match_id")
          .eq("user_id", user.id)
          .in("match_id", matchIds)
      : { data: [] };
  const bookmarkedSet = new Set((bookmarks ?? []).map((b) => b.match_id as string));

  const { data: notes } =
    matchIds.length > 0
      ? await supabase
          .from("match_notes")
          .select("match_id, note")
          .eq("user_id", user.id)
          .in("match_id", matchIds)
      : { data: [] };
  const notesByMatch: Record<string, string> = {};
  for (const n of notes ?? []) notesByMatch[n.match_id as string] = n.note as string;

  const historyMatches: HistoryMatchRow[] = (matches ?? []).map((m) => {
    const userSide = sideByMatch[m.id] ?? "pro";
    const opponentId = opponentIdByMatch[m.id] ?? null;
    const oppProfile = opponentId ? opponentProfileMap[opponentId] : null;
    const opponentName =
      oppProfile?.nickname ?? (opponentId ? opponentId.slice(0, 8) : "無對手");

    return {
      id: m.id,
      title: m.title as string,
      mode: m.mode as string,
      status: m.status as string,
      topic: (m.topic as string | null) ?? null,
      created_at: m.created_at as string,
      started_at: (m.started_at as string | null) ?? null,
      ended_at: (m.ended_at as string | null) ?? null,
      ended_reason: (m.ended_reason as string | null) ?? null,
      winner_side: (m.winner_side as string | null) ?? null,
      is_rated: (m.is_rated as boolean) ?? true,
      userSide,
      opponentId,
      opponentName,
      opponentAvatarUrl: oppProfile?.avatar_url ?? null,
      resultKey: getUserMatchResult(
        m.status as string,
        (m.winner_side as string | null) ?? null,
        (m.is_rated as boolean) ?? true,
        userSide
      ),
      isBookmarked: bookmarkedSet.has(m.id as string),
      noteContent: notesByMatch[m.id as string] ?? null,
    };
  });

  const statsUnrated = historyMatches.filter(
    (m) => m.resultKey === "unrated" || m.resultKey === "cancelled"
  ).length;
  const statsActive = historyMatches.filter((m) => m.resultKey === "active").length;
  const lastMatchAt = historyMatches[0]?.created_at ?? null;

  const profile: HistoryProfileStats = {
    ...profileStats,
    statsUnrated,
    statsActive,
    lastMatchAt,
  };

  return (
    <main className="min-h-screen bg-slate-950">
      <div className="mx-auto max-w-4xl px-4 py-12">
        <PageHeader />
        <div className="mt-8">
          <HistoryPageClient userId={user.id} profile={profile} matches={historyMatches} />
        </div>
      </div>
    </main>
  );
}

function PageHeader() {
  return (
    <>
      <div className="mb-2 text-xs font-semibold uppercase tracking-widest text-indigo-400">
        MATCH HISTORY
      </div>
      <h1 className="text-3xl font-bold text-white md:text-4xl">歷史戰績</h1>
      <p className="mt-2 text-slate-400">查看你的所有 BianBattle 對局紀錄。</p>
    </>
  );
}
