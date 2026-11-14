import { useCallback, useState } from 'react';

const PREFIX = 'wedding.';

function read<T extends object>(key: string, defaults: T): T {
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    if (!raw) return defaults;
    const stored: unknown = JSON.parse(raw);
    // Merged with the defaults: a newer version may have added settings.
    return stored && typeof stored === 'object' ? { ...defaults, ...(stored as Partial<T>) } : defaults;
  } catch {
    // Private browsing, blocked storage, broken JSON: start from the defaults.
    return defaults;
  }
}

/**
 * State kept in this browser (localStorage) between visits: per-person
 * conveniences such as a design being worked on. Works, unsaved, when the
 * browser refuses storage. Objects only, merged with `defaults` on load.
 */
export function usePersistentState<T extends object>(key: string, defaults: T) {
  const [value, setValue] = useState<T>(() => read(key, defaults));
  const update = useCallback(
    (change: T | ((current: T) => T)) =>
      setValue((current) => {
        const next = typeof change === 'function' ? change(current) : change;
        try {
          window.localStorage.setItem(PREFIX + key, JSON.stringify(next));
        } catch {
          // Not kept: fine, it still works for this visit.
        }
        return next;
      }),
    [key],
  );
  return [value, update] as const;
}
