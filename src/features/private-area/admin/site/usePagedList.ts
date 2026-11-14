import { useEffect, useRef, useState } from 'react';
import { toAdminError, type AdminPage } from '../../../../services/admin';
import { useAuth } from '../../useAuth';

/** What was asked: an answer is for the list shown only if it matches. */
interface Request<P> {
  load: (page: number) => Promise<P>;
  page: number;
  attempt: number;
}

/** The answer to one request; `data` stays the last good page, even after an error. */
interface ListState<P> {
  request: Request<P>;
  data: P | null;
  error: string | null;
}

/**
 * A super admin's paginated list (users, RSVPs), loaded from the server one
 * page at a time.
 *
 * - `load` must be stable (useCallback) and change only with the filters:
 *   a new filter starts again from page 1.
 * - Only the answer to the latest request is kept (typing fast, paging fast).
 * - While the next page loads, the current one stays visible (no flicker).
 */
export function usePagedList<P extends AdminPage<unknown>>(load: (page: number) => Promise<P>) {
  const { auth } = useAuth();
  // The page belongs to the filters it was chosen with.
  const [position, setPosition] = useState({ load, page: 1 });
  const page = position.load === load ? position.page : 1;
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<ListState<P> | null>(null);
  const top = useRef<HTMLElement>(null);

  useEffect(() => {
    let current = true;
    const request = { load, page, attempt };
    load(page).then(
      (data) => current && setState({ request, data, error: null }),
      (reason: unknown) => {
        if (!current) return;
        const error = toAdminError(reason);
        if (error.code === 'unauthenticated') auth.logout();
        setState((previous) => ({ request, data: previous?.data ?? null, error: error.message }));
      },
    );
    return () => {
      current = false;
    };
  }, [load, page, attempt, auth]);

  // Until the answer to what is asked now arrives, the list is loading.
  const answered = state?.request;
  const busy = !answered || answered.load !== load || answered.page !== page || answered.attempt !== attempt;
  return {
    data: state?.data ?? null,
    busy,
    error: busy ? null : (state?.error ?? null),
    /** Put on the list's container: changing page scrolls back to it. */
    top,
    goTo: (next: number) => {
      setPosition({ load, page: next });
      // The pager is at the bottom: start reading the new page from its top.
      top.current?.scrollIntoView?.({ block: 'start', behavior: 'smooth' });
    },
    retry: () => setAttempt((n) => n + 1),
    /** Changes the page shown, e.g. after saving one of its items. */
    update: (change: (data: P) => P) =>
      setState((current) => (current?.data ? { ...current, data: change(current.data) } : current)),
  };
}
