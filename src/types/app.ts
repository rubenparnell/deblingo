export type View = "board" | "history" | "leaderboard" | "profile" | "admin";

export type Difficulty = "free" | "common" | "rare";

export type BoardOption = {
  id: number;
  label: string;
  difficulty: Difficulty;
};

export type BoardComposition = Record<Difficulty, number>;

export type Lecture = {
  id: number;
  source_uid: string;
  title: string;
  starts_at: string;
  ends_at: string | null;
};

export type HistoryEntry = {
  id?: number;
  source_uid: string;
  title: string;
  starts_at: string;
  ends_at: string | null;
  board: BoardOption[];
  marked_ids: number[];
  score: number;
  completed_lines?: number;
};

export type LeaderboardEntry = {
  source_uid: string;
  title: string;
  starts_at: string;
  username: string;
  completed_lines: number;
  marked_squares: number;
  board: BoardOption[];
  marked_ids: number[];
};

export type Suggestion = {
  id: number;
  label: string;
  status: "pending" | "accepted" | "rejected";
  created_at: string;
  suggested_by: string;
};
