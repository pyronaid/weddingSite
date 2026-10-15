import { getPocketBase } from '../../lib/pocketbase';
import { gameError } from './errors';
import { PocketBaseGameRepository } from './pocketbaseGameRepository';
import type { GameRepository } from './types';

export * from './types';
export { toGameError } from './errors';

export function createGameRepository(): GameRepository {
  const pb = getPocketBase();
  if (pb) return new PocketBaseGameRepository(pb);
  // No backend configured: fail gracefully, like the auth service does.
  return {
    getProgress: () => Promise.reject(gameError('not_configured')),
  };
}
