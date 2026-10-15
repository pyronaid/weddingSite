import { GameError, type GameErrorCode } from './types';

const MESSAGES: Record<GameErrorCode, string> = {
  unauthenticated: 'Your session has expired. Please log in again.',
  network: 'Unable to reach the server. Check your connection and try again.',
  not_configured: 'The game is not available yet.',
  unknown: 'Unable to load your cards. Please try again.',
};

export function gameError(code: GameErrorCode, cause?: unknown): GameError {
  return new GameError(code, MESSAGES[code], { cause });
}

/** Maps a PocketBase SDK error (or anything else) to a GameError. */
export function toGameError(error: unknown): GameError {
  if (error instanceof GameError) return error;
  const status = typeof error === 'object' && error !== null ? (error as { status?: unknown }).status : undefined;
  if (status === 0) return gameError('network', error);
  if (status === 401 || status === 403) return gameError('unauthenticated', error);
  return gameError('unknown', error);
}
