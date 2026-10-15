import { useCallback, useEffect, useRef, useState } from 'react';
import { toGameError, type GalleryPhoto, type GameError } from '../../../services/game';
import { useAuth } from '../useAuth';
import { useGameRepository } from './GameRepositoryContext';

interface Options {
  pageSize?: number;
  /** How often to look for new photos while the page is visible. */
  pollMs?: number;
}

interface GalleryFeed {
  status: 'loading' | 'ready' | 'error';
  photos: GalleryPhoto[];
  error: GameError | null;
  hasMore: boolean;
  loadingMore: boolean;
  /** Photos added by the last automatic refresh (for the live announcement). */
  newCount: number;
  loadMore: () => void;
  retry: () => void;
}

const EPOCH = '1970-01-01 00:00:00.000Z';

/** Newest first; a replaced photo moves to the top (deduplicated by id). */
function merge(current: GalleryPhoto[], incoming: GalleryPhoto[], position: 'top' | 'bottom'): GalleryPhoto[] {
  const ids = new Set(incoming.map((photo) => photo.id));
  const rest = current.filter((photo) => !ids.has(photo.id));
  if (position === 'top') return [...incoming, ...rest];
  // Older pages: skip anything already shown (new uploads shift the pages).
  const known = new Set(current.map((photo) => photo.id));
  return [...current, ...incoming.filter((photo) => !known.has(photo.id))];
}

/**
 * Paginated gallery that keeps itself up to date cheaply:
 * - pages of `pageSize` photos (thumbnails), more on demand;
 * - every `pollMs`, only the photos changed since the newest one shown are
 *   fetched (one small indexed query), and only while the tab is visible;
 *   coming back to the tab checks immediately.
 */
export function useGalleryFeed({ pageSize = 24, pollMs = 20_000 }: Options = {}): GalleryFeed {
  const repository = useGameRepository();
  const { user, auth } = useAuth();
  const userId = user?.id;
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [status, setStatus] = useState<GalleryFeed['status']>('loading');
  const [error, setError] = useState<GameError | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [newCount, setNewCount] = useState(0);
  const [attempt, setAttempt] = useState(0);

  // Read by the timers without restarting them.
  const photosRef = useRef(photos);
  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);
  const pageRef = useRef(1);
  const busyRef = useRef(false);

  const fail = useCallback(
    (reason: unknown) => {
      const gameError = toGameError(reason);
      if (gameError.code === 'unauthenticated') auth.logout();
      return gameError;
    },
    [auth],
  );

  // First page (and retries).
  useEffect(() => {
    if (!userId) return;
    let active = true;
    repository.getGallery(1, pageSize).then(
      (page) => {
        if (!active) return;
        pageRef.current = 1;
        setPhotos(page.items);
        setHasMore(page.hasMore);
        setStatus('ready');
      },
      (reason: unknown) => {
        if (!active) return;
        setError(fail(reason));
        setStatus('error');
      },
    );
    return () => {
      active = false;
    };
  }, [repository, userId, pageSize, attempt, fail]);

  // Live updates: poll for changes while the page is visible.
  useEffect(() => {
    if (!userId || status !== 'ready') return;
    let active = true;

    const poll = async () => {
      if (busyRef.current || document.visibilityState !== 'visible') return;
      busyRef.current = true;
      try {
        const since = photosRef.current[0]?.updated ?? EPOCH;
        const updates = await repository.getGalleryUpdates(since);
        if (active && updates.length > 0) {
          const known = new Set(photosRef.current.map((photo) => photo.id));
          setNewCount(updates.filter((photo) => !known.has(photo.id)).length);
          setPhotos((current) => merge(current, updates, 'top'));
        }
      } catch (reason) {
        // A failed refresh is not worth an error screen: try again next tick.
        if (toGameError(reason).code === 'unauthenticated') auth.logout();
      } finally {
        busyRef.current = false;
      }
    };

    const timer = window.setInterval(poll, pollMs);
    const onVisible = () => {
      if (document.visibilityState === 'visible') void poll();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      active = false;
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [repository, auth, userId, status, pollMs]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const page = await repository.getGallery(pageRef.current + 1, pageSize);
      pageRef.current += 1;
      setPhotos((current) => merge(current, page.items, 'bottom'));
      setHasMore(page.hasMore);
    } catch (reason) {
      fail(reason);
    } finally {
      setLoadingMore(false);
    }
  }, [repository, pageSize, hasMore, loadingMore, fail]);

  const loadMoreStable = useCallback(() => void loadMore(), [loadMore]);

  const retry = useCallback(() => {
    setStatus('loading');
    setError(null);
    setAttempt((n) => n + 1);
  }, []);

  return { status, photos, error, hasMore, loadingMore, newCount, loadMore: loadMoreStable, retry };
}
