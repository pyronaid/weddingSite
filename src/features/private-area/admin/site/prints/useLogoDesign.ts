import { DEFAULT_MONOGRAM, type MonogramDesign } from '../../../../../brand/monogram';
import { usePersistentState } from '../../../../../hooks/usePersistentState';

/** The monogram being designed, kept in this browser (the invitations use it too). */
export const useLogoDesign = () => usePersistentState<MonogramDesign>('prints.logo.v1', DEFAULT_MONOGRAM);
