import { useEffect } from 'react';

const BASE_TITLE = 'Our Wedding';

/** Sets the tab title for the current page (helps history, bookmarks, screen readers). */
export function useDocumentTitle(title?: string) {
  useEffect(() => {
    document.title = title ? `${title} · ${BASE_TITLE}` : BASE_TITLE;
  }, [title]);
}
