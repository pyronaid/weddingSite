import { GameError, type GameErrorCode } from './types';

const MESSAGES: Record<GameErrorCode, string> = {
  unauthenticated: 'Your session has expired. Please log in again.',
  not_found: 'This riddle does not exist or is not available yet.',
  invalid_photo: 'This photo cannot be uploaded: use a JPEG, PNG or WebP image under 10 MB.',
  network: 'Unable to reach the server. Check your connection and try again.',
  not_configured: 'The game is not available yet.',
  unknown: 'Something went wrong. Please try again.',
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
  if (status === 404) return gameError('not_found', error);
  return gameError('unknown', error);
}
