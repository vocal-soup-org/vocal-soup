// src/lib/api/storyApi.ts
// Story-related API endpoints

import { api } from "./client";

// Game catalog item (metadata only, no puzzle content)
export type Game = {
  id: string;
  name?: string;
  status: "available" | "locked" | "premium";
  level: number;
  genre: string;
  genreZh?: string;
  shortIntro: string;
  shortIntroZh?: string;
  puzzleId: string;
  backgroundPicture?: string | null;
  progress?: number;
  completed?: boolean;
  experience?: number;
};

export type UserGameStatus = {
  gameId: string;
  locked: boolean;
  completed: boolean;
  experience?: number;
};

export type UserProfile = {
  userId: string;
  level: number;
  experience: number;
  language?: string;
};

// Full puzzle content (static, fetched when entering a game)
export type PuzzleDetail = {
  id: string;
  title: string;
  content: string;
  hint: string;
  fullAnswer: string;
  parts: any;
  backgroundPicture?: string | null;
};

export type StartSessionResponse = {
  sessionId: string;
  puzzle: PuzzleDetail;
};

export type EvaluateResponse = {
  evaluation: string;
  completion: number;
  leveledUp?: boolean;
  newLevel?: number;
  xpGained?: number;
};

export type TranscribeResponse = {
  transcript: string;
  evaluation: string;
  completion: number;
  leveledUp?: boolean;
  newLevel?: number;
  xpGained?: number;
};

// API functions
export const storyApi = {
  /**
   * Fetch all games from the backend catalog
   */
  getGames: () =>
    api.get<Game[]>(`/v1/games`),

  /**
   * Fetch per-user locked/completed status for all games
   */
  getUserGames: (userId: string) =>
    api.get<UserGameStatus[]>(`/v1/users/${userId}/games`),

  /**
   * Fetch user profile (level, etc.)
   */
  getUserProfile: (userId: string) =>
    api.get<UserProfile>(`/v1/users/${userId}`),

  /**
   * Fetch puzzle content, translated when language is not 'en'
   */
  getPuzzle: (puzzleId: string, language: string = 'en') => {
    const langParam = language !== 'en' ? `?lang=${language}` : '';
    return api.get<PuzzleDetail>(`/v1/puzzles/${puzzleId}${langParam}`);
  },

  /**
   * Start a new game session
   */
  startSession: (gameId: string, userId: string) =>
    api.post<StartSessionResponse>("/v1/games/start", { gameId, userId }),

  /**
   * Persist the user's language selection to the backend profile
   */
  updateLanguage: (userId: string, language: string) =>
    api.patch<UserProfile>(`/v1/users/${userId}/language`, { language }),

  /**
   * Fetch a dynamically generated hint for the current session
   */
  getHint: (sessionId: string) =>
    api.post<{ hint: string }>("/v1/games/hint", { sessionId }),

  /**
   * Evaluate a text answer against the session's puzzle
   */
  evaluateAnswer: (sessionId: string, userAnswer: string) =>
    api.post<EvaluateResponse>("/v1/games/evaluate", { sessionId, userAnswer }),

  /**
   * Upload audio, transcribe, and evaluate
   */
  transcribeAudio: (sessionId: string, audioUri: string, language: string) => {
    const formData = new FormData();
    const fileType = "audio/m4a";
    const fileName = `recording-${Date.now()}.m4a`;

    formData.append("audioFile", {
      uri: audioUri,
      type: fileType,
      name: fileName,
    } as any);

    formData.append("language", language);

    return api.upload<TranscribeResponse>("/v1/games/transcribe", formData, {
      queryParams: { sessionId },
      timeout: 60000,
    });
  },
};

export default storyApi;
