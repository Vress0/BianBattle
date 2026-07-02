export type BattleMode = "debate" | "banter";
export type BattleSide = "pro" | "con";
export type BattleInviteStatus = "pending" | "accepted" | "rejected" | "cancelled" | "expired";

export interface BattleInvite {
  id: string;
  inviter_id: string;
  receiver_id: string;
  mode: BattleMode;
  topic: string;
  inviter_side: BattleSide;
  receiver_side: BattleSide;
  status: BattleInviteStatus;
  match_id: string | null;
  expires_at: string;
  created_at: string;
}

export const PRESET_TOPICS = [
  "AI 會取代人類的工作",
  "遠端工作比辦公室工作更有效率",
  "社群媒體對社會利大於弊",
  "大學學歷在現代已不重要",
  "政府應該強制推行素食飲食",
  "太空探索是對資源的浪費",
  "電競應列為正式奧運項目",
  "人類應該移民其他星球",
  "加密貨幣會取代傳統貨幣",
  "義務教育應延長至 20 歲",
  "死刑應該被廢除",
  "人工智慧創作應受著作權保護",
  "婚姻制度應被廢除",
  "核能是解決氣候危機的最佳方案",
  "社交媒體年齡限制應提高至 18 歲",
  "短影片讓人變得更淺薄",
  "電動車能解決環境污染問題",
  "讀書比工作更重要",
  "在家工作比到辦公室更高效",
  "競爭比合作更能促進社會進步",
] as const;
