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

// ─── Unified rank system (debate + banter, thresholds: 0/800/1000/1200/1400/1600/1800) ───

export const UNIFIED_RANK_TIERS = [
  "bronze",
  "silver",
  "gold",
  "platinum",
  "diamond",
  "star",
  "master",
] as const;

export type UnifiedRankTier = (typeof UNIFIED_RANK_TIERS)[number];

export const UNIFIED_MMR_THRESHOLDS: Record<UnifiedRankTier, number> = {
  bronze: 0,
  silver: 800,
  gold: 1000,
  platinum: 1200,
  diamond: 1400,
  star: 1600,
  master: 1800,
};

export const UNIFIED_RANK_ICONS: Record<UnifiedRankTier, string> = {
  bronze: "🥉",
  silver: "🥈",
  gold: "🥇",
  platinum: "💎",
  diamond: "🔮",
  star: "🌟",
  master: "👑",
};

export const UNIFIED_RANK_TEXT_COLORS: Record<UnifiedRankTier, string> = {
  bronze: "text-orange-400",
  silver: "text-slate-300",
  gold: "text-yellow-400",
  platinum: "text-cyan-300",
  diamond: "text-purple-400",
  star: "text-blue-300",
  master: "text-red-400",
};

export const UNIFIED_RANK_BORDER_COLORS: Record<UnifiedRankTier, string> = {
  bronze: "border-orange-700/60",
  silver: "border-slate-500/60",
  gold: "border-yellow-700/60",
  platinum: "border-cyan-700/60",
  diamond: "border-purple-700/60",
  star: "border-blue-700/60",
  master: "border-red-700/60",
};

export const MATCH_MODES = ["1v1", "3v3", "5v5"] as const;

export const PRESET_TOPICS: string[] = [
  "人工智慧是否應該擁有投票權？",
  "死刑是否應該被廢除？",
  "社群媒體對青少年的影響利大於弊？",
  "核能是否是解決能源危機的最佳方案？",
  "遠距工作是否應該成為企業常態？",
  "動物實驗是否應該全面禁止？",
  "全民基本收入是否能有效解決貧富差距？",
  "網路言論是否應該採取實名制？",
  "基因編輯技術是否應該用於人類胚胎？",
  "學校是否應該全面禁止學生使用手機？",
];
