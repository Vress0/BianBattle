import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  modeLabel,
  modeHref,
  winnerSideLabel,
  endedReasonLabel,
  formatDuration,
  formatDateTime,
} from "@/lib/match-display";

interface PageProps {
  params: Promise<{ id: string }>;
}

function ResultShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-slate-950">
      <div className="mx-auto max-w-3xl px-4 py-12">{children}</div>
    </main>
  );
}

function MessageState({ title, message }: { title: string; message: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center">
      <p className="text-lg font-semibold text-white">{title}</p>
      <p className="mt-2 text-sm text-slate-400">{message}</p>
      <Link
        href="/"
        className="mt-6 inline-block rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500"
      >
        回到首頁
      </Link>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="mt-0.5 text-slate-200">{value}</dd>
    </div>
  );
}

export default async function MatchResultPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: match, error: matchError } = await supabase
    .from("matches")
    .select(
      "id, title, mode, status, topic, pro_position, con_position, started_at, ended_at, ended_reason, winner_side, surrendered_by, is_rated, created_at"
    )
    .eq("id", id)
    .maybeSingle();

  if (matchError) {
    return (
      <ResultShell>
        <MessageState title="無法載入比賽結果" message="查詢時發生錯誤，請稍後再試。" />
      </ResultShell>
    );
  }

  if (!match) {
    return (
      <ResultShell>
        <MessageState title="找不到這場比賽" message="這場比賽不存在，或已被移除。" />
      </ResultShell>
    );
  }

  const isEnded = match.status === "finished" || match.status === "cancelled";

  if (!isEnded) {
    return (
      <ResultShell>
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center">
          <p className="text-lg font-semibold text-white">比賽尚未結束</p>
          <p className="mt-2 text-sm text-slate-400">
            這場比賽還在進行中，結束後才能查看完整結果。
          </p>
          <Link
            href={`/matches/${match.id}`}
            className="mt-6 inline-block rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500"
          >
            回到比賽房間
          </Link>
        </div>
      </ResultShell>
    );
  }

  const { data: rawPlayers } = await supabase
    .from("match_players")
    .select("user_id, side")
    .eq("match_id", id);

  const { data: rawMessages, error: messagesError } = await supabase
    .from("match_messages")
    .select("id, user_id, side, content, created_at")
    .eq("match_id", id)
    .order("created_at", { ascending: true });

  const userIds = [
    ...new Set([
      ...(rawPlayers ?? []).map((p) => p.user_id),
      ...(rawMessages ?? []).map((m) => m.user_id),
    ]),
  ];

  const nicknameMap: Record<string, string | null> = {};
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, nickname")
      .in("id", userIds);
    for (const p of profiles ?? []) nicknameMap[p.id] = p.nickname ?? null;
  }

  function displayName(userId: string): string {
    return nicknameMap[userId] ?? userId.slice(0, 8);
  }

  const proPlayer = rawPlayers?.find((p) => p.side === "pro") ?? null;
  const conPlayer = rawPlayers?.find((p) => p.side === "con") ?? null;

  const winnerText = match.winner_side ? winnerSideLabel(match.winner_side) : "本場不計戰績";
  const reasonText = endedReasonLabel(match.ended_reason);
  const duration = formatDuration(match.started_at, match.ended_at);

  return (
    <main className="min-h-screen bg-slate-950">
      <div className="mx-auto max-w-3xl px-4 py-12">
        <div className="mb-2 text-xs font-semibold uppercase tracking-widest text-indigo-400">
          MATCH RESULT
        </div>
        <h1 className="text-3xl font-bold text-white">比賽結果</h1>

        {/* Result summary */}
        <section className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <p
            className={`text-2xl font-bold ${
              match.winner_side === "pro"
                ? "text-indigo-400"
                : match.winner_side === "con"
                  ? "text-slate-300"
                  : "text-slate-500"
            }`}
          >
            {winnerText}
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full border border-slate-700 px-2.5 py-1 text-slate-400">
              結束原因：{reasonText}
            </span>
            <span
              className={`rounded-full px-2.5 py-1 ${
                match.is_rated
                  ? "border border-indigo-700/60 text-indigo-300"
                  : "border border-slate-700 text-slate-500"
              }`}
            >
              {match.is_rated ? "計入戰績" : "不計入戰績"}
            </span>
          </div>
        </section>

        {/* Match info */}
        <section className="mt-5 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="mb-3 text-sm font-semibold text-white">比賽資訊</h2>
          <dl className="grid grid-cols-2 gap-y-3 text-sm sm:grid-cols-3">
            <Info label="模式" value={modeLabel(match.mode)} />
            <Info label="開始時間" value={formatDateTime(match.started_at)} />
            <Info label="結束時間" value={formatDateTime(match.ended_at)} />
            <Info label="耗時" value={duration ?? "—"} />
            <Info label="正方" value={proPlayer ? displayName(proPlayer.user_id) : "（空缺）"} />
            <Info label="反方" value={conPlayer ? displayName(conPlayer.user_id) : "（空缺）"} />
          </dl>
          <div className="mt-4 border-t border-slate-800 pt-3">
            {match.topic ? (
              <>
                <p className="text-sm text-slate-300">辯題：{match.topic}</p>
                {(match.pro_position || match.con_position) && (
                  <p className="mt-1 text-xs text-slate-500">
                    {match.pro_position && <>正方立場：{match.pro_position}</>}
                    {match.pro_position && match.con_position && "　"}
                    {match.con_position && <>反方立場：{match.con_position}</>}
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm text-slate-500">自由辯論</p>
            )}
          </div>
        </section>

        {/* Message timeline */}
        <section className="mt-5">
          <h2 className="mb-3 text-sm font-semibold text-white">對戰紀錄</h2>
          {messagesError ? (
            <div className="rounded-2xl border border-red-900/50 bg-red-950/20 py-10 text-center">
              <p className="text-sm text-red-400">載入對戰紀錄時發生錯誤，請稍後再試。</p>
            </div>
          ) : rawMessages && rawMessages.length > 0 ? (
            <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900 p-4">
              {rawMessages.map((msg) => (
                <div
                  key={msg.id}
                  className="rounded-xl border border-slate-800 bg-slate-950/60 p-3"
                >
                  <p className="text-xs text-slate-500">
                    {displayName(msg.user_id)} · {msg.side === "pro" ? "正方" : "反方"} ·{" "}
                    {formatDateTime(msg.created_at)}
                  </p>
                  <p className="mt-1 break-words text-sm text-white">{msg.content}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-700 py-10 text-center">
              <p className="text-sm text-slate-500">這場比賽沒有任何發言紀錄。</p>
            </div>
          )}
        </section>

        {/* Nav buttons */}
        <section className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/rooms/debate"
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 transition-colors hover:bg-slate-800"
          >
            返回辯論房列表
          </Link>
          <Link
            href="/rooms/banter"
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 transition-colors hover:bg-slate-800"
          >
            返回嘴砲房列表
          </Link>
          <Link
            href={modeHref(match.mode)}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500"
          >
            再戰一場
          </Link>
          <Link
            href="/"
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 transition-colors hover:bg-slate-800"
          >
            回到首頁
          </Link>
        </section>
      </div>
    </main>
  );
}
