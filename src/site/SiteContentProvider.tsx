import { useCallback, useEffect, useLayoutEffect, useMemo, useState, type ReactNode } from 'react';
import { defaultContent } from '../config/wedding';
import { isLanguage, setLanguage } from '../i18n';
import type { SiteContent, SiteRepository } from '../services/site/types';
import { applyPalette, sanitizePalette } from '../theme/palette';
import { SiteContentContext, type SiteContentValue } from './SiteContentContext';
import styles from './SiteContentProvider.module.css';

const CACHE_KEY = 'site-content-v1';
/** Without an answer by then, show the default content rather than a blank page. */
const FALLBACK_AFTER_MS = 6000;

function readCache(): SiteContent | null {
  try {
    const cached = JSON.parse(localStorage.getItem(CACHE_KEY) ?? 'null') as SiteContent | null;
    // Shape check: an old or damaged entry is ignored. (Its colours are checked
    // again: they go into the page's CSS, and older entries have none.)
    return cached && isLanguage(cached.language) && cached.couple && cached.photos
      ? { ...cached, palette: sanitizePalette(cached.palette) }
      : null;
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
 * Loads the site content (names, date, venues, photos, language, colours) once for
 * the whole app. The last content seen is cached in the browser: returning
 * visitors get the page immediately while it refreshes in the background;
 * first-time visitors see a short loading screen, never the wrong names.
 */
export function SiteContentProvider({ repository, children }: SiteContentProviderProps) {
  // The cached content, in its language from the very first render. (The
  // provider is the root of the app: nothing else listens to the language yet.)
  const [content, setContent] = useState<SiteContent | null>(() => {
    const cached = readCache();
    if (cached) setLanguage(cached.language);
    return cached;
  });
  /**
   * Shows new content. The language is switched first, in the same go: the
   * page renders straight away in it. (Switching after the render, the parts
   * of the page that just appeared would show the old language for a moment.)
   */
  const replace = useCallback((next: SiteContent) => {
    writeCache(next);
    setLanguage(next.language);
    setContent(next);
  }, []);

  useEffect(() => {
    let active = true;
    // Keep what we have (the cache), or the defaults (nothing shown yet: the
    // language is still the first one, set again by the safety net below).
    const keepOrDefault = () => active && setContent((current) => current ?? defaultContent);
    const fallback = setTimeout(keepOrDefault, FALLBACK_AFTER_MS);
    repository
      .load()
      .then((loaded) => active && replace(loaded), keepOrDefault)
      .finally(() => clearTimeout(fallback));
    return () => {
      active = false;
      clearTimeout(fallback);
    };
  }, [repository, replace]);

  // Safety net (content set another way): before the browser paints.
  useLayoutEffect(() => {
    if (content) setLanguage(content.language);
  }, [content]);

  // The site's colours, before the browser paints: the page never shows the
  // previous ones (the cached content has them from the very first paint).
  const palette = content?.palette;
  useLayoutEffect(() => {
    if (palette) applyPalette(palette);
  }, [palette]);

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
