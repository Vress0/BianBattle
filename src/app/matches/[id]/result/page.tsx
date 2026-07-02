import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserSafe } from "@/lib/auth/get-current-user";
import {
  modeLabel,
  modeHref,
  winnerSideLabel,
  endedReasonLabel,
  formatDuration,
  formatDateTime,
} from "@/lib/match-display";
import ResultPagePlayersSection, {
  type PlayerInfo,
} from "@/components/match/ResultPagePlayersSection";
import MatchResultPersonalPanel from "@/components/match/MatchResultPersonalPanel";

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

  const viewer = await getCurrentUserSafe(supabase);

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

  const isEnded =
    (match.status as string) === "finished" || (match.status as string) === "cancelled";

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

  const playerUserIds = (rawPlayers ?? []).map((p) => p.user_id as string);
  const msgUserIds = (rawMessages ?? []).map((m) => m.user_id as string);
  const userIds = [...new Set([...playerUserIds, ...msgUserIds])];

  interface ProfileRow {
    id: string;
    nickname: string | null;
    avatar_url: string | null;
    bio: string | null;
    wins: number;
    losses: number;
    debate_mmr: number;
    banter_mmr: number;
  }

  const profileMap: Record<string, ProfileRow> = {};
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, nickname, avatar_url, bio, wins, losses, debate_mmr, banter_mmr")
      .in("id", userIds);
    for (const p of profiles ?? []) {
      profileMap[p.id as string] = {
        id: p.id as string,
        nickname: (p.nickname as string | null) ?? null,
        avatar_url: (p.avatar_url as string | null) ?? null,
        bio: (p.bio as string | null) ?? null,
        wins: (p.wins as number) ?? 0,
        losses: (p.losses as number) ?? 0,
        debate_mmr: (p.debate_mmr as number) ?? 1000,
        banter_mmr: (p.banter_mmr as number) ?? 1000,
      };
    }
  }

  function displayName(userId: string): string {
    return profileMap[userId]?.nickname ?? userId.slice(0, 8);
  }

  const proRaw = (rawPlayers ?? []).find((p) => p.side === "pro") ?? null;
  const conRaw = (rawPlayers ?? []).find((p) => p.side === "con") ?? null;

  function buildPlayerInfo(raw: { user_id: string; side: string } | null): PlayerInfo | null {
    if (!raw) return null;
    const uid = raw.user_id as string;
    const prof = profileMap[uid];
    return {
      id: uid,
      nickname: prof?.nickname ?? null,
      avatarUrl: prof?.avatar_url ?? null,
      bio: prof?.bio ?? null,
      wins: prof?.wins ?? 0,
      losses: prof?.losses ?? 0,
      debateMmr: prof?.debate_mmr ?? 1000,
      banterMmr: prof?.banter_mmr ?? 1000,
      side: raw.side as string,
    };
  }

  const proPlayerInfo = buildPlayerInfo(proRaw);
  const conPlayerInfo = buildPlayerInfo(conRaw);

  const winnerText = match.winner_side
    ? winnerSideLabel(match.winner_side as string)
    : "本場不計戰績";
  const reasonText = endedReasonLabel((match.ended_reason as string | null) ?? null);
  const duration = formatDuration(
    (match.started_at as string | null) ?? null,
    (match.ended_at as string | null) ?? null
  );

  // Viewer personal panel data
  let viewerPanel: {
    viewerSide: string;
    opponentName: string;
    isBookmarked: boolean;
    noteContent: string | null;
  } | null = null;

  if (viewer) {
    const viewerPlayer = (rawPlayers ?? []).find((p) => p.user_id === viewer.id);
    if (viewerPlayer) {
      const opponent = (rawPlayers ?? []).find((p) => p.user_id !== viewer.id);
      const opponentName = opponent ? displayName(opponent.user_id as string) : "無對手";

      const { data: bk } = await supabase
        .from("match_bookmarks")
        .select("match_id")
        .eq("match_id", id)
        .eq("user_id", viewer.id)
        .maybeSingle();

      const { data: note } = await supabase
        .from("match_notes")
        .select("note")
        .eq("match_id", id)
        .eq("user_id", viewer.id)
        .maybeSingle();

      viewerPanel = {
        viewerSide: viewerPlayer.side as string,
        opponentName,
        isBookmarked: !!bk,
        noteContent: (note?.note as string | null) ?? null,
      };
    }
  }

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
              (match.winner_side as string) === "pro"
                ? "text-indigo-400"
                : (match.winner_side as string) === "con"
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

        {/* Viewer personal panel */}
        {viewerPanel && viewer && (
          <MatchResultPersonalPanel
            matchId={id}
            userId={viewer.id}
            viewerSide={viewerPanel.viewerSide}
            opponentName={viewerPanel.opponentName}
            winnerSide={(match.winner_side as string | null) ?? null}
            isRated={match.is_rated as boolean}
            isBookmarked={viewerPanel.isBookmarked}
            noteContent={viewerPanel.noteContent}
            matchStatus={match.status as string}
          />
        )}

        {/* Players section */}
        <section className="mt-5">
          <h2 className="mb-3 text-sm font-semibold text-white">雙方玩家</h2>
          <ResultPagePlayersSection
            proPlayer={proPlayerInfo}
            conPlayer={conPlayerInfo}
          />
        </section>

        {/* Match info */}
        <section className="mt-5 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="mb-3 text-sm font-semibold text-white">比賽資訊</h2>
          <dl className="grid grid-cols-2 gap-y-3 text-sm sm:grid-cols-3">
            <Info label="模式" value={modeLabel(match.mode as string)} />
            <Info
              label="開始時間"
              value={formatDateTime((match.started_at as string | null) ?? null)}
            />
            <Info
              label="結束時間"
              value={formatDateTime((match.ended_at as string | null) ?? null)}
            />
            <Info label="耗時" value={duration ?? "—"} />
            <Info
              label="正方"
              value={proRaw ? displayName(proRaw.user_id as string) : "（空缺）"}
            />
            <Info
              label="反方"
              value={conRaw ? displayName(conRaw.user_id as string) : "（空缺）"}
            />
          </dl>
          <div className="mt-4 border-t border-slate-800 pt-3">
            {match.topic ? (
              <>
                <p className="text-sm text-slate-300">辯題：{match.topic as string}</p>
                {((match.pro_position as string | null) ||
                  (match.con_position as string | null)) && (
                  <p className="mt-1 text-xs text-slate-500">
                    {(match.pro_position as string | null) && (
                      <>正方立場：{match.pro_position as string}</>
                    )}
                    {(match.pro_position as string | null) &&
                      (match.con_position as string | null) &&
                      "　"}
                    {(match.con_position as string | null) && (
                      <>反方立場：{match.con_position as string}</>
                    )}
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
          <h2 className="mb-3 text-sm font-semibold text-white">訊息紀錄</h2>
          {messagesError ? (
            <div className="rounded-2xl border border-red-900/50 bg-red-950/20 py-10 text-center">
              <p className="text-sm text-red-400">載入訊息紀錄時發生錯誤，請稍後再試。</p>
            </div>
          ) : rawMessages && rawMessages.length > 0 ? (
            <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900 p-4">
              {rawMessages.map((msg) => (
                <div
                  key={msg.id as string}
                  className="rounded-xl border border-slate-800 bg-slate-950/60 p-3"
                >
                  <p className="text-xs text-slate-500">
                    {displayName(msg.user_id as string)} ·{" "}
                    {(msg.side as string) === "pro" ? "正方" : "反方"} ·{" "}
                    {formatDateTime(msg.created_at as string)}
                  </p>
                  <p className="mt-1 break-words text-sm text-white">{msg.content as string}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-700 py-10 text-center">
              <p className="text-sm text-slate-500">本場沒有訊息紀錄。</p>
            </div>
          )}
        </section>

        {/* AI 分析預留區塊 */}
        <section className="mt-5 rounded-2xl border border-slate-800/60 bg-slate-900/50 p-6">
          <h2 className="mb-2 text-sm font-semibold text-slate-400">AI 對局分析</h2>
          <p className="text-sm text-slate-500">
            AI 分析功能即將推出，之後你可以在這裡查看邏輯、反駁、表達與改進建議。
          </p>
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
            href={modeHref(match.mode as string)}
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
