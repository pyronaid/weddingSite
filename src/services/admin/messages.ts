import type { Dictionary } from '../../i18n';
import type { AdminErrorCode } from './types';

const en = {
  errors: {
    validation: 'Please check the highlighted values.',
    forbidden: 'Only the organisers can do this.',
    unauthenticated: 'Your session has expired. Please log in again.',
    not_found: 'This item no longer exists: reload the page.',
    network: 'Unable to reach the server. Check your connection and try again.',
    not_configured: 'The admin area is not available yet.',
    unknown: 'Something went wrong. Please try again.',
  } as Record<AdminErrorCode, string>,
  invalidValue: 'Invalid value.',
};

/** Error messages of the organisers' (and super admin's) screens. */
export const adminErrorMessages: Dictionary<typeof en> = {
  en,
  it: {
    errors: {
      validation: 'Controlla i valori evidenziati.',
      forbidden: 'Solo gli organizzatori possono farlo.',
      unauthenticated: 'La sessione è scaduta. Accedi di nuovo.',
      not_found: 'Questo elemento non esiste più: ricarica la pagina.',
      network: 'Impossibile raggiungere il server. Controlla la connessione e riprova.',
      not_configured: 'L\'area organizzatori non è ancora disponibile.',
      unknown: 'Qualcosa è andato storto. Riprova.',
    },
    invalidValue: 'Valore non valido.',
  },
};
