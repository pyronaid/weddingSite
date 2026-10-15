import { useCallback, useEffect, useState } from 'react';
import { toGameError, type GameError, type GameProgress } from '../../../services/game';
import { useAuth } from '../useAuth';
import { useGameRepository } from './GameRepositoryContext';

export type GameProgressState =
  | { status: 'loading' }
  | { status: 'success'; progress: GameProgress }
  | { status: 'error'; error: GameError };

/**
 * Loads the current user's collected cards per suit.
 * Reloads when the user changes and on `retry()`; responses that arrive
 * after unmount or after a newer request are ignored.
 */
export function useGameProgress(): GameProgressState & { retry: () => void } {
  const repository = useGameRepository();
  const { user, auth } = useAuth();
  const userId = user?.id;
  const [state, setState] = useState<GameProgressState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!userId) return;
    let active = true;

    repository.getProgress().then(
      (progress) => {
        if (active) setState({ status: 'success', progress });
      },
      (reason: unknown) => {
        if (!active) return;
        const error = toGameError(reason);
        // The server rejected the session: log out, the route guard then
        // sends the user to the login page and back here afterwards.
        if (error.code === 'unauthenticated') auth.logout();
        setState({ status: 'error', error });
      },
    );

    return () => {
      active = false;
    };
  }, [repository, auth, userId, attempt]);

  const retry = useCallback(() => {
    setState({ status: 'loading' });
    setAttempt((n) => n + 1);
  }, []);

  return { ...state, retry };
}
