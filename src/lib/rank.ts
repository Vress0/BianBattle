import type { RankTier } from "@/types";
import { RANK_MMR_THRESHOLDS, RANK_TIERS } from "@/lib/constants";

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
