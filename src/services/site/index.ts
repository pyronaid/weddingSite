import { defaultContent } from '../../config/wedding';
import { getPocketBase } from '../../lib/pocketbase';
import { adminError } from '../admin/errors';
import { PocketBaseSiteRepository } from './pocketbaseSiteRepository';
import type { SiteRepository } from './types';

export * from './types';
export * from './slots';
export * from './dates';

export function createSiteRepository(): SiteRepository {
  const pb = getPocketBase();
  if (pb) return new PocketBaseSiteRepository(pb);
  // No backend configured: the default content, read-only.
  const fail = () => Promise.reject(adminError('not_configured'));
  return { load: async () => defaultContent, save: fail, uploadPhoto: fail, updatePhotoAlt: fail, resetPhoto: fail };
}
