import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import CreateMatchForm from "@/components/room/CreateMatchForm";

export default async function BanterRoomPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch waiting/active banter matches
  const { data: matches } = await supabase
    .from("matches")
    .select("id, title, topic, status, created_at")
    .eq("mode", "banter")
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
            等待中的嘴砲房
            {matches && matches.length > 0 && (
              <span className="ml-2 text-sm font-normal text-slate-500">
                ({matches.length})
              </span>
            )}
          </h2>
          <CreateMatchForm mode="banter" currentUserId={user?.id ?? null} />
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
                  className="group rounded-xl border border-slate-800 bg-slate-900 p-4 transition-colors hover:border-amber-700/60 hover:bg-slate-800/60"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-white group-hover:text-amber-300 line-clamp-1">
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
            <p className="text-slate-500">目前沒有進行中的嘴砲房</p>
            <p className="mt-1 text-sm text-slate-600">成為第一個建立嘴砲房的人！</p>
          </div>
        )}
      </div>
    </main>
  );
}
