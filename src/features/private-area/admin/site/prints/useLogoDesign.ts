import { sanitizeMonogram } from '../../../../../brand/monogram';
import { useSavedDesign } from './useSavedDesign';

/** The monogram being designed, saved on the super admins' account (the invitations use it too). */
export const useLogoDesign = () =>
  useSavedDesign('logo', { sanitize: sanitizeMonogram, legacyKey: 'wedding.prints.logo.v1' });
