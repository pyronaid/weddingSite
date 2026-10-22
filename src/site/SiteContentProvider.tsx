import { useCallback, useEffect, useLayoutEffect, useMemo, useState, type ReactNode } from 'react';
import { defaultContent } from '../config/wedding';
import { isLanguage, setLanguage } from '../i18n';
import type { SiteContent, SiteRepository } from '../services/site/types';
import { SiteContentContext, type SiteContentValue } from './SiteContentContext';
import styles from './SiteContentProvider.module.css';

const CACHE_KEY = 'site-content-v1';
/** Without an answer by then, show the default content rather than a blank page. */
const FALLBACK_AFTER_MS = 6000;

function readCache(): SiteContent | null {
  try {
    const cached = JSON.parse(localStorage.getItem(CACHE_KEY) ?? 'null') as SiteContent | null;
    // Shape check: an old or damaged entry is ignored.
    return cached && isLanguage(cached.language) && cached.couple && cached.photos ? cached : null;
  } catch {
    return null;
  }
}

function writeCache(content: SiteContent) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(content));
  } catch {
    // Private mode or full storage: the site works without the cache.
  }
}

interface SiteContentProviderProps {
  repository: SiteRepository;
  children: ReactNode;
}

/**
 * Loads the site content (names, date, venues, photos, language) once for
 * the whole app. The last content seen is cached in the browser: returning
 * visitors get the page immediately while it refreshes in the background;
 * first-time visitors see a short loading screen, never the wrong names.
 */
export function SiteContentProvider({ repository, children }: SiteContentProviderProps) {
  const [content, setContent] = useState<SiteContent | null>(readCache);

  const replace = useCallback((next: SiteContent) => {
    writeCache(next);
    setContent(next);
  }, []);

  useEffect(() => {
    let active = true;
    const fallback = setTimeout(() => active && setContent((current) => current ?? defaultContent), FALLBACK_AFTER_MS);
    repository.load().then(
      (loaded) => active && replace(loaded),
      // Unreachable: keep what we have (cache), or the defaults.
      () => active && setContent((current) => current ?? defaultContent),
    ).finally(() => clearTimeout(fallback));
    return () => {
      active = false;
      clearTimeout(fallback);
    };
  }, [repository, replace]);

  // Before the browser paints: the page never shows in the wrong language.
  useLayoutEffect(() => {
    if (content) setLanguage(content.language);
  }, [content]);

  const value = useMemo<SiteContentValue | null>(
    () => (content ? { content, repository, replace } : null),
    [content, repository, replace],
  );

  if (!value) {
    return (
      <div className={styles.loading} role="status" aria-label="…">
        <span aria-hidden="true">♥</span>
      </div>
    );
  }
  return <SiteContentContext.Provider value={value}>{children}</SiteContentContext.Provider>;
}
