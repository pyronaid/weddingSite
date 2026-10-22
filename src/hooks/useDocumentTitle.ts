import { useEffect } from 'react';
import { useSiteContent } from '../site/SiteContentContext';

/** Sets the tab title for the current page (helps history, bookmarks, screen readers). */
export function useDocumentTitle(title?: string) {
  const { partnerOne, partnerTwo } = useSiteContent().content.couple;
  // The couple's names: personal, and the same in every language.
  const base = `${partnerOne} & ${partnerTwo}`;
  useEffect(() => {
    document.title = title ? `${title} · ${base}` : base;
  }, [title, base]);
}
