export type RankTier =
  | "bronze"
  | "silver"
  | "gold"
  | "platinum"
  | "diamond"
  | "master"
  | "grandmaster";

export type MatchMode = "1v1" | "3v3" | "5v5";
export type RoomType = "debate" | "banter";
export type MatchStatus = "waiting" | "in_progress" | "finished";
export type TeamSide = "pro" | "con";
export type MatchResult = "win" | "loss";

export interface Player {
  id: string;
  name: string;
  debateRank: RankTier;
  banterRank: RankTier;
  debateMMR: number;
  banterMMR: number;
  wins: number;
  losses: number;
}

export interface RoomListItem {
  id: string;
  topic: string;
  mode: MatchMode;
  type: RoomType;
  currentPlayers: number;
  maxPlayers: number;
  status: MatchStatus;
  isRanked: boolean;
}

export interface ChatMessage {
  id: string;
  playerId: string;
  playerName: string;
  side: TeamSide;
  content: string;
  timestamp: string;
  round: number;
}

export interface JudgeScore {
  logic: number;
  expression: number;
  counterArgument: number;
  total: number;
}

export interface TeamScore {
  pro: JudgeScore;
  con: JudgeScore;
}

export interface MatchData {
  id: string;
  topic: string;
  mode: MatchMode;
  type: RoomType;
  isRanked: boolean;
  currentRound: number;
  totalRounds: number;
  status: MatchStatus;
  proTeam: Player[];
  conTeam: Player[];
  messages: ChatMessage[];
  scores: TeamScore;
  aiJudgeComment: string;
}

export interface LeaderboardEntry {
  rank: number;
  player: Player;
  mmr: number;
  wins: number;
  losses: number;
  winRate: number;
  mode: RoomType;
}

export interface RecentMatch {
  id: string;
  topic: string;
  mode: MatchMode;
  type: RoomType;
  result: MatchResult;
  date: string;
  opponent: string;
}

// --- Supabase DB row types ---

export interface DbMatch {
  id: string;
  title: string;
  mode: string;
  format: string;
  status: string;
  topic: string | null;
  created_by: string | null;
  winner_side: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbMatchPlayer {
  id: string;
  match_id: string;
  user_id: string;
  side: string;
  joined_at: string;
  nickname: string | null;
}

export interface DbMatchMessage {
  id: string;
  match_id: string;
  user_id: string;
  side: string;
  content: string;
  round: number;
  created_at: string;
  nickname: string | null;
}
