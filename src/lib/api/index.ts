// src/lib/api/index.ts
// Re-export all API modules

export { api, ApiError } from "./client";
export { storyApi } from "./storyApi";
export { chatApi } from "./chatApi";

// Re-export types
export type { Game, UserProfile, PuzzleDetail, StartSessionResponse, EvaluateResponse, TranscribeResponse } from "./storyApi";
export type { ChatResultType } from "./chatApi";
