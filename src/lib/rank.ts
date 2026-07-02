import type { RankTier } from "@/types";
import {
  RANK_MMR_THRESHOLDS,
  RANK_TIERS,
  UNIFIED_RANK_TIERS,
  UNIFIED_MMR_THRESHOLDS,
  UNIFIED_RANK_ICONS,
  UNIFIED_RANK_TEXT_COLORS,
  UNIFIED_RANK_BORDER_COLORS,
} from "@/lib/constants";
import type { UnifiedRankTier } from "@/lib/constants";

// ─── Legacy rank system (kept for backward compat) ────────────────────────────

export function mmrToRank(mmr: number): RankTier {
  const reversed = [...RANK_TIERS].reverse();
  for (const tier of reversed) {
    if (mmr >= RANK_MMR_THRESHOLDS[tier]) return tier;
  }
  return "bronze";
}

export function rankProgressPercent(mmr: number): number {
  const rank = mmrToRank(mmr);
  const rankIndex = RANK_TIERS.indexOf(rank);
  const nextTier = RANK_TIERS[rankIndex + 1];
  if (!nextTier) return 100;
  const current = RANK_MMR_THRESHOLDS[rank];
  const next = RANK_MMR_THRESHOLDS[nextTier];
  return Math.round(((mmr - current) / (next - current)) * 100);
}

export function mmrToNextRank(mmr: number): number {
  const rank = mmrToRank(mmr);
  const rankIndex = RANK_TIERS.indexOf(rank);
  const nextTier = RANK_TIERS[rankIndex + 1];
  if (!nextTier) return 0;
  return RANK_MMR_THRESHOLDS[nextTier] - mmr;
}

// ─── Unified rank system (debate + banter) ────────────────────────────────────

export interface DebateRankInfo {
  mode: "debate";
  tier: UnifiedRankTier;
  baseName: string;
  title: string;
  fullName: string;
  icon: string;
  description: string;
  textClass: string;
  borderClass: string;
  minMmr: number;
  maxMmr: number | null;
}

export interface BanterRankInfo {
  mode: "banter";
  tier: UnifiedRankTier;
  baseName: string;
  title: string;
  fullName: string;
  icon: string;
  trait: string;
  output: string;
  ultimate: string;
  description: string;
  textClass: string;
  borderClass: string;
  minMmr: number;
  maxMmr: number | null;
}

export const BANTER_HIDDEN_RANK = {
  tier: "master" as UnifiedRankTier,
  title: "幹話至尊",
  trait: "混亂中立",
  output: "廢話文學",
  ultimate: "四兩千斤",
  description: "直接燒乾你 CPU",
} as const;

interface DebateRankDef {
  baseName: string;
  title: string;
  description: string;
}

interface BanterRankDef {
  baseName: string;
  title: string;
  trait: string;
  output: string;
  ultimate: string;
  description: string;
}

const DEBATE_RANK_DEF: Record<UnifiedRankTier, DebateRankDef> = {
  bronze:   { baseName: "青銅", title: "青銅辯手", description: "剛踏入辯論場" },
  silver:   { baseName: "白銀", title: "白銀辯手", description: "初步掌握論述技巧" },
  gold:     { baseName: "黃金", title: "黃金辯手", description: "穩定輸出、有基本論證能力" },
  platinum: { baseName: "鉑金", title: "鉑金辯手", description: "能有效反駁對手觀點" },
  diamond:  { baseName: "鑽石", title: "鑽石辯手", description: "邏輯嚴密、攻防兼備" },
  star:     { baseName: "星耀", title: "星耀辯手", description: "精準切入核心，制高點論述" },
  master:   { baseName: "王者", title: "王者辯手", description: "辯壇頂尖，出口成章，百辯不敗" },
};

const BANTER_RANK_DEF: Record<UnifiedRankTier, BanterRankDef> = {
  bronze:   { baseName: "青銅", title: "爆氣噴子",  trait: "情緒失控", output: "滿嘴髒話", ultimate: "無能狂怒",   description: "血條瞬間融化" },
  silver:   { baseName: "白銀", title: "碎念巨嬰",  trait: "瘋狂抱怨", output: "毫無重點", ultimate: "不吐不快",   description: "旁人聽久會膩" },
  gold:     { baseName: "黃金", title: "陰陽大師",  trait: "帶刺酸人", output: "指桑罵槐", ultimate: "冷嘲熱諷",   description: "格局太小被無視" },
  platinum: { baseName: "鉑金", title: "邏輯判官",  trait: "據理力爭", output: "狂搬法條", ultimate: "死磕到底",   description: "認真就輸了" },
  diamond:  { baseName: "鑽石", title: "靈魂補刀",  trait: "直擊痛點", output: "精準致命", ultimate: "一針見血",   description: "一句話讓人破防" },
  star:     { baseName: "星耀", title: "笑裡藏刀",  trait: "心思極深", output: "高級反諷", ultimate: "綿裡藏針",   description: "把你賣了還幫你數錢" },
  master:   { baseName: "王者", title: "天花戰神",  trait: "春風化雨", output: "幽默化解", ultimate: "降維打擊",   description: "不帶髒字吊著打" },
};

