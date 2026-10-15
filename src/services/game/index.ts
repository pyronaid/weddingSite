import { getPocketBase } from '../../lib/pocketbase';
import { gameError } from './errors';
import { PocketBaseGameRepository } from './pocketbaseGameRepository';
import type { GameRepository } from './types';

export * from './cards';
export * from './types';
export { toGameError } from './errors';

export function createGameRepository(): GameRepository {
  const pb = getPocketBase();
  if (pb) return new PocketBaseGameRepository(pb);
  // No backend configured: fail gracefully, like the auth service does.
  return {
    getProgress: () => Promise.reject(gameError('not_configured')),
    getSuitCards: () => Promise.reject(gameError('not_configured')),
    getRiddle: () => Promise.reject(gameError('not_configured')),
    solveRiddle: () => Promise.reject(gameError('not_configured')),
  };
}
