import { getLanguage, useLanguage, type Language } from './language';

/**
 * The texts of one area of the site in every language. Write the English
 * object first, then type the others with it, so a missing or misspelt key
 * (or a function with other parameters) is a compile error:
 *
 *   const en = { title: 'Hello', welcome: (name: string) => `Welcome, ${name}!` };
 *   export const homeMessages: Dictionary<typeof en> = {
 *     en,
 *     it: { title: 'Ciao', welcome: (name) => `Benvenuto, ${name}!` },
 *   };
 *
 * Each area keeps its own dictionary next to its code, so the private area's
 * texts stay in its lazily loaded chunk.
 */
export type Dictionary<T> = Record<Language, T>;

/** The texts of a dictionary in the current language (re-renders when it changes). */
export function useMessages<T>(dictionary: Dictionary<T>): T {
  return dictionary[useLanguage()];
}

/** Same, outside React (services, error messages): read at call time. */
export function messagesOf<T>(dictionary: Dictionary<T>): T {
  return dictionary[getLanguage()];
}
