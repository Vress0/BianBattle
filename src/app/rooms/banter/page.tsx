import { createClient } from "@/lib/supabase/server";
import CreateMatchForm from "@/components/room/CreateMatchForm";
import RoomListClient, { type RoomEntry } from "@/components/room/RoomListClient";

export default async function BanterRoomPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: matches, error: matchesError } = await supabase
    .from("matches")
    .select("id, title, topic, status, winner_side, is_rated, created_at")
    .eq("mode", "banter")
    .order("created_at", { ascending: false })
    .limit(50);

  const matchIds = matches?.map((m) => m.id) ?? [];
  const playersByMatch: Record<string, { pro: string | null; con: string | null }> = {};

  if (matchIds.length > 0) {
    const { data: players } = await supabase
      .from("match_players")
      .select("match_id, side, user_id")
      .in("match_id", matchIds);

    const userIds = [...new Set((players ?? []).map((p) => p.user_id))];
    const nicknameMap: Record<string, string | null> = {};
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, nickname")
        .in("id", userIds);
      for (const p of profiles ?? []) nicknameMap[p.id] = p.nickname ?? null;
    }

    for (const p of players ?? []) {
      if (!playersByMatch[p.match_id]) playersByMatch[p.match_id] = { pro: null, con: null };
      const name = nicknameMap[p.user_id] ?? p.user_id.slice(0, 8);
      if (p.side === "pro") playersByMatch[p.match_id].pro = name;
      if (p.side === "con") playersByMatch[p.match_id].con = name;
    }
  }

  const rooms: RoomEntry[] = (matches ?? []).map((m) => {
    const slots = playersByMatch[m.id] ?? { pro: null, con: null };
    return {
      id: m.id,
      title: m.title,
      topic: m.topic,
      status: m.status,
      winner_side: m.winner_side,
      is_rated: m.is_rated,
      created_at: m.created_at,
      proNickname: slots.pro,
      conNickname: slots.con,
      filled: (slots.pro ? 1 : 0) + (slots.con ? 1 : 0),
    };
  });

  return (
    <main className="min-h-screen bg-slate-950">
      <div className="mx-auto max-w-5xl px-4 py-12">
        <div className="mb-2 text-xs font-semibold uppercase tracking-widest text-amber-400">
          BANTER ROOM
        </div>
        <h1 className="text-3xl font-bold text-white md:text-4xl">嘴砲房</h1>
        <p className="mt-2 text-slate-400">
          輕鬆快速對戰模式。用幽默、反應力與觀點打出你的風格，見招拆招。
        </p>

        <div className="mt-4 rounded-2xl border border-amber-800/50 bg-amber-950/20 p-4">
          <p className="text-sm font-semibold text-amber-400">⚠️ 嘴砲安全規則</p>
          <p className="mt-1 text-sm text-slate-400">
            嘴砲可以幽默、可以犀利，但
            <span className="font-medium text-white">
              不能人身攻擊、歧視、霸凌或惡意羞辱
            </span>
            。違規者將被封禁。
          </p>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-white">
            房間列表
            {rooms.length > 0 && (
              <span className="ml-2 text-sm font-normal text-slate-500">({rooms.length})</span>
            )}
          </h2>
          <CreateMatchForm mode="banter" currentUserId={user?.id ?? null} />
        </div>

        {matchesError ? (
          <div className="mt-10 rounded-xl border border-red-900/50 bg-red-950/20 py-14 text-center">
            <p className="text-red-400">載入房間列表時發生錯誤，請稍後再試。</p>
          </div>
        ) : (
          <RoomListClient mode="banter" rooms={rooms} />
        )}
      </div>
    </main>
  );
}
