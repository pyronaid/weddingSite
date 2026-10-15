import { useCallback, useEffect, useState } from 'react';
import { toGameError, type GameError, type GameRepository } from '../../../services/game';
import { useAuth } from '../useAuth';
import { useGameRepository } from './GameRepositoryContext';

export type GameQueryState<T> =
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: GameError };

type Loader<T> = (repository: GameRepository) => Promise<T>;

/**
 * Loads game data for the logged-in user, with loading/error/retry states.
 *
 * `load` must be memoised (useCallback): a new function means a new query.
 * Results are stored together with the loader that produced them, so a stale
 * result is never shown for a new query, and late responses are ignored.
 * When the server rejects the session the user is logged out: the route
 * guard then sends them to the login page and back afterwards.
 */
export function useGameQuery<T>(load: Loader<T>): GameQueryState<T> & { retry: () => void } {
  const repository = useGameRepository();
  const { user, auth } = useAuth();
  const userId = user?.id;
  const [result, setResult] = useState<{ load: Loader<T>; state: GameQueryState<T> } | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!userId) return;
    let active = true;

    load(repository).then(
      (data) => {
        if (active) setResult({ load, state: { status: 'success', data } });
      },
      (reason: unknown) => {
        if (!active) return;
        const error = toGameError(reason);
        if (error.code === 'unauthenticated') auth.logout();
        setResult({ load, state: { status: 'error', error } });
      },
    );

    return () => {
      active = false;
    };
  }, [repository, auth, userId, load, attempt]);

  const retry = useCallback(() => {
    setResult(null);
    setAttempt((n) => n + 1);
  }, []);

  const state: GameQueryState<T> = result && result.load === load ? result.state : { status: 'loading' };
  return { ...state, retry };
}
