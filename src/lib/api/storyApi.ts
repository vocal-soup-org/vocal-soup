// src/lib/api/storyApi.ts
// Story-related API endpoints

import { api } from "./client";

// Game catalog item (metadata only, no puzzle content)
export type Game = {
  id: string;
  status: "available" | "locked" | "premium";
  level: number;
  genre: string;
  shortIntro: string;
  puzzleId: string;
  backgroundPicture?: string | null;
  progress?: number;
  completed?: boolean;
};

export type UserGameStatus = {
  gameId: string;
  locked: boolean;
  completed: boolean;
};

export type UserProfile = {
  userId: string;
  level: number;
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
};

export type EvaluateResponse = {
  evaluation: string;
  completion: number;
  leveledUp?: boolean;
  newLevel?: number;
};

export type TranscribeResponse = {
  transcript: string;
  evaluation: string;
  completion: number;
  leveledUp?: boolean;
  newLevel?: number;
};

// API functions
export const storyApi = {
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
   * Start a new game session
   */
  startSession: (gameId: string, userId: string) =>
    api.post<StartSessionResponse>("/v1/games/start", { gameId, userId }),

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
