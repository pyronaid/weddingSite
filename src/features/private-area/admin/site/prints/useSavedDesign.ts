import { useCallback, useEffect, useRef, useState } from 'react';
import { toAdminError, type PrintDesignKind } from '../../../../../services/admin';
import { useAuth } from '../../../useAuth';
import { useAdminRepository } from '../../AdminRepositoryContext';

/** Wait this long after the last change before saving (one save for a burst of clicks or typing). */
export const SAVE_DELAY_MS = 800;

export type SaveStatus = 'loading' | 'saved' | 'pending' | 'saving' | 'error';

interface Options<T> {
  /** Makes whatever was stored safe to use (unknown or broken fields: the defaults). Must be stable. */
  sanitize: (raw: unknown) => T;
  /** Where an earlier version kept the design in this browser: moved to the server once. */
  legacyKey?: string;
}

function takeLegacy(key: string | undefined): unknown {
  if (!key) return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function dropLegacy(key: string | undefined) {
  if (!key) return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Nothing to clean up.
  }
}

/**
 * The choices of a Prints designer, saved on the server for the super
 * admins' account as they change them, so the work goes on from any browser
 * or computer. The pictures are always drawn from these choices, so what is
 * loaded matches the form.
 *
 * - Loaded when the page opens, and again when the tab comes back into view
 *   (another device may have changed them), unless changes are waiting.
 * - Saved SAVE_DELAY_MS after the last change; only the latest choices are
 *   sent. Last save wins.
 * - Leaving the page saves at once; closing the tab with a save pending asks first.
 */
export function useSavedDesign<T extends object>(kind: PrintDesignKind, { sanitize, legacyKey }: Options<T>) {
  const repository = useAdminRepository();
  const { auth } = useAuth();
  const [design, setDesignState] = useState<T | null>(null);
  const [status, setStatus] = useState<SaveStatus>('loading');
  const [error, setError] = useState<string | null>(null);
  // For the timers and callbacks: the latest choices, and how many changes were made.
  const latest = useRef<T | null>(null);
  const version = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const statusRef = useRef<SaveStatus>('loading');

  const show = useCallback((next: SaveStatus) => {
    statusRef.current = next;
    setStatus(next);
  }, []);

  const save = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const value = latest.current;
    if (!value) return;
    const sent = version.current;
    show('saving');
    try {
      await repository.savePrintDesign(kind, value);
      // Changed again meanwhile: the next save is already on its way.
      if (version.current === sent) {
        setError(null);
        show('saved');
      }
    } catch (reason) {
      const failure = toAdminError(reason);
      if (failure.code === 'unauthenticated') auth.logout();
      if (version.current === sent) {
        setError(failure.message);
        show('error');
      }
    }
  }, [repository, auth, kind, show]);

  /** What the server answered when loading. */
  const applyLoaded = useCallback(
    async (saved: { design: unknown }) => {
      // Changes made while it was loading win.
      if (statusRef.current !== 'loading' && statusRef.current !== 'saved') return;
      const legacy = saved.design === null ? takeLegacy(legacyKey) : null;
      const value = sanitize(saved.design ?? legacy);
      latest.current = value;
      setDesignState(value);
      setError(null);
      if (legacy !== null) {
        // A design made in this browser before saving existed: kept, now for every device.
        version.current += 1;
        await save();
        dropLegacy(legacyKey);
      } else {
        show('saved');
      }
    },
    [legacyKey, sanitize, save, show],
  );

  const failLoading = useCallback(
    (reason: unknown) => {
      const failure = toAdminError(reason);
      if (failure.code === 'unauthenticated') auth.logout();
      if (latest.current === null) {
        // Never loaded: nothing to edit, and nothing saved may be overwritten.
        setError(failure.message);
        show('error');
      }
    },
    [auth, show],
  );

  const load = useCallback(
    () => repository.getPrintDesign(kind).then(applyLoaded, failLoading),
    [repository, kind, applyLoaded, failLoading],
  );

  useEffect(() => {
    void load();
  }, [load]);

  // Back to this tab: the latest choices, unless some are waiting to be saved here.
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === 'visible' && statusRef.current === 'saved') void load();
    };
    document.addEventListener('visibilitychange', refresh);
    return () => document.removeEventListener('visibilitychange', refresh);
  }, [load]);

  // Closing the tab with changes not saved yet: the browser asks first.
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (statusRef.current === 'pending' || statusRef.current === 'saving') event.preventDefault();
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, []);

  // Leaving the page (another tab of the site...): what is waiting is saved now.
  useEffect(
    () => () => {
      if (timer.current) void save();
    },
    [save],
  );

  const setDesign = useCallback(
    (change: T | ((current: T) => T)) => {
      const current = latest.current;
      if (!current) return;
      const next = typeof change === 'function' ? change(current) : change;
      latest.current = next;
      version.current += 1;
      setDesignState(next);
      show('pending');
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void save(), SAVE_DELAY_MS);
    },
    [save, show],
  );

  // Not loaded yet: load again. Loaded: save again.
  const retry = useCallback(() => void (latest.current ? save() : load()), [save, load]);

  return { design, setDesign, status, error, retry };
}
