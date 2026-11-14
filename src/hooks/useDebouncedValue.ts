import { useEffect, useState } from 'react';

/**
 * `value`, but only once it has stopped changing for `delayMs`: typing
 * "giulia" sends one search, not six.
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}
