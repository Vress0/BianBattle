import type { MatchMode } from "@/types";

interface MatchModeCardProps {
  mode: MatchMode;
  playerCount: number;
  description: string;
  isSelected?: boolean;
  accentColor?: "indigo" | "amber";
}

export default function MatchModeCard({
  mode,
  playerCount,
  description,
  isSelected = false,
  accentColor = "indigo",
}: MatchModeCardProps) {
  const selectedClass =
    accentColor === "indigo"
      ? "border-indigo-600 bg-indigo-950/40"
      : "border-amber-500 bg-amber-950/40";
  const iconBg =
    accentColor === "indigo" ? "bg-indigo-900/50" : "bg-amber-900/50";
  const iconText =
    accentColor === "indigo" ? "text-indigo-300" : "text-amber-300";

  return (
    <div
      className={`rounded-2xl border p-5 transition-colors ${
        isSelected ? selectedClass : "border-slate-800 bg-slate-900 hover:border-slate-700"
      }`}
    >
      <div className="flex items-center gap-3">
        <div className={`rounded-xl p-3 ${iconBg}`}>
          <span className={`text-2xl font-bold ${iconText}`}>{mode}</span>
        </div>
        <div>
          <p className="font-bold text-white">{playerCount * 2} 位玩家</p>
          <p className="text-sm text-slate-400">{playerCount} vs {playerCount}</p>
        </div>
      </div>
      <p className="mt-3 text-sm text-slate-400">{description}</p>
    </div>
  );
}