function getUnifiedTier(mmr: number): UnifiedRankTier {
  const tiers = [...UNIFIED_RANK_TIERS].reverse();
  for (const t of tiers) {
    if (mmr >= UNIFIED_MMR_THRESHOLDS[t]) return t;
  }
  return "bronze";
}

export function getDebateRankFromMmr(mmr: number): DebateRankInfo {
  const tier = getUnifiedTier(mmr);
  const def = DEBATE_RANK_DEF[tier];
  const icon = UNIFIED_RANK_ICONS[tier];
  const idx = UNIFIED_RANK_TIERS.indexOf(tier);
  const nextTier = (UNIFIED_RANK_TIERS[idx + 1] as UnifiedRankTier | undefined) ?? null;
  return {
    mode: "debate",
    tier,
    baseName: def.baseName,
    title: def.title,
    fullName: `${icon} ${def.title}`,
    icon,
    description: def.description,
    textClass: UNIFIED_RANK_TEXT_COLORS[tier],
    borderClass: UNIFIED_RANK_BORDER_COLORS[tier],
    minMmr: UNIFIED_MMR_THRESHOLDS[tier],
    maxMmr: nextTier !== null ? UNIFIED_MMR_THRESHOLDS[nextTier] - 1 : null,
  };
}

export function getBanterRankFromMmr(mmr: number): BanterRankInfo {
  const tier = getUnifiedTier(mmr);
  const def = BANTER_RANK_DEF[tier];
  const icon = UNIFIED_RANK_ICONS[tier];
  const idx = UNIFIED_RANK_TIERS.indexOf(tier);
  const nextTier = (UNIFIED_RANK_TIERS[idx + 1] as UnifiedRankTier | undefined) ?? null;
  return {
    mode: "banter",
    tier,
    baseName: def.baseName,
    title: def.title,
    fullName: `${icon} ${def.baseName}・${def.title}`,
    icon,
    trait: def.trait,
    output: def.output,
    ultimate: def.ultimate,
    description: def.description,
    textClass: UNIFIED_RANK_TEXT_COLORS[tier],
    borderClass: UNIFIED_RANK_BORDER_COLORS[tier],
    minMmr: UNIFIED_MMR_THRESHOLDS[tier],
    maxMmr: nextTier !== null ? UNIFIED_MMR_THRESHOLDS[nextTier] - 1 : null,
  };
}

export function getRankFromMmr(
  mmr: number,
  mode: "debate" | "banter"
): DebateRankInfo | BanterRankInfo {
  return mode === "debate" ? getDebateRankFromMmr(mmr) : getBanterRankFromMmr(mmr);
}

export function unifiedRankProgressPercent(mmr: number): number {
  const tier = getUnifiedTier(mmr);
  const idx = UNIFIED_RANK_TIERS.indexOf(tier);
  const nextTier = (UNIFIED_RANK_TIERS[idx + 1] as UnifiedRankTier | undefined) ?? null;
  if (nextTier === null) return 100;
  const current = UNIFIED_MMR_THRESHOLDS[tier];
  const next = UNIFIED_MMR_THRESHOLDS[nextTier];
  return Math.round(((mmr - current) / (next - current)) * 100);
}

export function unifiedMmrToNextRank(mmr: number): number {
  const tier = getUnifiedTier(mmr);
  const idx = UNIFIED_RANK_TIERS.indexOf(tier);
  const nextTier = (UNIFIED_RANK_TIERS[idx + 1] as UnifiedRankTier | undefined) ?? null;
  if (nextTier === null) return 0;
  return UNIFIED_MMR_THRESHOLDS[nextTier] - mmr;
}

export const ALL_DEBATE_RANKS: DebateRankInfo[] = UNIFIED_RANK_TIERS.map((tier) =>
  getDebateRankFromMmr(UNIFIED_MMR_THRESHOLDS[tier])
);

export const ALL_BANTER_RANKS: BanterRankInfo[] = UNIFIED_RANK_TIERS.map((tier) =>
  getBanterRankFromMmr(UNIFIED_MMR_THRESHOLDS[tier])
);
