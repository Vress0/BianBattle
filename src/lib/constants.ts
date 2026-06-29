import type { RankTier } from "@/types";

export const RANK_TIERS: RankTier[] = [
  "bronze",
  "silver",
  "gold",
  "platinum",
  "diamond",
  "master",
  "grandmaster",
];

export const RANK_LABELS: Record<RankTier, string> = {
  bronze: "青銅",
  silver: "白銀",
  gold: "黃金",
  platinum: "鉑金",
  diamond: "鑽石",
  master: "大師",
  grandmaster: "王者",
};

export const RANK_ICONS: Record<RankTier, string> = {
  bronze: "🥉",
  silver: "🥈",
  gold: "🥇",
  platinum: "💎",
  diamond: "🔷",
  master: "👑",
  grandmaster: "🏆",
};

export const RANK_TEXT_COLORS: Record<RankTier, string> = {
  bronze: "text-orange-400",
  silver: "text-slate-300",
  gold: "text-yellow-400",
  platinum: "text-cyan-300",
  diamond: "text-blue-400",
  master: "text-purple-400",
  grandmaster: "text-red-400",
};

export const RANK_BORDER_COLORS: Record<RankTier, string> = {
  bronze: "border-orange-700/60",
  silver: "border-slate-500/60",
  gold: "border-yellow-700/60",
  platinum: "border-cyan-700/60",
  diamond: "border-blue-700/60",
  master: "border-purple-700/60",
  grandmaster: "border-red-700/60",
};

export const RANK_MMR_THRESHOLDS: Record<RankTier, number> = {
  bronze: 0,
  silver: 500,
  gold: 1000,
  platinum: 1500,
  diamond: 2000,
  master: 2500,
  grandmaster: 3000,
};

export const MATCH_MODES = ["1v1", "3v3", "5v5"] as const;
