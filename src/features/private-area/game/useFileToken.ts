import { useCallback, useEffect, useRef, useState } from 'react';
import type { FileToken } from '../../../services/game';
import { useAuth } from '../useAuth';
import { useGameRepository } from './GameRepositoryContext';

/** Renew this long before expiry, so images never get an expired token. */
const RENEW_BEFORE_MS = 5 * 60 * 1000;
/** After a failure, or between forced renewals (many images may fail at once). */
const RETRY_MS = 30 * 1000;

/**
 * Token for the protected photos. Fetched once, renewed automatically
 * before it expires, and on demand (`renew`) when an image fails to load.
 */
export function useFileToken(): { token: string | null; renew: () => void } {
  const repository = useGameRepository();
  const { user } = useAuth();
  const userId = user?.id;
  const [fileToken, setFileToken] = useState<FileToken | null>(null);
  const [request, setRequest] = useState({ attempt: 0, force: false });
  const lastForced = useRef(0);

  useEffect(() => {
    if (!userId) return;
    let active = true;
    let retry: number | undefined;
    repository.getFileToken({ force: request.force }).then(
      (token) => {
        if (active) setFileToken(token);
      },
      () => {
        if (active) retry = window.setTimeout(() => setRequest((r) => ({ attempt: r.attempt + 1, force: false })), RETRY_MS);
      },
    );
    return () => {
      active = false;
      window.clearTimeout(retry);
    };
  }, [repository, userId, request]);

  // Renew shortly before expiry.
  useEffect(() => {
    if (!fileToken) return;
    const delay = Math.max(RETRY_MS, fileToken.expiresAt - Date.now() - RENEW_BEFORE_MS);
    const timer = window.setTimeout(() => setRequest((r) => ({ attempt: r.attempt + 1, force: true })), delay);
    return () => window.clearTimeout(timer);
  }, [fileToken]);

  const renew = useCallback(() => {
    if (Date.now() - lastForced.current < RETRY_MS) return;
    lastForced.current = Date.now();
    setRequest((r) => ({ attempt: r.attempt + 1, force: true }));
  }, []);

  return { token: fileToken?.token ?? null, renew };
}
