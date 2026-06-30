import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import CreateMatchForm from "@/components/room/CreateMatchForm";

export default async function DebateRoomPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch waiting/active debate matches
  const { data: matches } = await supabase
    .from("matches")
    .select("id, title, topic, status, created_at")
    .eq("mode", "debate")
    .in("status", ["waiting", "active"])
    .order("created_at", { ascending: false })
    .limit(20);

  // Fetch player presence for each match
  const matchIds = matches?.map((m) => m.id) ?? [];
  const playersByMatch: Record<string, { pro: boolean; con: boolean }> = {};

  if (matchIds.length > 0) {
    const { data: players } = await supabase
      .from("match_players")
      .select("match_id, side")
      .in("match_id", matchIds);

    for (const p of players ?? []) {
      if (!playersByMatch[p.match_id])
        playersByMatch[p.match_id] = { pro: false, con: false };
      if (p.side === "pro") playersByMatch[p.match_id].pro = true;
      if (p.side === "con") playersByMatch[p.match_id].con = true;
    }
  }

  return (
    <main className="min-h-screen bg-slate-950">
      <div className="mx-auto max-w-5xl px-4 py-12">
        <div className="mb-2 text-xs font-semibold uppercase tracking-widest text-indigo-400">
          DEBATE ROOM
        </div>
        <h1 className="text-3xl font-bold text-white md:text-4xl">辯論房</h1>
        <p className="mt-2 text-slate-400">
          正式回合制辯論模式。選擇正方或反方，立論、反駁、論證，考驗邏輯與表達。
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-white">
            等待中的房間
            {matches && matches.length > 0 && (
              <span className="ml-2 text-sm font-normal text-slate-500">
                ({matches.length})
              </span>
            )}
          </h2>
          <CreateMatchForm mode="debate" currentUserId={user?.id ?? null} />
        </div>

        {matches && matches.length > 0 ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {matches.map((match) => {
              const slots = playersByMatch[match.id] ?? { pro: false, con: false };
              const filled = (slots.pro ? 1 : 0) + (slots.con ? 1 : 0);
              const isActive = match.status === "active";

              return (
                <Link
                  key={match.id}
                  href={`/matches/${match.id}`}
                  className="group rounded-xl border border-slate-800 bg-slate-900 p-4 transition-colors hover:border-indigo-700/60 hover:bg-slate-800/60"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-white group-hover:text-indigo-300 line-clamp-1">
                      {match.title}
                    </p>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        isActive
                          ? "bg-green-900/50 text-green-400"
                          : "bg-yellow-900/50 text-yellow-400"
                      }`}
                    >
                      {isActive ? "對戰中" : "等待對手"}
                    </span>
                  </div>
                  {match.topic && (
                    <p className="mt-1 line-clamp-1 text-sm text-slate-400">
                      {match.topic}
                    </p>
                  )}
                  <div className="mt-3 flex items-center gap-3 text-xs text-slate-500">
                    <span>玩家 {filled}/2</span>
                    <span>·</span>
                    <span>1v1</span>
                    {filled === 2 && !isActive && (
                      <>
                        <span>·</span>
                        <span className="text-yellow-500">已滿</span>
                      </>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="mt-10 rounded-xl border border-dashed border-slate-700 py-14 text-center">
            <p className="text-slate-500">目前沒有進行中的辯論房</p>
            <p className="mt-1 text-sm text-slate-600">成為第一個建立房間的人！</p>
          </div>
        )}
      </div>
    </main>
  );
}
