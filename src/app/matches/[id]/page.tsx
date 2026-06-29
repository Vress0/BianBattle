import { MOCK_MATCH } from "@/lib/mockData";
import MatchHeader from "@/components/match/MatchHeader";
import TeamPanel from "@/components/match/TeamPanel";
import ChatPanel from "@/components/match/ChatPanel";
import JudgePanel from "@/components/match/JudgePanel";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function MatchPage({ params }: PageProps) {
  const { id } = await params;
  const match = { ...MOCK_MATCH, id };

  return (
    <main className="min-h-screen bg-slate-950">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <MatchHeader match={match} />

        <div className="mt-6 grid gap-4 lg:grid-cols-4">
          <TeamPanel side="pro" players={match.proTeam} score={match.scores.pro} />

          <div className="flex flex-col gap-4 lg:col-span-2">
            <ChatPanel
              messages={match.messages}
              currentRound={match.currentRound}
            />
          </div>

          <TeamPanel side="con" players={match.conTeam} score={match.scores.con} />
        </div>

        <div className="mt-6">
          <JudgePanel
            comment={match.aiJudgeComment}
            round={match.currentRound}
          />
        </div>
      </div>
    </main>
  );
}
