import { useSyncExternalStore } from 'react';

/** Languages of the site; the super admin picks one for everybody. */
export const LANGUAGES = ['en', 'it'] as const;
export type Language = (typeof LANGUAGES)[number];

export const isLanguage = (value: unknown): value is Language =>
  typeof value === 'string' && (LANGUAGES as readonly string[]).includes(value);

/** Locale used for dates and numbers (Intl). */
export const LOCALES: Record<Language, string> = { en: 'en-GB', it: 'it-IT' };

/**
 * The current language, outside React too: services build their error
 * messages with it. Set by the site content provider once the content is
 * loaded; English until then (and in tests).
 */
let current: Language = 'en';
const listeners = new Set<() => void>();

export function getLanguage(): Language {
  return current;
}

export function setLanguage(language: Language) {
  if (language === current) return;
  current = language;
  if (typeof document !== 'undefined') document.documentElement.lang = language;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** The current language; re-renders when it changes. */
export function useLanguage(): Language {
  return useSyncExternalStore(subscribe, getLanguage, getLanguage);
}
