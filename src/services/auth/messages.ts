import type { Dictionary } from '../../i18n';
import type { AuthErrorCode } from './types';

const en = {
  errors: {
    invalid_credentials: 'Invalid e-mail or password.',
    email_not_verified: 'Please confirm your e-mail address before logging in.',
    validation: 'Please check the highlighted fields.',
    invalid_token: 'This link is invalid or has expired. Please request a new one.',
    rate_limited: 'Too many attempts. Please wait a moment and try again.',
    network: 'Unable to reach the server. Check your connection and try again.',
    not_configured: 'The private area is not available yet.',
    unknown: 'Something went wrong. Please try again.',
  } satisfies Record<AuthErrorCode, string>,
  invalidValue: 'Invalid value.',
  emailTaken: 'An account with this e-mail already exists.',
  emailMissing: 'Please enter your e-mail.',
  emailInvalid: 'Please enter a valid e-mail.',
  passwordTooShort: (min: number) => `Password must be at least ${min} characters.`,
  passwordTooLong: 'Password must be at most 72 characters.',
  passwordsDiffer: 'Passwords do not match.',
  passwordMissing: 'Please enter your password.',
  nameMissing: 'Please tell us your name.',
  nameTooLong: 'Name is too long.',
  secretCodeMissing: 'Please enter the secret code.',
};

/** Validation and error messages of the auth service (read at call time, in the site language). */
export const authServiceMessages: Dictionary<typeof en> = {
  en,
  it: {
    errors: {
      invalid_credentials: 'E-mail o password non corretti.',
      email_not_verified: 'Conferma il tuo indirizzo e-mail prima di accedere.',
      validation: 'Controlla i campi evidenziati.',
      invalid_token: 'Questo link non è valido o è scaduto. Richiedine uno nuovo.',
      rate_limited: 'Troppi tentativi. Aspetta un momento e riprova.',
      network: 'Impossibile raggiungere il server. Controlla la connessione e riprova.',
      not_configured: 'L’area riservata non è ancora disponibile.',
      unknown: 'Qualcosa è andato storto. Riprova.',
    },
    invalidValue: 'Valore non valido.',
    emailTaken: 'Esiste già un account con questa e-mail.',
    emailMissing: 'Inserisci la tua e-mail.',
    emailInvalid: 'Inserisci un’e-mail valida.',
    passwordTooShort: (min) => `La password deve avere almeno ${min} caratteri.`,
    passwordTooLong: 'La password può avere al massimo 72 caratteri.',
    passwordsDiffer: 'Le password non coincidono.',
    passwordMissing: 'Inserisci la password.',
    nameMissing: 'Dicci come ti chiami.',
    nameTooLong: 'Il nome è troppo lungo.',
    secretCodeMissing: 'Inserisci il codice segreto.',
  },
};
