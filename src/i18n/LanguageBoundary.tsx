import { Fragment, type ReactNode } from 'react';
import { useLanguage } from './language';

/**
 * Remounts its children when the language changes, so every text is rebuilt
 * at once, including the ones built outside components (card names, error
 * messages). Happens only when the super admin saves a new language.
 */
export function LanguageBoundary({ children }: { children: ReactNode }) {
  return <Fragment key={useLanguage()}>{children}</Fragment>;
}
