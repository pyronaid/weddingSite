import { useCallback, useEffect, useState } from 'react';
import { toAdminError, type AdminError, type AdminRepository } from '../../../services/admin';
import { useAuth } from '../useAuth';
import { useAdminRepository } from './AdminRepositoryContext';

export type AdminQueryState<T> =
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: AdminError };

/** Loads admin data; `load` must be memoised. Logs out if the session is rejected. */
export function useAdminQuery<T>(load: (repository: AdminRepository) => Promise<T>) {
  const repository = useAdminRepository();
  const { auth } = useAuth();
  const [state, setState] = useState<AdminQueryState<T>>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    load(repository).then(
      (data) => active && setState({ status: 'success', data }),
      (reason: unknown) => {
        if (!active) return;
        const error = toAdminError(reason);
        if (error.code === 'unauthenticated') auth.logout();
        setState({ status: 'error', error });
      },
    );
    return () => {
      active = false;
    };
  }, [repository, auth, load, attempt]);

  const retry = useCallback(() => {
    setState({ status: 'loading' });
    setAttempt((n) => n + 1);
  }, []);

  return { ...state, retry };
}
