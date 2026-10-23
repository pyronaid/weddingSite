import { createContext, useContext } from 'react';
import { defaultContent } from '../config/wedding';
import { adminError } from '../services/admin/errors';
import type { SiteContent, SiteRepository } from '../services/site/types';

export interface SiteContentValue {
  content: SiteContent;
  repository: SiteRepository;
  /** Shows new content everywhere at once (after the super admin saves). */
  replace: (content: SiteContent) => void;
}

const fail = () => Promise.reject(adminError('not_configured'));

/** Without a provider (tests, isolated components): the default content, read-only. */
const DEFAULT_VALUE: SiteContentValue = {
  content: defaultContent,
  repository: { load: async () => defaultContent, save: fail, uploadPhoto: fail, updatePhotoAlt: fail, resetPhoto: fail },
  replace: () => {},
};

export const SiteContentContext = createContext<SiteContentValue | null>(null);

export function useSiteContent(): SiteContentValue {
  return useContext(SiteContentContext) ?? DEFAULT_VALUE;
}
